import { describe, expect, it } from "vitest";
import { areaSchema, reorderSchema } from "@/features/areas/schema";
import { profileSchema } from "@/features/auth/schema";
import { safeNextPath } from "@/features/auth/redirect";
import { SUGGESTED_AREAS } from "@/features/areas/constants";
describe("Foundation validation", () => {
  it("normalizes names and colors", () =>
    expect(
      areaSchema.parse({
        name: "  Aprendizado  ",
        icon: "book-open",
        color: "#abcdef",
      }),
    ).toEqual({ name: "Aprendizado", icon: "book-open", color: "#ABCDEF" }));
  it.each(["", "  ", "a".repeat(81)])("rejects invalid area name %j", (name) =>
    expect(
      areaSchema.safeParse({ name, icon: "leaf", color: "#47D6C7" }).success,
    ).toBe(false),
  );
  it("rejects arbitrary icons and injected colors", () => {
    expect(
      areaSchema.safeParse({ name: "Área", icon: "<script>", color: "#123456" })
        .success,
    ).toBe(false);
    expect(
      areaSchema.safeParse({ name: "Área", icon: "leaf", color: "red;url(x)" })
        .success,
    ).toBe(false);
  });
  it("validates every explicit onboarding suggestion", () => {
    for (const area of SUGGESTED_AREAS)
      expect(areaSchema.safeParse(area).success).toBe(true);
  });
  it("accepts the approved default timezone and another timezone", () => {
    for (const timezone of ["America/Sao_Paulo", "Europe/Lisbon"])
      expect(
        profileSchema.safeParse({ display_name: "Pedro", timezone }).success,
      ).toBe(true);
  });
  it("rejects unknown timezone", () =>
    expect(
      profileSchema.safeParse({
        display_name: "Pedro",
        timezone: "Mars/Olympus",
      }).success,
    ).toBe(false));
  it("rejects duplicate or invalid reorder IDs", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(reorderSchema.safeParse([id, id]).success).toBe(false);
    expect(reorderSchema.safeParse(["foreign"]).success).toBe(false);
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/auth/callback",
    "/areas?next=https://evil.example",
    null,
  ])("prevents an open OAuth redirect: %j", (path) =>
    expect(safeNextPath(path)).toBe("/inicio"),
  );
  it("accepts known internal destinations", () =>
    expect(safeNextPath("/areas")).toBe("/areas"));
});
