// Explicit remote integration test. Creates one marked transient account, then removes only its data in finally.
// Uses independent Supabase CLI queries/connections; no hosted reset and no secrets in arguments or reports.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { writeFile, mkdir, mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
const exec = promisify(execFile);
const npm =
  process.env.npm_execpath ||
  (process.platform === "win32"
    ? join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js")
    : null);
if (!npm) throw new Error("Run through npm exec or provide npm_execpath.");
const queryDir = await mkdtemp(join(tmpdir(), "pv-reading-concurrency-"));
const owner = "f3000000-0000-4000-8000-000000000003";
const marker = "phase3-" + randomUUID();
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
async function query(sql) {
  const sqlFile = join(queryDir, randomUUID() + ".sql");
  await writeFile(sqlFile, sql);
  try {
    const { stdout } = await exec(
      process.execPath,
      [
        npm,
        "exec",
        "--yes",
        "--package",
        "supabase",
        "--",
        "supabase",
        "db",
        "query",
        "--linked",
        "--file",
        sqlFile,
      ],
      { timeout: 45000, maxBuffer: 200000 },
    );
    const start = stdout.indexOf("{");
    return JSON.parse(stdout.slice(start)).rows;
  } catch (e) {
    throw new Error(
      "Remote concurrency query failed: " +
        String(e.stderr || e.message).slice(-1500),
    );
  } finally {
    await unlink(sqlFile);
  }
}
const claims = `set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select set_config('request.jwt.claims','{"sub":"${owner}","role":"authenticated"}',true);`;
async function worker(body, hold, barrier, slot) {
  const rows = await query(
    `begin;${claims}do $$ declare b public.books;attempt integer;outcome text;started timestamptz:=clock_timestamp();rid uuid;begin perform pg_advisory_xact_lock(${barrier},${slot});for attempt in 1..300 loop exit when exists(select 1 from pg_locks where locktype='advisory' and classid=${barrier}::oid and objid=${3 - slot}::oid and granted);if attempt=300 then raise exception 'Peer did not reach barrier';end if;perform pg_sleep(0.05);end loop;perform pg_sleep(0.5);begin select * into strict b from public.books where user_id='${owner}' for update;perform pg_sleep(${hold});${body};outcome:='applied';exception when check_violation then outcome:='limited';when serialization_failure then outcome:='conflict';end;perform set_config('reading.race',jsonb_build_object('outcome',outcome,'started',started,'ended',clock_timestamp(),'id',rid)::text,true);end;$$;select current_setting('reading.race')::jsonb as result;commit;`,
  );
  return rows[0].result;
}
const results = [];
function assert(ok, message) {
  if (!ok) throw new Error(message);
}
async function race(name, bodyA, bodyB, expected) {
  const barrier = Math.floor(Math.random() * 1900000000) + 100000;
  const settled = await Promise.allSettled([
    worker(bodyA, 3, barrier, 1),
    worker(bodyB, 0, barrier, 2),
  ]);
  for (const result of settled)
    if (result.status === "rejected") throw result.reason;
  const pair = settled.map((result) => result.value);
  assert(
    pair
      .map((x) => x.outcome)
      .sort()
      .join(",") === expected.sort().join(","),
    name + ": unexpected outcomes " + JSON.stringify(pair),
  );
  const overlapping =
    new Date(pair[0].started) < new Date(pair[1].ended) &&
    new Date(pair[1].started) < new Date(pair[0].ended);
  assert(overlapping, name + ": transactions did not overlap");
  results.push({ name, overlapping, outcomes: pair.map((x) => x.outcome) });
  console.log(JSON.stringify(results.at(-1)));
  return pair;
}
let report;
try {
  await query(
    `begin;do $$ begin if exists(select 1 from auth.users where id='${owner}') then raise exception 'Transient account collision; no data changed';end if;end;$$;insert into auth.users(id,raw_user_meta_data) values('${owner}',jsonb_build_object('phase3_fixture',${quote(marker)}));${claims}do $$ declare a uuid;m uuid;begin a:=public.create_area('Teste temporário de concorrência','book-open','#F4BD55');m:=public.set_reading_module(a);perform public.save_reading_book(m,'{"title":"Temporary race book","authors":["Teste"],"total_pages":100,"initial_tracking_page":0,"status":"READING"}');end;$$;select true as fixture_ready;commit;`,
  );
  const insert = (pages, op) =>
    `rid:=public.save_reading_log(b.id,jsonb_build_object('pages',${pages},'read_on','2026-10-20','operation_id',${quote(op)}))`;
  await race(
    "two inserts cannot exceed the book total",
    insert(80, randomUUID()),
    insert(80, randomUUID()),
    ["applied", "limited"],
  );
  await race(
    "metadata total competes safely with a new log",
    "update public.books set total_pages=80 where id=b.id",
    insert(10, randomUUID()),
    ["applied", "limited"],
  );
  let state = (
    await query(
      `select l.id,l.updated_at::text,l.pages from public.reading_logs l where l.user_id='${owner}' order by l.created_at limit 1`,
    )
  )[0];
  const edit = (deleted) =>
    `rid:=public.save_reading_log(b.id,${quote(JSON.stringify({ pages: deleted ? state.pages : 40, read_on: "2026-10-20", expected_updated_at: state.updated_at, is_deleted: deleted }))}::jsonb,${quote(state.id)})`;
  await race(
    "correction and removal detect stale version",
    edit(false),
    edit(true),
    ["applied", "conflict"],
  );
  const operation = randomUUID();
  const retries = await race(
    "simultaneous retry records only once",
    insert(20, operation),
    insert(20, operation),
    ["applied", "applied"],
  );
  assert(retries[0].id === retries[1].id, "Retry produced duplicate IDs");
  state = (
    await query(
      `select id,area_module_id,total_pages,updated_at::text from public.books where user_id='${owner}'`,
    )
  )[0];
  const metadata = (title) =>
    `rid:=public.save_reading_book(b.area_module_id,${quote(JSON.stringify({ title, authors: ["Teste"], total_pages: state.total_pages, initial_tracking_page: 0, status: "READING", expected_updated_at: state.updated_at }))}::jsonb,b.id)`;
  await race(
    "concurrent metadata edits detect stale version",
    metadata("Primeiro"),
    metadata("Segundo"),
    ["applied", "conflict"],
  );
  const final = (
    await query(
      `select b.total_pages,b.initial_tracking_page+coalesce(sum(l.pages) filter(where not l.is_deleted),0) as current_page,count(*) filter(where l.operation_id=${quote(operation)})::int as retry_rows from public.books b left join public.reading_logs l on l.book_id=b.id and l.user_id=b.user_id where b.user_id='${owner}' group by b.id`,
    )
  )[0];
  assert(
    Number(final.current_page) <= final.total_pages,
    "Invalid final progress",
  );
  assert(final.retry_rows === 1, "Retry not unique");
  report = {
    passed: true,
    cases: results,
    finalProgress: final,
    cleanupVerified: false,
  };
} finally {
  await query(`begin;do $$ begin if exists(select 1 from auth.users where id='${owner}' and raw_user_meta_data->>'phase3_fixture'=${quote(marker)}) then
 delete from public.external_book_references where user_id='${owner}';delete from public.reading_logs where user_id='${owner}';delete from public.goal_records where user_id='${owner}';delete from public.goal_sources where user_id='${owner}';delete from public.weekly_goals where user_id='${owner}';delete from public.area_weekly_plans where user_id='${owner}';delete from public.weeks where user_id='${owner}';delete from public.books where user_id='${owner}';delete from public.area_modules where user_id='${owner}';delete from public.objectives where user_id='${owner}';delete from public.areas where user_id='${owner}';delete from public.profiles where user_id='${owner}';delete from auth.users where id='${owner}';end if;end;$$;select true as fixture_cleanup;commit;`);
  const remaining = (
    await query(
      `select count(*)::int as count from auth.users where id='${owner}' and raw_user_meta_data->>'phase3_fixture'=${quote(marker)}`,
    )
  )[0].count;
  assert(remaining === 0, "Transient fixture remains");
  if (report) report.cleanupVerified = true;
  console.log(JSON.stringify({ cleanupVerified: true }));
  await rmdir(queryDir);
}
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/fase-3-concurrency.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ passed: true, cases: results.length }));
