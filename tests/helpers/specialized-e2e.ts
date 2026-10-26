import { expect, type Page } from "@playwright/test";
export async function exerciseAreaAction(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Adicionar ação", exact: true })
    .click();
  await expect(
    page.getByLabel("Livro relacionado", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Título da ação", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Salvar ação", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: `Concluir ação ${title}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Reabrir ação ${title}`, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Reabrir ação ${title}`, exact: true }),
  ).toBeVisible();
}
