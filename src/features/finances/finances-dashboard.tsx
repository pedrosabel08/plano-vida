"use client";
import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Wallet, Target, ArrowUpRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { SensitiveText } from "@/components/privacy/privacy-provider";
import {
  financeDashboard,
  money,
  moneyInput,
  monthlyChange,
} from "@/domain/finances/dashboard";
import {
  DashboardFrame,
  Card,
  Metric,
  Bar,
  Actions,
  Empty,
  n,
  type DashboardContext,
} from "@/features/specialized/ui";
import {
  EntryForm,
  Field,
  Select,
  ObjectiveField,
} from "@/features/specialized/forms";
import {
  saveFinanceCategory,
  saveFinanceTransaction,
  saveFinanceBudget,
  saveFinanceGoal,
  saveFinanceContribution,
} from "./actions";
import type {
  FinanceData,
  FinanceCategory,
  FinanceTransaction,
  FinanceBudget,
  FinanceGoal,
  FinanceContribution,
} from "./types";
type Editor =
  | { kind: "category"; item?: FinanceCategory }
  | { kind: "transaction"; item?: FinanceTransaction }
  | { kind: "budget"; item?: FinanceBudget }
  | { kind: "goal"; item?: FinanceGoal }
  | { kind: "contribution"; item?: FinanceContribution };
