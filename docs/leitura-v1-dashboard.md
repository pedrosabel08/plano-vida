# Leitura V1 — dashboard

Entrega de 25/10/2026. Referência: `assets/referencias/leitura-e-estudos.png`.

## Diagnóstico anterior à implementação

O projeto usa Next.js 16.4.2/App Router, React 19, Supabase Auth e PostgreSQL com RLS. A biblioteca já estava implementada em `/areas/[areaId]/leitura`, com detalhes em `/leitura/[bookId]`. A associação de Leitura é feita por `area_modules.id`, sem depender do nome da área.

Já existiam livros, catálogo Open Library com cadastro manual, edição/conclusão, registros por livro e data, correção/remoção lógica, proteção contra reenvios e concorrência, metas compartilhadas e o motor de desempenho v1. A tela existente organizava biblioteca, metas e histórico; não tinha os indicadores e a composição visual solicitados.

Tabelas reaproveitadas: `areas`, `profiles`, `objectives`, `weeks`, `area_weekly_plans`, `weekly_goals`, `goal_sources`, `goal_records`, `area_modules`, `books`, `reading_logs` e `external_book_references`. Serviços e operações preservados: `getReading`, `getPlanning`, `save_reading_book`, `save_reading_log`, `save_reading_goal`, normalização do planejamento e formulários compartilhados.

Não havia tabela, serviço ou interface de ações; revisão semanal/snapshots também ainda não estavam implementados neste checkout. Para atender Próximas ações foi criada a entidade compartilhada `public.actions`, utilizável por qualquer área, sem outro sistema de objetivos ou metas.

As alterações locais que já existiam em planejamento, formulários e registros de Leitura foram preservadas. As evidências anteriores foram restauradas depois dos testes; novas capturas usam o prefixo `leitura-v1-`.

## Comportamento entregue

- Cabeçalho Leitura, descrição, ícone e Definir meta. O botão edita a meta exibida; a criação de outra meta continua disponível abaixo do dashboard.
- Leitura da semana com alvo, páginas, percentual, barra limitada visualmente a 100% e sete indicadores de segunda a domingo. O percentual continua podendo ultrapassar 100%.
- A meta usa a fonte canônica MODULE/READING/PAGES_READ e o motor existente. Uma meta ALL_BOOKS tem preferência inicial; quando há várias metas ativas, é possível escolher qual aparece no resumo. Metas de livro específico mostram explicitamente seu escopo. Não se somam alvos de metas sobrepostas.
- Gráfico dos últimos 14 dias até a data atual do perfil, incluindo dias sem leitura; média = total do período / 14. Tooltip disponível por mouse, foco do teclado e toque, inclusive em dias zerados.
- Sequência por datas distintas: conta até hoje; se hoje ainda não tiver leitura, aceita uma sequência terminada ontem. Um intervalo sem leitura encerra a sequência. Registros futuros e removidos não a prolongam. A sequência não muda ao consultar outra semana.
- Frase estática e paisagem noturna vetorial local com montanhas e lua, sem dependência de imagem externa.
- Livros em andamento com capa/fallback, autor, percentual, barra, páginas restantes e detalhe. Ver todos abre a biblioteca completa e o filtro de situação; cadastro, catálogo, edição, conclusão e registro reutilizam os formulários existentes. Total desconhecido permanece explícito, sem percentual inventado.
- Próximas ações com livro opcional, objetivo compartilhado opcional, data e horário opcionais, situação, edição, conclusão e reabertura. Pendentes aparecem primeiro, em ordem de data/horário; Ver todas expande a lista.
- Ações não escrevem `reading_logs` nem `goal_records`. Leitura continua alimentando livro, meta, gráfico, média e sequência exclusivamente pelos registros canônicos.
- Estados sem livros, sem registros, sem meta, módulo desabilitado, carregamento e falha de consulta/gravação. O formulário de ações preserva os campos depois de erro.
- Áreas com Leitura habilitada abrem diretamente o dashboard; o link Planejamento da área preserva o planejamento compartilhado com `view=planning`. A navegação entre semanas mantém os parâmetros da URL.
- Dashboard em duas colunas no desktop, adaptação intermediária para tablet e empilhamento no mobile. Sidebar e navegação existentes são preservadas; os ajustes de aparência do shell são restritos ao dashboard de Leitura.

## Banco e preservação

A migration aditiva `202610250001_shared_actions.sql` foi aplicada ao Supabase de desenvolvimento já vinculado, depois do dry-run. O projeto vinculado foi conferido com a URL configurada na aplicação.

Ela cria `actions`, índice por proprietário/área/situação/data, RLS habilitada e forçada, política por `auth.uid()`, FKs de proprietário, validação de livro/objetivo da mesma área e as RPCs `get_area_actions`, `save_area_action` e `complete_area_action`. Atualizações exigem o timestamp esperado; cadastros repetidos com o mesmo ID/payload são idempotentes. Datas e horários são locais ao fuso da conta, como o planejamento semanal.

