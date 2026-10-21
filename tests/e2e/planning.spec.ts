import { test, expect, type Page } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { addDays } from "../../src/lib/dates/weeks";
async function navigation(page: Page, project: string, label: string) {
  await page
    .getByRole("navigation", {
      name: project === "mobile" ? "Navegação mobile" : "Navegação principal",
      exact: true,
    })
    .getByRole("link", { name: label, exact: true })
    .click();
}
async function createGoal(
  page: Page,
  title: string,
  type = "QUANTITY",
  target = "70",
  unit = "páginas",
) {
  await page.getByRole("button", { name: "Nova meta", exact: true }).click();
  await page.getByLabel("Título da meta", { exact: true }).fill(title);
  await page
    .getByRole("combobox", { name: "Tipo da meta", exact: true })
    .selectOption(type);
  if (type !== "COMPLETION") {
    await page.getByLabel("Alvo da meta", { exact: true }).fill(target);
    await page.getByLabel("Unidade da meta", { exact: true }).fill(unit);
  }
  if (type === "AVERAGE")
    await page.getByLabel("Unidade da cobertura").fill("noites");
  await page.getByRole("button", { name: "Salvar meta semanal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("goal-" + title)).toBeVisible();
}
async function addRecord(
  page: Page,
  title: string,
  value: string,
  date?: string,
) {
  const card = page.getByTestId("goal-" + title);
  await card
    .getByRole("button", { name: "Registrar execução", exact: true })
    .click();
  if (date) await page.getByLabel("Data da execução").fill(date);
  await page.getByLabel(/Valor (realizado|observado)/).fill(value);
  await page.getByRole("button", { name: "Salvar execução" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("planning vertical slice, equal aggregation and persistence", async ({
  page,
  context,
}, info) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Leitura e estudos" }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await navigation(page, info.project.name, "Objetivos");
  await page
    .getByRole("button", { name: "Novo objetivo", exact: true })
    .click();
  await page.getByLabel("Título do objetivo").fill("Ler mais");
  await page
    .getByLabel("Área do objetivo")
    .selectOption({ label: "Leitura e estudos" });
  await page.getByRole("button", { name: "Salvar objetivo" }).click();
  await expect(
    page.getByRole("heading", { name: "Ler mais", exact: true }),
  ).toBeVisible();
  await navigation(page, info.project.name, "Início");
  await page
    .getByRole("link", { name: "Abrir Leitura e estudos", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova meta", exact: true }).click();
  await page.getByLabel("Título da meta").fill("Ler 70 páginas");
  await page.getByLabel("Alvo da meta").fill("70");
  await page.getByLabel("Unidade da meta", { exact: true }).fill("páginas");
  await page
    .getByLabel("Objetivo relacionado")
    .selectOption({ label: "Ler mais" });
  await page.getByRole("button", { name: "Salvar meta semanal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await addRecord(page, "Ler 70 páginas", "56");
  const first = page.getByTestId("goal-Ler 70 páginas");
  await expect(first.locator(".actual-target")).toContainText("56");
  await expect(first.getByTestId("goal-raw")).toHaveText("80% realizado");
  await expect(first.locator(".score-badge")).toContainText("8,0");
  await expect(page.getByTestId("area-score")).toContainText("8,0");
  await expect(page.getByTestId("week-percent")).toHaveText("80%");
  await page
    .getByText("Ver composição de Leitura e estudos", { exact: true })
    .click();
  await expect(page.locator(".breakdown-content")).toContainText(
    "Ler 70 páginas",
  );
  await expect(page.locator(".breakdown-content")).toContainText(
    "80% realizado",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    caret: "initial",
    fullPage: true,
    scale: "css",
    path: "docs/evidence/fase-2-80-percent-" + info.project.name + ".png",
  });
  await createGoal(page, "Segunda meta", "QUANTITY", "10");
  await expect(page.getByTestId("area-score")).toContainText("4,0");
  await expect(page.getByTestId("week-percent")).toHaveText("40%");
  await addRecord(page, "Ler 70 páginas", "84");
  await expect(first.getByTestId("goal-raw")).toHaveText("200% realizado");
  await expect(first.locator(".contribution-label")).toContainText("100%");
  await expect(page.getByTestId("area-score")).toContainText("5,0");
  await expect(page.getByTestId("week-percent")).toHaveText("50%");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    caret: "initial",
    fullPage: true,
    scale: "css",
    path: "docs/evidence/fase-2-superacao-" + info.project.name + ".png",
  });
  await navigation(page, info.project.name, "Minhas áreas");
  await page.getByRole("button", { name: "Nova área", exact: true }).click();
  await page.getByLabel("Nome da área").fill("Sem planejamento");
  await page.getByRole("button", { name: "Criar área", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigation(page, info.project.name, "Início");
  await expect(
    page.getByRole("link", { name: "Abrir Sem planejamento" }),
  ).toContainText("Sem meta semanal");
  await expect(page.getByTestId("week-percent")).toHaveText("50%");
  await page.reload();
  await expect(page.getByTestId("week-percent")).toHaveText("50%");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    caret: "initial",
    fullPage: true,
    scale: "css",
    path: "docs/evidence/fase-2-dashboard-" + info.project.name + ".png",
  });
  const start = await page
    .getByLabel("Escolher semana", { exact: true })
    .inputValue();
  await page
    .getByRole("link", { name: "Semana seguinte", exact: true })
    .click();
  await expect(page.getByLabel("Escolher semana", { exact: true })).toHaveValue(
    addDays(start, 7),
  );
  await expect(page.getByTestId("week-score")).toContainText(
    "Sem meta semanal",
  );
  await page
    .getByRole("link", { name: "Semana anterior", exact: true })
    .click();
  await expect(page.getByTestId("week-percent")).toHaveText("50%");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
test("generic frequency, observed average with coverage, and binary completion", async ({
  page,
  context,
}) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Leitura e estudos" }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await page.goto("/planejamento");
  await page
    .getByRole("link", { name: "Semana anterior", exact: true })
    .click();
  await expect(page).toHaveURL(/week=\d{4}-\d{2}-\d{2}/);
  const start = new URL(page.url()).searchParams.get("week")!;
  await expect(page.getByLabel("Escolher semana", { exact: true })).toHaveValue(
    start,
  );
  await createGoal(page, "Estudar 3 sessões", "FREQUENCY", "3", "sessões");
  await addRecord(page, "Estudar 3 sessões", "2", start);
  const frequency = page.getByTestId("goal-Estudar 3 sessões");
  await expect(frequency.getByTestId("goal-raw")).toHaveText(
    "66,67% realizado",
  );
  await expect(frequency.locator(".score-badge")).toContainText("6,7");
  await addRecord(page, "Estudar 3 sessões", "3", addDays(start, 1));
  await expect(frequency.getByTestId("goal-raw")).toHaveText("167% realizado");
  await createGoal(page, "Média manual", "AVERAGE", "8", "h");
  const average = page.getByTestId("goal-Média manual");
  await expect(average).toContainText("Sem observações");
  await expect(average).not.toContainText("0,0");
  for (let i = 0; i < 6; i++)
    await addRecord(page, "Média manual", "7,4", addDays(start, i));
  await expect(average.locator(".actual-target")).toContainText("7,4");
  await expect(average.getByTestId("goal-raw")).toHaveText("92,5% realizado");
  await expect(average.locator(".coverage")).toHaveText(
    "Cobertura: 6/7 noites (86%)",
  );
  await expect(average.locator(".score-badge")).toContainText("9,3");
  await createGoal(page, "Entrega da semana", "COMPLETION");
  const completion = page.getByTestId("goal-Entrega da semana");
  await expect(completion.getByTestId("goal-raw")).toHaveText("0% realizado");
  await completion.getByRole("button", { name: "Atualizar conclusão" }).click();
  await page.getByRole("checkbox", { name: "Entrega concluída" }).check();
  await page.getByRole("button", { name: "Salvar execução" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(completion.getByTestId("goal-raw")).toHaveText("100% realizado");
  await page.reload();
  await expect(average.locator(".coverage")).toHaveText(
    "Cobertura: 6/7 noites (86%)",
  );
  await average.getByText("Ver registros", { exact: true }).click();
  await average
    .getByRole("button", { name: "Editar registro de " + start, exact: true })
    .click();
  await page.getByLabel(/Valor observado/).fill("8,6");
  await page.getByRole("button", { name: "Salvar execução" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(average.getByTestId("goal-raw")).toHaveText("95% realizado");
  await expect(average.locator(".coverage")).toHaveText(
    "Cobertura: 6/7 noites (86%)",
  );
  await average
    .getByRole("button", { name: "Remover registro de " + start, exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar remoção" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(average.locator(".coverage")).toHaveText(
    "Cobertura: 5/7 noites (71%)",
  );
});
