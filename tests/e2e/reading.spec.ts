import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { loginFixture } from "../helpers/session";
async function setup(page: Page, context: BrowserContext) {
  await loginFixture(context);
  await page.goto("/onboarding");
  await page.getByRole("checkbox", { name: "Leitura e estudos" }).check();
  await page.getByRole("button", { name: "Começar meu plano" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await page.goto("/areas");
  await page
    .getByRole("button", { name: "Editar Leitura e estudos", exact: true })
    .click();
  await page.getByLabel("Nome da área").fill("Minha biblioteca");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Abrir planejamento →" }).click();
  await page.getByRole("link", { name: "Leitura", exact: true }).click();
  await page
    .getByRole("button", { name: "Habilitar Leitura", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Biblioteca", exact: true }),
  ).toBeVisible();
  return page.url();
}
async function addBook(
  page: Page,
  title = "Livro teste",
  initial = "0",
  total = "300",
) {
  await page
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  await page.getByLabel("Título do livro", { exact: true }).fill(title);
  await page.getByLabel("Autores", { exact: true }).fill("Autor teste");
  await page.getByLabel("Total de páginas", { exact: true }).fill(total);
  await page.getByLabel("Página inicial de acompanhamento").fill(initial);
  await page
    .getByRole("combobox", { name: "Status do livro", exact: true })
    .selectOption("READING");
  await page.getByRole("button", { name: "Salvar livro", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("book-" + title)).toBeVisible();
}
async function record(page: Page, pages: string, book = "Livro teste") {
  await page
    .getByTestId("book-" + book)
    .getByRole("button", { name: "Registrar leitura", exact: true })
    .click();
  await page.getByLabel("Páginas lidas", { exact: true }).fill(pages);
  await page
    .getByRole("button", { name: "Salvar leitura", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function goal(page: Page, title = "Ler 70 páginas", book?: string) {
  await page
    .getByRole("button", { name: "Definir meta de leitura", exact: true })
    .click();
  await page.getByLabel("Título da meta", { exact: true }).fill(title);
  await page.getByLabel("Alvo da meta", { exact: true }).fill("70");
  if (book)
    await page
      .getByRole("combobox", { name: "Escopo da leitura", exact: true })
      .selectOption({ label: book });
  await page.getByRole("button", { name: "Salvar meta semanal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("reading-goal-" + title)).toBeVisible();
}
test.beforeEach(async ({ request, page }) => {
  await request.post("http://127.0.0.1:54329/__test/reset");
  await page.route("https://covers.openlibrary.org/**", (r) => r.abort());
});
test("manual library to MODULE source to unchanged v1 and dashboard, without GoalRecord", async ({
  page,
  context,
  request,
}, info) => {
  const url = await setup(page, context);
  await addBook(page);
  await goal(page);
  await record(page, "20");
  await record(page, "36");
  await expect(
    page.getByTestId("book-Livro teste").getByTestId("book-progress"),
  ).toHaveText("56 / 300 páginas");
  const card = page.getByTestId("reading-goal-Ler 70 páginas");
  await expect(card.getByTestId("goal-raw")).toHaveText("80% realizado");
  await expect(card.locator(".score-badge")).toContainText("8,0");
  let audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.manualRecords).toHaveLength(0);
  expect(audit.sources[0]).toMatchObject({
    kind: "MODULE",
    module: "READING",
    metric: "PAGES_READ",
    scope: "ALL_BOOKS",
  });
  const first = audit.logs[0];
  const retry = await request.post(
    "http://127.0.0.1:54329/__test/retry-reading",
    {
      data: {
        book_id: first.book_id,
        log: {
          pages: first.pages,
          read_on: first.read_on,
          operation_id: first.operation_id,
        },
      },
    },
  );
  expect(retry.ok()).toBe(true);
  audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.logs).toHaveLength(2);
  await page.reload();
  await expect(card.getByTestId("goal-raw")).toHaveText("80% realizado");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(
    page.getByRole("status", { name: "Carregando seu espaço", exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: "docs/evidence/fase-3-library-" + info.project.name + ".png",
    fullPage: true,
    scale: "css",
    caret: "initial",
  });
  await page
    .getByTestId("book-Livro teste")
    .getByRole("link", { name: "Livro teste", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Histórico de leitura" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(
    page.getByRole("status", { name: "Carregando seu espaço", exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: "docs/evidence/fase-3-book-" + info.project.name + ".png",
    fullPage: true,
    scale: "css",
    caret: "initial",
  });
  await page.goto("/inicio");
  await expect(page.getByTestId("week-percent")).toHaveText("80%");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(
    page.getByRole("status", { name: "Carregando seu espaço", exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: "docs/evidence/fase-3-dashboard-" + info.project.name + ".png",
    fullPage: true,
    scale: "css",
    caret: "initial",
  });
  await page.goto(url);
  await record(page, "44");
  await expect(card.getByTestId("goal-raw")).toHaveText("143% realizado");
  await expect(card.locator(".contribution-label")).toContainText("100%");
  await expect(card.locator(".score-badge")).toContainText("10,0");
  await page.getByText("Configuração do módulo", { exact: true }).click();
  await page
    .getByRole("button", { name: "Desabilitar Leitura", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Leitura desabilitada nesta área" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar meta Ler 70 páginas", exact: true })
    .click();
  await page
    .getByLabel("Título da meta", { exact: true })
    .fill("Ler 70 páginas revisadas");
  await page
    .getByRole("button", { name: "Salvar meta semanal", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByTestId("goal-Ler 70 páginas revisadas").getByTestId("goal-raw"),
  ).toHaveText("143% realizado");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("initial page, explicit book scope, correction and page limits", async ({
  page,
  context,
  request,
}) => {
  await setup(page, context);
  await addBook(page, "Livro teste", "120");
  await addBook(page, "Outro livro");
  await goal(page, "Somente Livro teste", "Livro teste");
  const card = page.getByTestId("reading-goal-Somente Livro teste");
  await expect(card.getByTestId("goal-raw")).toHaveText("0% realizado");
  await record(page, "70", "Outro livro");
  await expect(card.getByTestId("goal-raw")).toHaveText("0% realizado");
  await record(page, "80");
  await expect(
    page.getByTestId("book-Livro teste").getByTestId("book-progress"),
  ).toContainText("200 / 300");
  await page
    .getByRole("button", { name: /Editar leitura .*80 páginas/ })
    .click();
  await page.getByLabel("Páginas lidas", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: "Salvar leitura", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByTestId("book-Livro teste").getByTestId("book-progress"),
  ).toContainText("128 / 300");
  await expect(card.getByTestId("goal-raw")).toHaveText("11,43% realizado");
  await page
    .getByTestId("book-Livro teste")
    .getByRole("button", { name: "Registrar leitura", exact: true })
    .click();
  await page.getByLabel("Páginas lidas", { exact: true }).fill("173");
  await page
    .getByRole("button", { name: "Salvar leitura", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "não pode ultrapassar",
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: /Remover leitura .*8 páginas/ })
    .click();
  await page
    .getByRole("button", { name: "Confirmar remoção da leitura" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByTestId("goal-raw")).toHaveText("0% realizado");
  await expect(
    page.getByTestId("book-Livro teste").getByTestId("book-progress"),
  ).toContainText("120 / 300");
  const audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.manualRecords).toHaveLength(0);
  expect(audit.logs.some((l: { is_deleted: boolean }) => l.is_deleted)).toBe(
    true,
  );
});
test("catalog suggestions stay editable and manual fallback survives provider failure", async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.route("**/api/book-catalog?**", (r) =>
    r.fulfill({
      json: {
        books: [
          {
            provider: "OPEN_LIBRARY",
            externalId: "/works/OL123W",
            lookedUpAt: "2026-10-20T12:00:00.000Z",
            title: "Livro sugerido",
            authors: ["Autora A", "Autor B"],
            pageCount: null,
            coverUrl: null,
            isbn10: null,
            isbn13: null,
          },
        ],
      },
    }),
  );
  await page
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();
  await page.getByLabel("Título, autor ou ISBN").fill("Livro");
  await page
    .getByRole("button", { name: "Buscar livros", exact: true })
    .click();
  await page.getByRole("button", { name: /Livro sugerido/ }).click();
  await expect(page.getByLabel("Autores", { exact: true })).toHaveValue(
    "Autora A; Autor B",
  );
  await page
    .getByLabel("Título do livro", { exact: true })
    .fill("Minha edição");
  await page.getByLabel("Total de páginas", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Salvar livro", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("book-Minha edição")).toContainText(
    "250 páginas",
  );
  await page.unroute("**/api/book-catalog?**");
  await page.route("**/api/book-catalog?**", (r) =>
    r.fulfill({ status: 503, json: { error: "Indisponível" } }),
  );
  await page
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();
  await page.getByLabel("Título, autor ou ISBN").fill("Outro");
  await page
    .getByRole("button", { name: "Buscar livros", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "indisponível",
  );
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  await page
    .getByLabel("Título do livro", { exact: true })
    .fill("Cadastro sem API");
  await page.getByRole("button", { name: "Salvar livro", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("book-Cadastro sem API")).toBeVisible();
});