Nenhuma tabela anterior foi alterada. Antes/depois: 1 livro, 0 ReadingLogs, 2 GoalRecords, 1 meta semanal e 0 objetivos. As contas da auditoria foram temporárias e o script terminou em ROLLBACK. O histórico remoto contém as quatro migrations aplicadas. Não foi criado dado de exemplo na conta existente.

O [script SQL](../supabase/tests/shared-actions.sql) executado remotamente também é executado pelo teste de integração. Ele verifica conclusão sem páginas, isolamento entre usuários, conflito de edição e rejeição de área alheia. Veja o [registro da auditoria](evidence/leitura-v1-remote-audit.json).

## Validação e capturas

- `npm test`: **175 testes aprovados**, em 13 arquivos.
- `npm run test:e2e`: **42/42 aprovados**, incluindo autenticação/Fundação, planejamento e Leitura em desktop, tablet e mobile.
- Após os ajustes finais: **6/6 E2E aprovados** nos três tamanhos para dashboard, persistência, ações, edição e navegação compartilhada.
- `npm run lint`, `npm run typecheck`, `npm run build`, formatação dos arquivos desta entrega e `git diff --check`: aprovados.
- Auditoria PostgreSQL remota aprovada, com ROLLBACK e conferência de preservação.

| Estado               | Desktop                                              | Tablet                                              | Mobile                                              |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| Dashboard preenchido | [captura](evidence/leitura-v1-dashboard-desktop.png) | [captura](evidence/leitura-v1-dashboard-tablet.png) | [captura](evidence/leitura-v1-dashboard-mobile.png) |
| Sem dados            | [captura](evidence/leitura-v1-empty-desktop.png)     | [captura](evidence/leitura-v1-empty-tablet.png)     | [captura](evidence/leitura-v1-empty-mobile.png)     |

As capturas preenchidas usam somente fixtures persistidas no banco efêmero de testes. Elas não representam os dados da conta real. As proporções, cores, barra semanal, indicadores, gráfico, sequência, frase e listas foram conferidos visualmente com a referência; a paisagem é uma ilustração local, pois não havia o arquivo original separado no repositório.

## Arquivos desta entrega

Aplicação:

- `src/app/(protected)/areas/[areaId]/page.tsx`
- `src/app/(protected)/areas/[areaId]/leitura/page.tsx`
- `src/app/(protected)/areas/[areaId]/leitura/[bookId]/page.tsx`
- `src/app/(protected)/areas/[areaId]/leitura/loading.tsx` (novo)
- `src/app/(protected)/areas/[areaId]/leitura/error.tsx` (novo)
- `src/app/layout.tsx` (ordem dos estilos)
- `src/components/navigation/week-selector.tsx`
- `src/features/reading/reading-workspace.tsx`
- `src/features/reading/reading-overview.tsx` (novo)
- `src/domain/reading/dashboard.ts` (novo)
- `src/features/actions/types.ts` (novo)
- `src/features/actions/actions.ts` (novo)
- `src/features/actions/area-actions-card.tsx` (novo)
- `src/server/repositories/actions.ts` (novo)
- `src/types/database.ts`
- `src/styles/reading.css`
- `public/images/reading-night.svg` (novo)

Banco, testes e documentação:

- `supabase/migrations/202610250001_shared_actions.sql` (novo)
- `supabase/tests/shared-actions.sql` (novo)
- `tests/unit/reading-dashboard.test.ts` (novo)
- `tests/integration/area-actions-db.test.ts` (novo)
- `tests/integration/area-actions-script.test.ts` (novo)
- `tests/helpers/reading-db.ts`
- `tests/fixtures/supabase.mjs`
- `tests/e2e/reading.spec.ts`
- `README.md`, `docs/supabase-setup.md` e este relatório
- `docs/evidence/leitura-v1-*` (novos)

`next-env.d.ts` já estava modificado e também é atualizado automaticamente pelo Next.js; não é uma alteração funcional desta entrega. Os demais arquivos de planejamento/registro que já estavam modificados antes da tarefa não fazem parte desta refatoração.

## Limites conhecidos

- A revisão semanal e seus snapshots ainda não existem no checkout; sua implementação fica fora desta entrega. O desempenho compartilhado e as estruturas reservadas foram preservados.
- Ações recorrentes, notificações e um gerenciador global de ações não faziam parte do fluxo existente e não foram adicionados. Há uma única tabela compartilhada de ações; a primeira interface está no dashboard de Leitura.
- Metas antigas MANUAL e seus GoalRecords continuam manuais. Não são convertidas em páginas de livro, pois não informam o livro lido. Para acompanhamento automático, use Definir meta para criar uma meta de leitura e registre a leitura por livro/data.
- Open Library depende de disponibilidade externa; o cadastro manual e o fallback de capa continuam funcionais.
- O código e a migration foram entregues no repositório e no Supabase vinculado; não houve publicação de uma nova hospedagem web.
