import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { readingDatabase } from "../helpers/reading-db";
it("runs the exact remote reading script and rolls all fixtures back", async () => {
  const db = await readingDatabase();
  try {
    const results = await db.exec(
      await readFile("supabase/tests/reading-rls.sql", "utf8"),
    );
    const result = results
      .flatMap((r) => r.rows)
      .find(
        (r: unknown) =>
          typeof r === "object" && r !== null && "passed_assertions" in r,
      ) as { passed_assertions: number };
    expect(result.passed_assertions).toBeGreaterThanOrEqual(40);
    expect((await db.query("select * from auth.users")).rows).toHaveLength(0);
    expect((await db.query("select * from public.books")).rows).toHaveLength(0);
  } finally {
    await db.close();
  }
});
