import { test, expect } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { exerciseAreaAction } from "../helpers/specialized-e2e";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("studies canonical sessions, shared goal, correction and responsive evidence", async ({
  page,
  context,
}, info) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Leitura e estudos" }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/inicio/);
  await page.goto("/areas");
  await page.getByRole("link", { name: "Abrir planejamento →" }).click();
  await page.getByRole("link", { name: "Estudos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Estudos", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/evidence/estudos-v1-empty-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Adicionar disciplina +" }).click();
  await page.getByLabel("Disciplina ou assunto").fill("Produto e gestão");
  await page.getByLabel("Alvo total em minutos").fill("600");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Definir meta de estudos" }).click();
  await page.getByRole("button", { name: "Salvar meta de estudos" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Registrar sessão", exact: true })
    .click();
  await page.getByLabel("Duração em minutos").fill("120");
  await page
    .getByRole("button", { name: "Salvar sessão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("study-hours")).toHaveText("2");
  await expect(page.getByTestId("study-percent")).toHaveText("40%");
  await page.reload();
  await expect(page.getByTestId("study-percent")).toHaveText("40%");
  await page.getByRole("button", { name: "Corrigir", exact: true }).click();
  await page.getByLabel("Duração em minutos").fill("150");
  await page
    .getByRole("button", { name: "Salvar sessão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("study-percent")).toHaveText("50%");
  await exerciseAreaAction(page, "Revisar anotações");
  await expect(page.getByTestId("study-percent")).toHaveText("50%");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByRole("heading", { name: "Estudos", exact: true }).click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: `docs/evidence/estudos-v1-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  const areaId = new URL(page.url()).pathname.split("/")[2];
  await page.getByLabel("Dashboard inicial desta área").selectOption("estudos");
  await page
    .getByRole("button", {
      name: "Salvar dashboard inicial da área",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Este dashboard será aberto ao entrar na área.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/areas/${areaId}`);
  await expect(page).toHaveURL(/\/estudos/);
  await page.getByRole("link", { name: "Planejamento da área" }).click();
  await expect(
    page.locator(".goal-card").filter({ hasText: "Estudar nesta semana" }),
  ).toContainText("50% realizado");
  await page.goto("/areas");
  await page
    .getByRole("button", { name: "Editar Leitura e estudos", exact: true })
    .click();
  await page.getByLabel("Nome da área", { exact: true }).fill("leitura");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Abrir planejamento →", exact: true })
    .click();
  await expect(page).toHaveURL(/\/estudos/);
  await exerciseAreaAction(page, "Organizar estudos após renomear");
  await expect(page.getByTestId("study-percent")).toHaveText("50%");
});
