import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { readingDatabase } from "../helpers/reading-db";

it("runs the exact hosted 21+35 regression with two Books and rolls back every fixture", async () => {
  const db = await readingDatabase();
  try {
    const results = await db.exec(
      await readFile("supabase/tests/reading-goal-entry.sql", "utf8"),
    );
    const result = results
      .flatMap((r) => r.rows)
      .find((row) => row && typeof row === "object" && "audit" in row) as {
      audit: unknown;
    };
    expect(result.audit).toMatchObject({
      kind: "MODULE",
      reading_logs: 2,
      goal_records: 0,
      actual: 56,
      target: 70,
      percent: 80,
      score: 8,
      manual_write_rejected: true,
    });
    for (const table of [
      "auth.users",
      "public.books",
      "public.reading_logs",
      "public.goal_records",
    ])
      expect((await db.query("select * from " + table)).rows).toHaveLength(0);
  } finally {
    await db.close();
  }
});
