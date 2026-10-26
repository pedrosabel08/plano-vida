import { afterAll, beforeAll, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase } from "../helpers/reading-db";
let db: PGlite;
beforeAll(async () => {
  db = await readingDatabase();
});
afterAll(async () => db?.close());
it("runs the same action audit as remote PostgreSQL and rolls back every fixture", async () => {
  const result = await db.exec(
    await readFile("supabase/tests/shared-actions.sql", "utf8"),
  );
  expect(result.flatMap((r) => r.rows).find((r) => r.audit)).toMatchObject({
    audit: {
      action_completion_without_pages: true,
      owner_isolation: true,
      stale_update_rejected: true,
      foreign_area_rejected: true,
      fixtures_rolled_back: true,
    },
  });
  expect(
    (await db.query("select count(*)::integer as n from auth.users")).rows,
  ).toEqual([{ n: 0 }]);
});
