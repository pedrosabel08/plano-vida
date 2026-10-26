import { test, expect } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { exerciseAreaAction } from "../helpers/specialized-e2e";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("finance cents, budgets, explicit contributions, privacy and responsive evidence", async ({
  page,
  context,
}, info) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Finanças", exact: true }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/inicio/);
  await page.goto("/areas");
  await page.getByRole("link", { name: "Abrir planejamento →" }).click();
  await page.getByRole("link", { name: "Finanças", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mais clareza para o seu dinheiro" }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/evidence/financas-v1-empty-${info.project.name}.png`,
    fullPage: true,
  });
  for (const [name, kind] of [
    ["Salário", "INCOME"],
    ["Moradia", "EXPENSE"],
  ]) {
    await page.getByRole("button", { name: "Categorias", exact: true }).click();
    await page.getByLabel("Nome da categoria").fill(name);
    await page.getByLabel("Tipo da categoria").selectOption(kind);
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  for (const [description, kind, amount] of [
    ["Salário de outubro", "INCOME", "5420,10"],
    ["Aluguel de outubro", "EXPENSE", "2870,20"],
  ]) {
    await page
      .getByRole("button", { name: "Registrar movimentação", exact: true })
      .click();
    await page.getByLabel("Descrição da movimentação").fill(description);
    await page.getByLabel("Tipo da movimentação").selectOption(kind);
    await page.getByLabel("Valor em reais", { exact: true }).fill(amount);
    if (kind === "INCOME") {
      await page.getByLabel("Valor em reais", { exact: true }).fill("1,001");
      await page
        .getByRole("button", { name: "Salvar movimentação", exact: true })
        .click();
      await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
        "até duas casas",
      );
      await expect(page.getByLabel("Descrição da movimentação")).toHaveValue(
        description,
      );
      await page.getByLabel("Valor em reais", { exact: true }).fill(amount);
    }
    await page
      .getByRole("button", { name: "Salvar movimentação", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByTestId("finance-balance")).toHaveText("R$ 2.549,90");
  await exerciseAreaAction(page, "Revisar orçamento do mês");
  await expect(page.getByTestId("finance-balance")).toHaveText("R$ 2.549,90");
  await page.reload();
  await expect(page.getByTestId("finance-expenses")).toHaveText("R$ 2.870,20");
  await page.getByRole("button", { name: "Definir limite +" }).click();
  await page.getByLabel("Limite em reais").fill("3000");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Dentro do limite", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova meta +" }).click();
  await page
    .getByLabel("Título da meta financeira")
    .fill("Reserva de emergência");
  await page.getByLabel("Alvo em reais").fill("4000");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Registrar aporte +" }).click();
  await page.getByLabel("Valor em reais", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Salvar aporte", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("finance-balance")).toHaveText("R$ 2.549,90");
  await page
    .getByRole("button", { name: "Ocultar dados privados", exact: true })
    .click();
  await expect(page.getByTestId("finance-balance")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mostrar dados privados", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Mais clareza para o seu dinheiro" })
    .click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    scrollTo({ top: 0, behavior: "instant" });
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `docs/evidence/financas-v1-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
});
