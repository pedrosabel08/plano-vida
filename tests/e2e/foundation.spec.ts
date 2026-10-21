import { test, expect, type BrowserContext } from "@playwright/test";
const ID = "00000000-0000-4000-8000-000000000001";
async function login(context: BrowserContext) {
  const now = Math.floor(Date.now() / 1000);
  const token = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: ID,
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
      id: ID,
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
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("protects application routes and handles OAuth errors", async ({
  page,
}) => {
  await page.goto("/areas");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(
    page.getByRole("button", { name: "Continuar com Google" }),
  ).toBeVisible();
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/entrar\?erro=autenticacao/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível entrar" }),
  ).toBeVisible();
});
test("empty onboarding, CRUD, order, profile and privacy", async ({
  page,
  context,
}, testInfo) => {
  await login(context);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("checkbox")).toHaveCount(5);
  for (const c of await page.getByRole("checkbox").all())
    await expect(c).not.toBeChecked();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByText("Um começo só seu")).toBeVisible();
  await page.getByRole("link", { name: "Criar minha primeira área" }).click();
  await page.getByRole("button", { name: "Nova área", exact: true }).click();
  await page.getByLabel("Nome da área").fill("Aprendizado");
  await page.getByRole("radio", { name: "Livro", exact: true }).check();
  await page.getByRole("button", { name: "Criar área", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Aprendizado", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Aprendizado" }).click();
  await page.getByLabel("Nome da área").fill("Estudos");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("heading", { name: "Estudos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova área", exact: true }).click();
  await page.getByLabel("Nome da área").fill("Pessoal");
  await page.getByRole("button", { name: "Criar área", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pessoal", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mover Pessoal para cima" }).click();
  await expect(page.locator(".area-card h2").first()).toHaveText("Pessoal");
  await page.getByRole("button", { name: "Excluir Estudos" }).click();
  await page.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(
    page.getByRole("heading", { name: "Estudos", exact: true }),
  ).toHaveCount(0);
  const nav =
    testInfo.project.name === "mobile"
      ? "Navegação mobile"
      : "Navegação principal";
  await page
    .getByRole("navigation", { name: nav, exact: true })
    .getByRole("link", { name: "Configurações" })
    .click();
  await page.getByLabel("Como prefere ser chamado").fill("Pessoa Atualizada");
  await page.getByLabel("Fuso horário", { exact: true }).fill("Europe/Lisbon");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.getByRole("button", { name: "Ocultar dados privados" }).click();
  await expect(
    page.getByText("pessoa@teste.invalid", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Conteúdo privado oculto")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar dados privados" }).click();
  await expect(
    page.getByText("pessoa@teste.invalid", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Fuso horário", { exact: true })).toHaveValue(
    "Europe/Lisbon",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("explicit suggestions and responsive evidence", async ({
  page,
  context,
}, testInfo) => {
  await login(context);
  await page.goto("/onboarding");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.locator(".home-area-card")).toHaveCount(5);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({
    path: "docs/evidence/fase-1-" + testInfo.project.name + ".png",
    fullPage: false,
  });
  const nav =
    testInfo.project.name === "mobile"
      ? "Navegação mobile"
      : "Navegação principal";
  await page
    .getByRole("navigation", { name: nav, exact: true })
    .getByRole("link", { name: "Minhas áreas" })
    .click();
  await page.getByRole("button", { name: "Nova área", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Nome da área").fill("Criatividade");
  await page.screenshot({
    path: "docs/evidence/fase-1-form-" + testInfo.project.name + ".png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".area-card")).toHaveCount(5);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
