import type { BrowserContext } from "@playwright/test";
export async function loginFixture(context: BrowserContext) {
  const id = "00000000-0000-4000-8000-000000000001";
  const now = Math.floor(Date.now() / 1000);
  const token = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      email: "pessoa@teste.invalid",
      iat: now,
      exp: now + 36000,
    },
    "fixture-signature",
  ]
    .map((v, i) =>
      i === 2 ? v : Buffer.from(JSON.stringify(v)).toString("base64url"),
    )
    .join(".");
  const session = {
    access_token: token,
    refresh_token: "test-refresh",
    token_type: "bearer",
    expires_in: 36000,
    expires_at: now + 36000,
    user: {
      id,
      email: "pessoa@teste.invalid",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "google" },
      user_metadata: { full_name: "Pessoa de teste" },
      created_at: "2026-10-01T12:00:00Z",
    },
  };
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      url: "http://127.0.0.1:3100",
      sameSite: "Lax",
    },
  ]);
}
