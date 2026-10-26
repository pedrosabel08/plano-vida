import { test, expect } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { exerciseAreaAction } from "../helpers/specialized-e2e";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("sleep instants, oral routines, historical checks, reload and responsive evidence", async ({
  page,
  context,
}, info) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Saúde", exact: true }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/inicio/);
  await page.goto("/areas");
  await page.getByRole("link", { name: "Abrir planejamento →" }).click();
  await page.getByRole("link", { name: "Saúde", exact: true }).click();
  await page
    .getByRole("heading", { name: "Sono e Saúde Bucal", exact: true })
    .click();
  await page.screenshot({
    path: `docs/evidence/saude-v1-empty-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Definir meta de sono", exact: true })
    .click();
  await page.getByLabel("Meta pessoal por noite em minutos").fill("480");
  await page
    .getByRole("button", { name: "Salvar meta de sono", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Registrar noite de sono", exact: true })
    .click();
  await page.getByLabel("Quando deitou").fill("2026-10-24T23:00");
  await page.getByLabel("Quando acordou").fill("2026-10-25T07:00");
  await page.getByLabel("Energia ao acordar (opcional)").selectOption("3");
  await page.getByRole("button", { name: "Salvar noite", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("sleep-average")).toHaveText("8 h");
  for (const [button, title] of [
    ["Adicionar ritual +", "Preparar o quarto"],
    ["Adicionar rotina bucal +", "Rotina bucal da noite"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await page.getByLabel("Nome da rotina", { exact: true }).fill(title);
    await page
      .getByRole("button", { name: "Salvar rotina", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Concluir " + title, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Desmarcar " + title, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.getByTestId("oral-consistency")).toHaveText("100%");
  await exerciseAreaAction(page, "Revisar minha rotina de sono");
  await expect(page.getByTestId("sleep-average")).toHaveText("8 h");
  await page.reload();
  await expect(page.getByTestId("sleep-average")).toHaveText("8 h");
  await expect(
    page.getByRole("button", {
      name: "Desmarcar Rotina bucal da noite",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", {
      name: "Desmarcar Rotina bucal da noite",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("oral-consistency")).toHaveText("0%");
  await page
    .getByRole("button", {
      name: "Concluir Rotina bucal da noite",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("oral-consistency")).toHaveText("100%");
  await page
    .getByRole("heading", { name: "Sono e Saúde Bucal", exact: true })
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
    path: `docs/evidence/saude-v1-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
});
