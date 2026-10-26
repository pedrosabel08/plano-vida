// Ephemeral test adapter only. Never imported by src/ or deployed as an API.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
export const USER_A = "00000000-0000-4000-8000-000000000001";
const db = new PGlite();
await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 grant execute on function auth.uid() to authenticated,anon;
`);
await db.exec(
  await readFile("supabase/migrations/202610200001_foundation.sql", "utf8"),
);
await db.exec(
  await readFile(
    "supabase/migrations/202610200002_planning_performance.sql",
    "utf8",
  ),
);
await db.exec(
  await readFile("supabase/migrations/202610200003_reading_module.sql", "utf8"),
);
await db.exec(
  await readFile("supabase/migrations/202610250001_shared_actions.sql", "utf8"),
);
let queue = Promise.resolve();
let nextRpcFailure = null;
await db.exec(
  await readFile("supabase/migrations/202610250002_studies.sql", "utf8"),
);
await db.exec(
  await readFile("supabase/migrations/202610250003_finances.sql", "utf8"),
);
await db.exec(
  await readFile("supabase/migrations/202610250004_career.sql", "utf8"),
);
await db.exec(
  await readFile("supabase/migrations/202610250005_health.sql", "utf8"),
);
await db.exec(
  await readFile(
    "supabase/migrations/202610250006_dashboard_preferences.sql",
    "utf8",
  ),
);
function serial(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}
await db.exec(
  await readFile(
    "supabase/migrations/202610250007_specialized_date_guards.sql",
    "utf8",
  ),
);
async function reset() {
  nextRpcFailure = null;
  await db.exec("reset role; truncate auth.users cascade;");
  await db.query(
    "insert into auth.users(id,raw_user_meta_data) values ($1,$2)",
    [USER_A, { full_name: "Pessoa de teste" }],
  );
}
await reset();
function user(id) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "pessoa@teste.invalid",
    email_confirmed_at: "2026-10-01T12:00:00Z",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Pessoa de teste" },
    identities: [],
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
  };
}
async function asUser(id, task) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await task();
  } finally {
    await db.exec("reset role");
  }
}
function valueOf(url, key) {
  return url.searchParams.get(key)?.replace(/^eq\./, "");
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:54329");
    const parts = [];
    for await (const chunk of req) parts.push(chunk);
    const body = parts.length
      ? JSON.parse(Buffer.concat(parts).toString())
      : {};
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/health") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/__test/reset" && req.method === "POST") {
      await serial(reset);
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/fail-next-rpc" && req.method === "POST") {
      nextRpcFailure = String(body.rpc);
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/reading" && req.method === "GET") {
      const result = await serial(async () => ({
        books: (await db.query("select * from public.books")).rows,
        logs: (await db.query("select * from public.reading_logs")).rows,
        sources: (await db.query("select * from public.goal_sources")).rows,
        manualRecords: (await db.query("select * from public.goal_records"))
          .rows,
        actions: (await db.query("select * from public.actions")).rows,
      }));
      res.end(JSON.stringify(result));
      return;
    }
    if (url.pathname === "/__test/retry-reading" && req.method === "POST") {
      const result = await serial(() =>
        asUser(USER_A, () =>
          db.query("select public.save_reading_log($1,$2) as id", [
            body.book_id,
            body.log,
          ]),
        ),
      );
      res.end(JSON.stringify(result.rows[0]));
      return;
    }
    if (url.pathname === "/__test/reading-outsiders" && req.method === "POST") {
      const books = await serial(async () => {
        const foreign = "00000000-0000-4000-8000-000000000002";
        await db.query("insert into auth.users(id) values ($1)", [foreign]);
        const result = [];
        for (const owner of [USER_A, foreign]) {
          result.push(
            await asUser(owner, async () => {
              const area = (
                await db.query(
                  "select public.create_area('Outra associação','book-open','#F4BD55') as id",
                )
              ).rows[0].id;
              const moduleId = (
                await db.query("select public.set_reading_module($1) as id", [
                  area,
                ])
              ).rows[0].id;
              return (
                await db.query("select public.save_reading_book($1,$2) as id", [
                  moduleId,
                  {
                    title:
                      owner === foreign
                        ? "Livro privado"
                        : "Livro de outra associação",
                    total_pages: 300,
                    initial_tracking_page: 0,
                    authors: [],
                    status: "READING",
                  },
                ])
              ).rows[0].id;
            }),
          );
        }
        return result;
      });
      res.end(JSON.stringify(books));
      return;
    }
    const token = req.headers.authorization?.replace("Bearer ", "");
    let id;
    try {
      id = JSON.parse(
        Buffer.from(token?.split(".")[1] || "", "base64url").toString(),
      ).sub;
    } catch {}
    if (id !== USER_A) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "No test session" }));
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      res.end(JSON.stringify(user(id)));
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.statusCode = 204;
      res.end();
      return;
    }
    const rows = await serial(() =>
      asUser(id, async () => {
        if (url.pathname === `/rest/v1/rpc/${nextRpcFailure}`) {
          nextRpcFailure = null;
          throw new Error("Simulated one-shot test failure");
        }
        if (url.pathname === "/rest/v1/rpc/get_area_dashboard")
          return (
            await db.query("select public.get_area_dashboard($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/set_area_dashboard") {
          await db.query("select public.set_area_dashboard($1,$2)", [
            body.p_area_id,
            body.p_dashboard,
          ]);
          return null;
        }
        if (url.pathname === "/rest/v1/rpc/get_studies_data")
          return (
            await db.query("select public.get_studies_data($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/get_finance_data")
          return (
            await db.query("select public.get_finance_data($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/get_career_data")
          return (
            await db.query("select public.get_career_data($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/get_health_data")
          return (
            await db.query("select public.get_health_data($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/get_study_planning_data")
          return (
            await db.query("select public.get_study_planning_data() as data")
          ).rows[0].data;
        if (
          [
            "save_study_subject",
            "save_study_session",
            "save_finance_category",
            "save_finance_transaction",
            "save_finance_budget",
            "save_finance_goal",
            "save_finance_contribution",
            "save_career_project",
            "save_career_milestone",
            "save_career_commitment",
            "save_career_setting",
            "save_career_review",
            "save_health_setting",
            "save_sleep_log",
            "save_health_routine",
            "save_routine_check",
          ].some((name) => url.pathname === `/rest/v1/rpc/${name}`)
        ) {
          const name = url.pathname.split("/").pop();
          return (
            await db.query(`select public.${name}($1,$2,$3) as id`, [
              body.p_item,
              body.p_id,
              body.p_expected,
            ])
          ).rows[0].id;
        }
        if (url.pathname === "/rest/v1/rpc/save_study_goal")
          return (
            await db.query("select public.save_study_goal($1,$2,$3,$4) as id", [
              body.p_start_date,
              body.p_area_id,
              body.p_goal,
              body.p_goal_id,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/get_area_actions")
          return (
            await db.query("select public.get_area_actions($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/save_area_action")
          return (
            await db.query("select public.save_area_action($1,$2,$3) as id", [
              body.p_action,
              body.p_action_id,
              body.p_expected_updated_at,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/complete_area_action")
          return (
            await db.query(
              "select public.complete_area_action($1,$2,$3) as id",
              [body.p_action_id, body.p_completed, body.p_expected_updated_at],
            )
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/set_reading_module")
          return (
            await db.query("select public.set_reading_module($1,$2) as id", [
              body.p_area_id,
              body.p_enabled ?? true,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/save_reading_book")
          return (
            await db.query("select public.save_reading_book($1,$2,$3) as id", [
              body.p_module_id,
              body.p_book,
              body.p_book_id,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/save_reading_log")
          return (
            await db.query("select public.save_reading_log($1,$2,$3) as id", [
              body.p_book_id,
              body.p_log,
              body.p_log_id,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/save_reading_goal")
          return (
            await db.query(
              "select public.save_reading_goal($1,$2,$3,$4,$5) as id",
              [
                body.p_start_date,
                body.p_area_id,
                body.p_goal,
                body.p_book_id,
                body.p_goal_id,
              ],
            )
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/get_reading_data")
          return (
            await db.query("select public.get_reading_data($1) as data", [
              body.p_area_id,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/complete_onboarding") {
          await db.query("select public.complete_onboarding($1,$2,$3)", [
            body.p_display_name,
            body.p_timezone,
            body.p_areas,
          ]);
          return null;
        }
        if (url.pathname === "/rest/v1/rpc/create_area") {
          return (
            await db.query("select public.create_area($1,$2,$3) as id", [
              body.p_name,
              body.p_icon,
              body.p_color,
            ])
          ).rows[0].id;
        }
        if (url.pathname === "/rest/v1/rpc/reorder_areas") {
          await db.query("select public.reorder_areas($1)", [body.p_ids]);
          return null;
        }
        if (url.pathname === "/rest/v1/rpc/list_objectives")
          return (await db.query("select public.list_objectives() as data"))
            .rows[0].data;
        if (url.pathname === "/rest/v1/rpc/get_planning_data")
          return (
            await db.query("select public.get_planning_data($1) as data", [
              body.p_start_date,
            ])
          ).rows[0].data;
        if (url.pathname === "/rest/v1/rpc/save_weekly_goal")
          return (
            await db.query(
              "select public.save_weekly_goal($1,$2,$3,$4) as id",
              [body.p_start_date, body.p_area_id, body.p_goal, body.p_goal_id],
            )
          ).rows[0].id;
        if (url.pathname === "/rest/v1/rpc/save_goal_record")
          return (
            await db.query("select public.save_goal_record($1,$2,$3) as id", [
              body.p_goal_id,
              body.p_record,
              body.p_record_id,
            ])
          ).rows[0].id;
        if (url.pathname === "/rest/v1/goal_sources")
          return (
            await db.query(
              "select * from public.goal_sources where goal_id=$1 and user_id=$2",
              [valueOf(url, "goal_id"), id],
            )
          ).rows;
        if (url.pathname === "/rest/v1/weekly_goals")
          return (
            await db.query(
              "select * from public.weekly_goals where id=$1 and user_id=$2",
              [valueOf(url, "id"), id],
            )
          ).rows;
        if (url.pathname === "/rest/v1/books")
          return (
            await db.query(
              "select id from public.books where id=$1 and user_id=$2 and area_module_id=$3",
              [valueOf(url, "id"), id, valueOf(url, "area_module_id")],
            )
          ).rows;
        if (url.pathname === "/rest/v1/objectives") {
          if (req.method === "POST")
            return (
              await db.query(
                "insert into public.objectives(user_id,area_id,title,type,target,current_value,unit,due_date,state) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
                [
                  id,
                  body.area_id,
                  body.title,
                  body.type,
                  body.target,
                  body.current_value,
                  body.unit,
                  body.due_date,
                  body.state,
                ],
              )
            ).rows;
          if (req.method === "PATCH")
            return (
              await db.query(
                "update public.objectives set area_id=$1,title=$2,type=$3,target=$4,current_value=$5,unit=$6,due_date=$7,state=$8 where id=$9 and user_id=$10 and updated_at=$11 returning *",
                [
                  body.area_id,
                  body.title,
                  body.type,
                  body.target,
                  body.current_value,
                  body.unit,
                  body.due_date,
                  body.state,
                  valueOf(url, "id"),
                  id,
                  valueOf(url, "updated_at"),
                ],
              )
            ).rows;
          if (req.method === "DELETE")
            return (
              await db.query(
                "delete from public.objectives where id=$1 and user_id=$2 returning id",
                [valueOf(url, "id"), id],
              )
            ).rows;
        }
        if (url.pathname === "/rest/v1/goal_records" && req.method === "PATCH")
          return (
            await db.query(
              "update public.goal_records set is_deleted=$1 where id=$2 and user_id=$3 and updated_at=$4 returning id",
              [
                body.is_deleted,
                valueOf(url, "id"),
                id,
                valueOf(url, "updated_at"),
              ],
            )
          ).rows;
        if (url.pathname === "/rest/v1/profiles") {
          if (req.method === "PATCH") {
            await db.query(
              "update public.profiles set display_name=$1,timezone=$2 where user_id=$3",
              [body.display_name, body.timezone, valueOf(url, "user_id")],
            );
            return null;
          }
          return (
            await db.query("select * from public.profiles where user_id=$1", [
              valueOf(url, "user_id") || id,
            ])
          ).rows;
        }
        if (url.pathname === "/rest/v1/areas") {
          if (req.method === "PATCH")
            return (
              await db.query(
                "update public.areas set name=$1,icon=$2,color=$3 where id=$4 and user_id=$5 returning *",
                [
                  body.name,
                  body.icon,
                  body.color,
                  valueOf(url, "id"),
                  valueOf(url, "user_id"),
                ],
              )
            ).rows;
          if (req.method === "DELETE")
            return (
              await db.query(
                "delete from public.areas where id=$1 and user_id=$2 returning id",
                [valueOf(url, "id"), valueOf(url, "user_id")],
              )
            ).rows;
          return (
            await db.query(
              "select * from public.areas where user_id=$1 order by sort_order,id",
              [valueOf(url, "user_id") || id],
            )
          ).rows;
        }
        throw new Error("Unsupported fixture endpoint: " + url.pathname);
      }),
    );
    const single = req.headers.accept?.includes(
      "application/vnd.pgrst.object+json",
    );
    if (single && Array.isArray(rows) && rows.length !== 1) {
      res.statusCode = 406;
      res.end(
        JSON.stringify({ message: "Expected one row", code: "PGRST116" }),
      );
      return;
    }
    res.end(JSON.stringify(single && Array.isArray(rows) ? rows[0] : rows));
  } catch (error) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        message: error.message,
        code: error.code || "FIXTURE_ERROR",
      }),
    );
  }
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Ephemeral Supabase test adapter: http://127.0.0.1:54329"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    }),
  );
