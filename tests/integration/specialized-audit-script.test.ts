import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { readingDatabase } from "../helpers/reading-db";
it("runs the same rollback SQL audit used on linked development", async () => {
  const db = await readingDatabase();
  try {
    const r = await db.exec(
      await readFile("supabase/tests/specialized-areas.sql", "utf8"),
    );
    expect(r.flatMap((x) => x.rows).some((row) => row.audit)).toBe(true);
    expect((await db.query("select * from auth.users")).rows).toHaveLength(0);
  } finally {
    await db.close();
  }
});
