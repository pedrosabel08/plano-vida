import { test, expect } from "@playwright/test";
import { loginFixture } from "../helpers/session";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
for (const [slug, title, heading, rpc] of [
  ["estudos", "Estudos", "Estudos", "get_studies_data"],
  [
    "financas",
    "Finanças",
    "Mais clareza para o seu dinheiro",
    "get_finance_data",
  ],
  ["carreira", "Carreira", "Foco profissional", "get_career_data"],
  ["saude", "Sono e Saúde Bucal", "Sono e Saúde Bucal", "get_health_data"],
]) {
  test(`${slug} recovers from a query failure and fits 320px`, async ({
    page,
    context,
    request,
  }) => {
    await loginFixture(context);
    await page.goto("/onboarding");
    await page
      .getByRole("checkbox", { name: "Leitura e estudos", exact: true })
      .check();
    await page.getByRole("button", { name: "Começar meu plano" }).click();
    await expect(page).toHaveURL(/inicio/);
    await page.goto("/areas");
    await page.getByRole("link", { name: "Abrir planejamento →" }).click();
    await expect(page).toHaveURL(/\/areas\/[a-f0-9-]+/);
    const areaId = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`/areas/${areaId}/${slug}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await request.post("http://127.0.0.1:54329/__test/fail-next-rpc", {
      data: { rpc },
    });
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: `Não foi possível carregar ${title}`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tentar novamente", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 320, height: 740 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  });
}
