import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { loginFixture } from "../helpers/session";
import { writeFile } from "node:fs/promises";
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
    page.getByRole("heading", { name: "Livros em andamento", exact: true }),
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
  await expect(page.getByTestId("reading-week-pages")).toHaveText("56");
  await expect(page.getByTestId("reading-week-percent")).toHaveText("80%");
  await expect(page.getByTestId("reading-average")).toHaveText(
    "Média: 4 pág/dia",
  );
  await expect(page.getByTestId("reading-streak")).toHaveText("1 dia");
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

test("reading dashboard empty states, actions, persisted metrics and responsive wireframe", async ({
  page,
  context,
  request,
}, info) => {
  await setup(page, context);
  await expect(
    page.getByRole("heading", { name: "Leitura", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Leitura da semana",
    "Últimos 14 dias",
    "Sequência atual",
    "Livros em andamento",
    "Próximas ações",
  ]) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByTestId("reading-week-pages")).toHaveText("0");
  await expect(page.getByTestId("reading-week-percent")).toHaveText("Sem meta");
  await expect(page.getByTestId("reading-average")).toHaveText(
    "Média: 0 pág/dia",
  );
  await expect(page.getByTestId("reading-streak")).toHaveText("0 dias");
  await expect(page.locator(".reading-bar-hit")).toHaveCount(14);
  await expect(
    page.getByRole("status", { name: "Carregando leitura", exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: `docs/evidence/leitura-v1-empty-${info.project.name}.png`,
    fullPage: true,
  });
  await addBook(page, "Livro teste", "120");
  await addBook(page, "Hábitos de leitura", "100", "250");
  await addBook(page, "Uma página por dia", "25", "200");
  await goal(page);
  await record(page, "21");
  await record(page, "35");
  await expect(page.getByTestId("reading-week-percent")).toHaveText("80%");
  // Every date, including zero-page days, has keyboard/touch-accessible detail.
  await page.locator(".reading-bar-hit").last().focus();
  await expect(page.getByRole("tooltip")).toContainText("56 páginas");
  const before = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  await page
    .getByRole("button", { name: "Adicionar ação", exact: true })
    .click();
  await page
    .getByLabel("Título da ação", { exact: true })
    .fill("Ler o próximo capítulo");
  await page
    .getByRole("combobox", { name: "Livro relacionado", exact: true })
    .selectOption({ label: "Livro teste" });
  await page.getByLabel("Horário da ação", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Salvar ação", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await page
    .getByLabel("Data da ação", { exact: true })
    .fill(before.logs[0].read_on.slice(0, 10));
  await page.getByRole("button", { name: "Salvar ação", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Concluir ação Ler o próximo capítulo",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reabrir ação Ler o próximo capítulo",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Ler o próximo capítulo.*Livro teste/ })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Livro relacionado", exact: true }),
  ).not.toHaveValue("");
  await page
    .getByLabel("Título da ação", { exact: true })
    .fill("Ler e anotar o capítulo");
  await page.getByRole("button", { name: "Salvar ação", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Adicionar ação", exact: true })
    .click();
  await page
    .getByLabel("Título da ação", { exact: true })
    .fill("Escolher próximo livro");
  await page.getByRole("button", { name: "Salvar ação", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Reabrir ação Ler e anotar o capítulo",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("reading-week-pages")).toHaveText("56");
  await expect(page.getByTestId("reading-week-percent")).toHaveText("80%");
  const after = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(after.logs).toEqual(before.logs);
  expect(after.manualRecords).toHaveLength(0);
  expect(after.actions).toHaveLength(2);
  await page.getByRole("button", { name: "Definir meta", exact: true }).click();
  await expect(page.getByLabel("Alvo da meta", { exact: true })).toHaveValue(
    "70",
  );
  await page.getByLabel("Alvo da meta", { exact: true }).fill("80");
  await page
    .getByRole("button", { name: "Salvar meta semanal", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("reading-week-percent")).toHaveText("70%");
  await page.reload();
  await expect(page.getByTestId("reading-week-percent")).toHaveText("70%");
  await expect(page.getByTestId("reading-week-percent")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Carregando leitura", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: `docs/evidence/leitura-v1-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  const areaId = new URL(page.url()).pathname.split("/")[2];
  await page.goto("/areas/" + areaId);
  await expect(page).toHaveURL(/\/leitura\?week=/);
  await expect(page.getByTestId("reading-week-percent")).toHaveText("70%");
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  await expect(page).toHaveURL(/view=planning/);
  await expect(page.getByTestId("goal-Ler 70 páginas")).toBeVisible();
  await page
    .getByRole("link", { name: "Semana anterior", exact: true })
    .click();
  await expect(page).toHaveURL(/view=planning/);
  await expect(
    page.getByRole("heading", {
      name: "Minha biblioteca",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
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

test("planning ALL_BOOKS opens canonical modal and computes 21 + 35 = 56/70 without GoalRecord", async ({
  page,
  context,
  request,
}, info) => {
  await setup(page, context);
  await addBook(page, "Livro A");
  await addBook(page, "Livro B");
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nova meta de leitura", exact: true })
    .click();
  await expect(page.getByLabel("Fonte da medição")).toHaveValue("MODULE");
  await page
    .getByLabel("Título da meta", { exact: true })
    .fill("Leitura semanal 70");
  await page.getByLabel("Alvo da meta", { exact: true }).fill("70");
  await page.getByRole("button", { name: "Salvar meta semanal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByTestId("goal-Leitura semanal 70");
  await expect(
    card.getByRole("button", { name: "Registrar execução" }),
  ).toHaveCount(0);
  for (const [book, pages] of [
    ["Livro A", "21"],
    ["Livro B", "35"],
  ]) {
    await card
      .getByRole("button", { name: "Registrar leitura", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Registrar leitura", exact: true }),
    ).toBeVisible();
    const select = page.getByLabel("Livro da leitura");
    await expect(select).toHaveAttribute("required", "");
    await expect(select.locator("option")).toHaveText(["Livro A", "Livro B"]);
    await select.selectOption({ label: book });
    await page.getByLabel("Páginas lidas", { exact: true }).fill(pages);
    if (pages === "21") {
      await page.screenshot({
        path: `docs/evidence/fase-3-fix-reading-modal-${info.project.name}.png`,
        scale: "css",
      });
    }
    await page
      .getByRole("button", { name: "Salvar leitura", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(card.locator(".actual-target")).toHaveText("56 / 70 páginas");
  await expect(card.getByTestId("goal-raw")).toHaveText("80% realizado");
  await expect(card.locator(".score-badge")).toContainText("8,0");
  await page.reload();
  await expect(card.getByTestId("goal-raw")).toHaveText("80% realizado");
  const audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.logs).toHaveLength(2);
  expect(audit.logs.map((l: { pages: number }) => l.pages).sort()).toEqual([
    21, 35,
  ]);
  expect(
    new Set(audit.logs.map((l: { book_id: string }) => l.book_id)).size,
  ).toBe(2);
  expect(audit.manualRecords).toHaveLength(0);
  expect(audit.sources[0]).toMatchObject({
    kind: "MODULE",
    module: "READING",
    metric: "PAGES_READ",
    scope: "ALL_BOOKS",
  });
  await writeFile(
    `docs/evidence/fase-3-fix-audit-${info.project.name}.json`,
    JSON.stringify(
      {
        database: "PostgreSQL PGlite efêmero com migrations reais",
        source: audit.sources[0],
        reading_logs: audit.logs,
        goal_records: audit.manualRecords,
        actual: 56,
        target: 70,
        percent: 80,
        score: 8,
      },
      null,
      2,
    ) + "\n",
  );
  await expect(
    page.getByRole("status", { name: "Carregando seu espaço", exact: true }),
  ).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  await expect(card).toBeVisible();
  await card.getByRole("heading").click();
  await card.getByRole("heading").click();
  await page.screenshot({
    path: `docs/evidence/fase-3-fix-result-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
  });
});

test("planning BOOK locks the selected book and server rejects a forged different book", async ({
  page,
  context,
  request,
}, info) => {
  await setup(page, context);
  await addBook(page, "Livro A");
  await addBook(page, "Livro B");
  await goal(page, "Apenas A", "Livro A");
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  const card = page.getByTestId("goal-Apenas A");
  await card
    .getByRole("button", { name: "Registrar leitura", exact: true })
    .click();
  const select = page.getByLabel("Livro da leitura");
  await expect(select).toBeDisabled();
  await expect(select.locator("option")).toHaveText(["Livro A"]);
  const audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  const a = audit.books.find(
    (b: { title: string }) => b.title === "Livro A",
  ).id;
  const b = audit.books.find(
    (b: { title: string }) => b.title === "Livro B",
  ).id;
  await expect(select).toHaveValue(a);
  await page.getByLabel("Páginas lidas", { exact: true }).fill("21");
  await page.screenshot({
    path: `docs/evidence/fase-3-fix-book-modal-${info.project.name}.png`,
    scale: "css",
  });
  await page
    .locator('input[type="hidden"][name="book_id"]')
    .evaluate((input, id) => ((input as HTMLInputElement).value = id), b);
  await page
    .getByRole("button", { name: "Salvar leitura", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  let saved = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(saved.logs).toHaveLength(0);
  expect(saved.manualRecords).toHaveLength(0);
  await page
    .locator('input[type="hidden"][name="book_id"]')
    .evaluate((input, id) => ((input as HTMLInputElement).value = id), a);
  await page.getByLabel("Páginas lidas", { exact: true }).fill("21");
  await page
    .getByRole("button", { name: "Salvar leitura", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  saved = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(saved.logs).toHaveLength(1);
  expect(saved.logs[0]).toMatchObject({ book_id: a, pages: 21 });
  expect(saved.manualRecords).toHaveLength(0);
});

test("planning without books offers add book and never saves generic pages", async ({
  page,
  context,
}, info) => {
  await setup(page, context);
  await goal(page);
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  await page
    .getByTestId("goal-Ler 70 páginas")
    .getByRole("button", { name: "Registrar leitura", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Registrar leitura",
    exact: true,
  });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(
    "Nenhum livro disponível. Adicione um livro antes de registrar uma leitura.",
  );
  await expect(modal.locator('input[name="pages"]')).toHaveCount(0);
  await expect(
    modal.getByRole("button", { name: "Salvar leitura" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `docs/evidence/fase-3-fix-empty-modal-${info.project.name}.png`,
    scale: "css",
  });
  await modal
    .getByRole("button", { name: "Adicionar livro", exact: true })
    .click();
  await page.getByRole("button", { name: "Adicionar manualmente" }).click();
  await page
    .getByLabel("Título do livro", { exact: true })
    .fill("Primeiro livro");
  await page.getByRole("button", { name: "Salvar livro", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByTestId("goal-Ler 70 páginas")
    .getByRole("button", { name: "Registrar leitura", exact: true })
    .click();
  await expect(
    page.getByLabel("Livro da leitura").locator("option"),
  ).toHaveText(["Primeiro livro"]);
});

test("manual goal named in pages still opens execution and saves GoalRecord", async ({
  page,
  context,
  request,
}) => {
  await setup(page, context);
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova meta", exact: true }).click();
  await expect(page.getByLabel("Fonte da medição")).toHaveValue("MANUAL");
  await page
    .getByLabel("Título da meta", { exact: true })
    .fill("Ler 70 páginas por semana");
  await page.getByLabel("Alvo da meta", { exact: true }).fill("70");
  await page.getByLabel("Unidade da meta", { exact: true }).fill("páginas");
  await page.getByRole("button", { name: "Salvar meta semanal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByTestId("goal-Ler 70 páginas por semana");
  await expect(
    card.getByRole("button", { name: "Registrar leitura" }),
  ).toHaveCount(0);
  await card
    .getByRole("button", { name: "Registrar execução", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Registrar execução", exact: true }),
  ).toBeVisible();
  await page.getByLabel(/Valor realizado/).fill("21");
  await page
    .getByRole("button", { name: "Salvar execução", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.manualRecords).toHaveLength(1);
  expect(audit.logs).toHaveLength(0);
  expect(audit.sources[0].kind).toBe("MANUAL");
});

test("planning ALL_BOOKS excludes and rejects books from another owner or association", async ({
  page,
  context,
  request,
}) => {
  await setup(page, context);
  await addBook(page, "Livro permitido");
  await goal(page);
  const response = await request.post(
    "http://127.0.0.1:54329/__test/reading-outsiders",
  );
  expect(response.ok()).toBe(true);
  const outsiders: string[] = await response.json();
  await page
    .getByRole("link", { name: "Planejamento da área", exact: true })
    .click();
  const card = page.getByTestId("goal-Ler 70 páginas");
  for (const outsider of outsiders) {
    await card
      .getByRole("button", { name: "Registrar leitura", exact: true })
      .click();
    const select = page.getByLabel("Livro da leitura");
    await expect(select.locator("option")).toHaveText(["Livro permitido"]);
    await select.evaluate((element, id) => {
      const select = element as HTMLSelectElement;
      select.options[0].value = id;
      select.value = id;
    }, outsider);
    await page.getByLabel("Páginas lidas", { exact: true }).fill("21");
    await page
      .getByRole("button", { name: "Salvar leitura", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "Não foi possível salvar",
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
  }
  const audit = await (
    await request.get("http://127.0.0.1:54329/__test/reading")
  ).json();
  expect(audit.logs).toHaveLength(0);
  expect(audit.manualRecords).toHaveLength(0);
});
