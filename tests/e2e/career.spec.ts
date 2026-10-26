import { test, expect } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { exerciseAreaAction } from "../helpers/specialized-e2e";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
});
test("career milestones, commitments, review and responsive evidence", async ({
  page,
  context,
}, info) => {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Carreira", exact: true }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/inicio/);
  await page.goto("/areas");
  await page.getByRole("link", { name: "Abrir planejamento →" }).click();
  await page.getByRole("link", { name: "Carreira", exact: true }).click();
  await page.getByRole("heading", { name: "Foco profissional" }).click();
  await page.screenshot({
    path: `docs/evidence/carreira-v1-empty-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Novo projeto ou competência" })
    .click();
  await page
    .getByLabel("Título do projeto ou competência")
    .fill("Melhorar processos do time");
  await page.getByLabel("Prazo do projeto").fill("2026-12-01");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const title of ["Mapear processo", "Validar com equipe"]) {
    await page.getByRole("button", { name: "Novo marco +" }).click();
    await page.getByLabel("Título do marco").fill(title);
    if (title === "Mapear processo")
      await page
        .getByLabel("Concluído em", { exact: false })
        .fill("2026-10-20");
    await page
      .getByRole("button", { name: "Salvar marco", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await expect(page.getByTestId("career-on-track")).toHaveText("1");
  await exerciseAreaAction(page, "Preparar próxima apresentação");
  await page.getByRole("button", { name: "Agendar compromisso" }).click();
  await page.getByLabel("Título do compromisso").fill("Reunião de alinhamento");
  await page.getByLabel("Data prevista", { exact: true }).fill("2026-10-20");
  await page.getByLabel("Concluído em", { exact: false }).fill("2026-10-20");
  await page
    .getByRole("button", { name: "Salvar compromisso", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Começar revisão →" }).click();
  await page
    .getByLabel("Conquistas e observações")
    .fill("Primeiro marco entregue");
  await page.getByLabel("Aprendizados", { exact: true }).fill("Ouvir a equipe");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Primeiro marco entregue", { exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Foco profissional" }).click();
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
    path: `docs/evidence/carreira-v1-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
});
