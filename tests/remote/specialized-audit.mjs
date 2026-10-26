// Explicit linked development audit. Applies only reviewed pending migrations;
// all verification fixtures are inside BEGIN/ROLLBACK. No production deployment.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, unlink, rmdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
const exec = promisify(execFile);
const npm =
  process.env.npm_execpath ||
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const env = await readFile(".env.local", "utf8"),
  ref = (await readFile("supabase/.temp/project-ref", "utf8")).trim();
const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
if (!url || new URL(url).hostname !== ref + ".supabase.co")
  throw new Error("Linked project does not match application configuration.");
const directory = await mkdtemp(join(tmpdir(), "pv-specialized-audit-"));
let sequence = 0;
async function cli(args) {
  const { stdout } = await exec(
    process.execPath,
    [npm, "exec", "--yes", "--package", "supabase", "--", "supabase", ...args],
    { timeout: 60000, maxBuffer: 1000000 },
  );
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("Missing CLI result.");
  return JSON.parse(stdout.slice(start));
}
async function query(sql) {
  const path = join(directory, `${sequence++}.sql`);
  await writeFile(path, sql);
  try {
    return await cli(["db", "query", "--linked", "--file", path]);
  } finally {
    await unlink(path);
  }
}
const tables = [
  "profiles",
  "areas",
  "objectives",
  "weeks",
  "area_weekly_plans",
  "weekly_goals",
  "goal_sources",
  "goal_records",
  "area_modules",
  "books",
  "reading_logs",
  "external_book_references",
  "actions",
];
const counts = `select jsonb_build_object(${tables.map((t) => `'${t}',(select count(*) from public.${t})`).join(",")}) as counts;`;
try {
  const before = (await query(counts)).rows[0].counts;
  const dryRun = await cli(["db", "push", "--linked", "--dry-run"]);
  const expected = [
    "202610250002_studies.sql",
    "202610250003_finances.sql",
    "202610250004_career.sql",
    "202610250005_health.sql",
    "202610250006_dashboard_preferences.sql",
    "202610250007_specialized_date_guards.sql",
  ];
  if (dryRun.migrations?.some((name) => !expected.includes(name)))
    throw new Error("Unexpected pending migrations; no changes applied.");
  const applied = await cli(["db", "push", "--linked", "--yes"]);
  const audit = (
    await cli([
      "db",
      "query",
      "--linked",
      "--file",
      "supabase/tests/specialized-areas.sql",
    ])
  ).rows;
  const reading = (
    await cli([
      "db",
      "query",
      "--linked",
      "--file",
      "supabase/tests/reading-goal-entry.sql",
    ])
  ).rows;
  const after = (await query(counts)).rows[0].counts;
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  const security = (
    await query(
      "select c.relname,c.relrowsecurity,c.relforcerowsecurity,has_table_privilege('anon',c.oid,'SELECT') as anon_select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('study_subjects','study_sessions','finance_categories','finance_transactions','finance_budgets','finance_goals','finance_contributions','career_projects','career_milestones','career_commitments','career_settings','career_reviews','health_settings','sleep_logs','health_routines','routine_checks','area_dashboard_preferences') order by c.relname;",
    )
  ).rows;
  if (
    security.length !== 17 ||
    security.some(
      (r) => !r.relrowsecurity || !r.relforcerowsecurity || r.anon_select,
    )
  )
    throw new Error("Remote RLS audit failed.");
  const report = {
    date: new Date().toISOString(),
    linkedProjectMatchesApp: true,
    dryRun,
    applied,
    before,
    after,
    existingDataCountsUnchanged: unchanged,
    audit,
    readingRegression: reading,
    security,
    migrations: await cli(["migration", "list", "--linked"]),
  };
  const reportPath = process.argv.includes("--hardening")
    ? "docs/evidence/areas-v1-hardening-audit.json"
    : "docs/evidence/areas-v1-remote-audit.json";
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  if (!unchanged)
    throw new Error("Existing data counts changed; inspect audit report.");
  process.stdout.write(
    JSON.stringify({
      existingDataCountsUnchanged: unchanged,
      newTablesWithForcedRLS: security.length,
      report: reportPath,
    }) + "\n",
  );
} finally {
  await rmdir(directory);
}