const amountField = (value?: number, label = "Valor em reais") => (
  <Field
    label={label}
    name="amount"
    required
    inputMode="decimal"
    placeholder="0,00"
    defaultValue={value ? moneyInput(value) : ""}
  />
);
function RemovedField() {
  return (
    <Select label="Situação do registro" name="is_deleted" defaultValue="false">
      <option value="false">Válido</option>
      <option value="true">Remover do histórico</option>
    </Select>
  );
}
export function FinancesDashboard({
  context,
  data,
  month,
}: {
  context: DashboardContext;
  data: FinanceData;
  month: string;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const saved = useCallback(() => setEditor(null), []);
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const stats = financeDashboard(data, month, context.today),
    max = stats.income > stats.expenses ? stats.income : stats.expenses;
  const historyMax = stats.history.reduce(
    (max, period) =>
      [max, period.income, period.expenses].reduce((a, b) => (a > b ? a : b)),
    1n,
  );
  const change = (value: bigint, previous: bigint) => {
    const p = monthlyChange(value, previous);
    return p === null
      ? "Sem base no mês anterior"
      : `${p > 0 ? "+" : ""}${n(p)}% em relação ao mês anterior`;
  };
  const categories = data.categories.filter((c) => !c.archived);
  return (
    <DashboardFrame
      context={context}
      title="Mais clareza para o seu dinheiro"
      color="#f27da4"
      description="Acompanhe sua receita, despesas e metas financeiras. Use seus números para tomar melhores decisões hoje."
      quote="Disciplina financeira é liberdade para escolher amanhã."
      toolbar={
        <>
          <button
            className="button primary"
            disabled={!categories.length}
            onClick={() => setEditor({ kind: "transaction" })}
          >
            Registrar movimentação
          </button>
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "category" })}
          >
            Categorias
          </button>
        </>
      }
    >
      <div className="specialized-month">
        <Field
          label="Mês financeiro"
          type="month"
          value={month}
          min="1900-01"
          max="9999-12"
          onChange={(e) => {
            const q = new URLSearchParams(params.toString());
            q.set("month", e.target.value);
            router.push(pathname + "?" + q.toString());
          }}
        />
        <p className="specialized-subtitle">
          BRL · Realizados pela data local · {context.profile.timezone}
        </p>
      </div>
      <div className="specialized-metrics">
        <Metric
          label="Receita do mês"
          value={
            <SensitiveText>
              <span data-testid="finance-income">{money(stats.income)}</span>
            </SensitiveText>
          }
          detail={
            <SensitiveText>
              {change(stats.income, stats.previous.income)}
            </SensitiveText>
          }
        />
        <Metric
          label="Despesas do mês"
          value={
            <SensitiveText>
              <span data-testid="finance-expenses">
                {money(stats.expenses)}
              </span>
            </SensitiveText>
          }
          detail={
            <SensitiveText>
              {change(stats.expenses, stats.previous.expenses)}
            </SensitiveText>
          }
        />
        <Metric
          label="Saldo do mês"
          value={
            <SensitiveText>
              <span data-testid="finance-balance">{money(stats.balance)}</span>
            </SensitiveText>
          }
          detail={
            <SensitiveText>
              {change(stats.balance, stats.previous.balance)}
            </SensitiveText>
          }
        />
      </div>
      <div className="specialized-grid">
        <Card title="Receita x despesas">
          <p>Valores realizados no mês, sem movimentações previstas.</p>
          {[
            ["Receita", stats.income],
            ["Despesas", stats.expenses],
          ].map(([label, value]) => (
            <div className="specialized-row" key={String(label)}>
              <div>
                <strong>{String(label)}</strong>
                <SensitiveText>
                  <Bar
                    value={
                      max ? Number((BigInt(value) * 10000n) / max) / 100 : 0
                    }
                    label={String(label)}
                  />
                </SensitiveText>
              </div>
              <SensitiveText>{money(BigInt(value))}</SensitiveText>
            </div>
          ))}
          <div className="specialized-note">
            <SensitiveText>
              Seu saldo é{" "}
              {stats.balance < 0n
                ? "negativo"
                : stats.balance === 0n
                  ? "neutro"
                  : "positivo"}
              : {money(stats.balance)}.
              {stats.income > 0n &&
                ` Isso representa ${n(Number((stats.balance * 10000n) / stats.income) / 100)}% da receita.`}
            </SensitiveText>
          </div>
        </Card>
        <Card title="Gastos por categoria">
          {stats.categories.some((c) => c.spent > 0n) ? (
            stats.categories
              .filter((c) => c.spent > 0n)
              .map((c) => (
                <div className="specialized-row" key={c.id}>
                  <Wallet size={19} />
                  <div>
                    <strong>{c.title}</strong>
                    <SensitiveText>
                      <Bar
                        value={
                          stats.expenses
                            ? Number((c.spent * 10000n) / stats.expenses) / 100
                            : 0
                        }
                        label={c.title}
                      />
                    </SensitiveText>
                  </div>
                  <SensitiveText>{money(c.spent)}</SensitiveText>
                </div>
              ))
          ) : (
            <Empty>Sem despesas realizadas neste mês.</Empty>
          )}
        </Card>
      </div>
      <div className="specialized-grid">
        <Card
          title="Metas financeiras"
          action={
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "goal" })}
            >
              Nova meta +
            </button>
          }
        >
          {stats.goals.length ? (
            stats.goals.map((g) => (
              <div className="specialized-row" key={g.id}>
                <span className="specialized-row-icon">
                  <Target size={23} />
                </span>
                <div>
                  <strong>{g.title}</strong>
                  <p>
                    <SensitiveText>
                      {money(g.saved)} / {money(g.target_cents)}
                    </SensitiveText>
                  </p>
                  <SensitiveText>
                    <Bar
                      value={
                        Number((g.saved * 10000n) / BigInt(g.target_cents)) /
                        100
                      }
                      label={g.title}
                    />
                  </SensitiveText>
                </div>
                <SensitiveText>
                  <span className="specialized-ratio">
                    {n(
                      Number((g.saved * 10000n) / BigInt(g.target_cents)) / 100,
                    )}
                    %
                  </span>
                </SensitiveText>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "goal", item: g })}
                >
                  Editar
                </button>
              </div>
            ))
          ) : (
            <Empty>Defina uma meta e registre aportes explícitos.</Empty>
          )}
          <button
            className="text-link"
            disabled={!stats.goals.length}
            onClick={() => setEditor({ kind: "contribution" })}
          >
            Registrar aporte +
          </button>
        </Card>
        <Actions context={context} />
      </div>
      <div className="specialized-grid">
        <Card
          title="Orçamentos do mês"
          action={
            <button
              className="text-link"
              disabled={!categories.some((c) => c.kind === "EXPENSE")}
              onClick={() => setEditor({ kind: "budget" })}
            >
              Definir limite +
            </button>
          }
        >
          {data.budgets.filter((b) => b.month.startsWith(month)).length ? (
            data.budgets
              .filter((b) => b.month.startsWith(month))
              .map((b) => {
                const spent =
                  stats.categories.find((c) => c.id === b.category_id)?.spent ||
                  0n;
                return (
                  <div className="specialized-row" key={b.id}>
                    <div>
                      <strong>
                        {
                          data.categories.find((c) => c.id === b.category_id)
                            ?.title
                        }
                      </strong>
                      <p>
                        <SensitiveText>
                          {money(spent)} / {money(b.limit_cents)} ·{" "}
                          {spent > BigInt(b.limit_cents)
                            ? "Limite excedido"
                            : "Dentro do limite"}
                        </SensitiveText>
                      </p>
                      <SensitiveText>
                        <Bar
                          value={
                            Number((spent * 10000n) / BigInt(b.limit_cents)) /
                            100
                          }
                          label="Consumo do orçamento"
                        />
                      </SensitiveText>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setEditor({ kind: "budget", item: b })}
                    >
                      Editar
                    </button>
                  </div>
                );
              })
          ) : (
            <Empty>Sem limites definidos para este mês.</Empty>
          )}
        </Card>
        <Card title="Próximos compromissos">
          {stats.planned.length ? (
            stats.planned.map((t) => (
              <div className="specialized-row" key={t.id}>
                <div>
                  <strong>{t.description}</strong>
                  <p>
                    {t.booked_on} ·{" "}
                    {t.kind === "INCOME"
                      ? "Receita prevista"
                      : "Despesa prevista"}{" "}
                    · <SensitiveText>{money(t.amount_cents)}</SensitiveText>
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "transaction", item: t })}
                >
                  Editar / dar baixa
                </button>
              </div>
            ))
          ) : (
            <Empty>
              Nenhuma movimentação prevista. Cadastre um compromisso como
              “Previsto”.
            </Empty>
          )}
        </Card>
      </div>
      <Card title="Evolução dos últimos 6 meses">
        <SensitiveText>
          <p>Receitas e despesas realizadas na mesma escala, por mês.</p>
          <div className="finance-timeline">
            {stats.history.map((period) => (
              <div key={period.date}>
                <div className="finance-timeline-pair">
                  {(
                    [
                      ["Receitas", period.income],
                      ["Despesas", period.expenses],
                    ] as const
                  ).map(([label, value]) => (
                    <button
                      type="button"
                      key={label}
                      aria-label={`${period.date} · ${label}: ${money(value)}`}
                      title={`${label}: ${money(value)}`}
                    >
                      <span
                        style={{
                          height: `${Number((value * 10000n) / historyMax) / 100}%`,
                        }}
                      />
                      <span className="finance-chart-tooltip">
                        {label}
                        <br />
                        {money(value)}
                      </span>
                    </button>
                  ))}
                </div>
                <small>
                  {period.date.slice(5)}/{period.date.slice(2, 4)}
                </small>
              </div>
            ))}
          </div>
          <p className="finance-chart-legend">
            <i /> Receitas <i /> Despesas
          </p>
          <div className="finance-evolution">
            {stats.history.map((d) => (
              <div key={d.date}>
                <strong>{d.date}</strong>
                <span>Receitas {money(d.income)}</span>
                <span>Despesas {money(d.expenses)}</span>
                <Bar
                  value={
                    Number(
                      d.income > 0n ? (d.expenses * 10000n) / d.income : 0n,
                    ) / 100
                  }
                  label={`Despesa sobre receita em ${d.date}`}
                />
                <small>Saldo {money(d.balance)}</small>
              </div>
            ))}
          </div>
        </SensitiveText>
      </Card>
      <Card title="Movimentações e aportes">
        <div className="specialized-history">
          {data.transactions
            .filter((t) => !t.is_deleted && t.booked_on.startsWith(month))
            .sort((a, b) => b.booked_on.localeCompare(a.booked_on))
            .map((t) => (
              <div className="specialized-row" key={t.id}>
                <ArrowUpRight size={20} />
                <div>
                  <strong>{t.description}</strong>
                  <p>
                    {t.booked_on} ·{" "}
                    {data.categories.find((c) => c.id === t.category_id)?.title}{" "}
                    · {t.status === "REALIZED" ? "Realizado" : "Previsto"}
                  </p>
                </div>
                <SensitiveText>
                  {t.kind === "EXPENSE" ? "−" : "+"} {money(t.amount_cents)}
                </SensitiveText>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "transaction", item: t })}
                >
                  Corrigir
                </button>
              </div>
            ))}
          {data.contributions
            .filter((c) => !c.is_deleted)
            .map((c) => (
              <div className="specialized-row" key={c.id}>
                <div>
                  <strong>
                    Aporte · {data.goals.find((g) => g.id === c.goal_id)?.title}
                  </strong>
                  <p>
                    {c.recorded_on} ·{" "}
                    <SensitiveText>{money(c.amount_cents)}</SensitiveText>
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "contribution", item: c })}
                >
                  Corrigir aporte
                </button>
              </div>
            ))}
          {!data.transactions.some(
            (t) => !t.is_deleted && t.booked_on.startsWith(month),
          ) && <Empty>Nenhuma movimentação no mês.</Empty>}
        </div>
        <details>
          <summary>Gerenciar categorias e metas arquivadas</summary>
          {data.categories.map((c) => (
            <div className="specialized-row" key={c.id}>
              <strong>
                {c.title} · {c.kind === "INCOME" ? "Receita" : "Despesa"}
                {c.archived ? " · Arquivada" : ""}
              </strong>
              <button
                className="text-link"
                onClick={() => setEditor({ kind: "category", item: c })}
              >
                Editar categoria
              </button>
            </div>
          ))}
          {data.goals
            .filter((g) => g.archived)
            .map((g) => (
              <button
                key={g.id}
                className="text-link"
                onClick={() => setEditor({ kind: "goal", item: g })}
              >
                {g.title} · Reabrir meta
              </button>
            ))}
        </details>
      </Card>
      {editor && (
        <Modal
          title={
            {
              category: "Categoria financeira",
              transaction: "Movimentação financeira",
              budget: "Orçamento mensal",
              goal: "Meta financeira",
              contribution: "Aporte à meta",
            }[editor.kind]
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "category" ? (
            <EntryForm
              action={saveFinanceCategory}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Field
                label="Nome da categoria"
                name="title"
                required
                maxLength={160}
                defaultValue={editor.item?.title}
              />
              <Select
                label="Tipo da categoria"
                name="kind"
                defaultValue={editor.item?.kind || "EXPENSE"}
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </Select>
              <Select
                label="Situação da categoria"
                name="archived"
                defaultValue={String(editor.item?.archived || false)}
              >
                <option value="false">Ativa</option>
                <option value="true">Arquivada</option>
              </Select>
              <p className="field-help">
                Categorias com movimentações preservam seu tipo.
              </p>
            </EntryForm>
          ) : editor.kind === "transaction" ? (
            <TransactionForm
              context={context}
              data={data}
              item={editor.item}
              onSaved={saved}
            />
          ) : editor.kind === "budget" ? (
            <EntryForm
              action={saveFinanceBudget}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Select
                label="Categoria do orçamento"
                name="category_id"
                required
                defaultValue={
                  editor.item?.category_id ||
                  categories.find((c) => c.kind === "EXPENSE")?.id
                }
              >
                {data.categories
                  .filter(
                    (c) =>
                      c.kind === "EXPENSE" &&
                      (!c.archived || c.id === editor.item?.category_id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </Select>
              <Field
                label="Mês do orçamento"
                name="month"
                type="month"
                required
                defaultValue={editor.item?.month.slice(0, 7) || month}
              />
              {amountField(editor.item?.limit_cents, "Limite em reais")}
            </EntryForm>
          ) : editor.kind === "goal" ? (
            <EntryForm
              action={saveFinanceGoal}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Field
                label="Título da meta financeira"
                name="title"
                required
                defaultValue={editor.item?.title}
              />
              {amountField(editor.item?.target_cents, "Alvo em reais")}
              <Field
                label="Prazo da meta"
                name="due_on"
                type="date"
                defaultValue={editor.item?.due_on || ""}
              />
              <ObjectiveField
                objectives={context.objectives}
                areaId={context.area.id}
                value={editor.item?.objective_id}
              />
              <Select
                label="Situação da meta financeira"
                name="archived"
                defaultValue={String(editor.item?.archived || false)}
              >
                <option value="false">Ativa</option>
                <option value="true">Arquivada</option>
              </Select>
            </EntryForm>
          ) : (
            <EntryForm
              action={saveFinanceContribution}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar aporte"
            >
              <Select
                label="Meta do aporte"
                name="goal_id"
                required
                defaultValue={editor.item?.goal_id || stats.goals[0]?.id}
              >
                {data.goals
                  .filter((g) => !g.archived || g.id === editor.item?.goal_id)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
              </Select>
              {amountField(editor.item?.amount_cents)}
              <Field
                label="Data do aporte"
                name="recorded_on"
                type="date"
                required
                max={context.today}
                defaultValue={editor.item?.recorded_on || context.today}
              />
              <RemovedField />
              <p className="field-help">
                Um aporte atualiza somente a meta. Não cria receita ou despesa;
                registre uma movimentação separadamente quando necessário.
              </p>
            </EntryForm>
          )}
        </Modal>
      )}
    </DashboardFrame>
  );
}
function TransactionForm({
  context,
  data,
  item,
  onSaved,
}: {
  context: DashboardContext;
  data: FinanceData;
  item?: FinanceTransaction;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState(item?.kind || "EXPENSE");
  const categories = data.categories.filter(
    (c) => c.kind === kind && (!c.archived || c.id === item?.category_id),
  );
  return (
    <EntryForm
      action={saveFinanceTransaction}
      areaId={context.area.id}
      item={item}
      onSaved={onSaved}
      label="Salvar movimentação"
    >
      <Field
        label="Descrição da movimentação"
        name="description"
        required
        defaultValue={item?.description}
      />
      <Select
        label="Tipo da movimentação"
        name="kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
      >
        <option value="EXPENSE">Despesa</option>
        <option value="INCOME">Receita</option>
      </Select>
      <Select
        key={kind}
        label="Categoria"
        name="category_id"
        required
        defaultValue={
          categories.find((c) => c.id === item?.category_id)?.id ||
          categories[0]?.id ||
          ""
        }
      >
        <option value="">Selecione uma categoria</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </Select>
      {amountField(item?.amount_cents)}
      <Field
        label="Data da movimentação"
        name="booked_on"
        type="date"
        required
        min="1900-01-01"
        max="9999-12-31"
        defaultValue={item?.booked_on || context.today}
      />
      <Select
        label="Situação da movimentação"
        name="status"
        defaultValue={item?.status || "REALIZED"}
      >
        <option value="REALIZED">Realizado</option>
        <option value="PLANNED">Previsto</option>
      </Select>
      <RemovedField />
      <p className="field-help">
        Datas futuras exigem “Previsto”. Para dar baixa, informe a data real e
        escolha “Realizado”.
      </p>
    </EntryForm>
  );
}
