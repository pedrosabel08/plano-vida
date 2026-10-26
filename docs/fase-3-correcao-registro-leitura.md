# Correção do registro de leitura — 25/10/2026

## Causa raiz e investigação

A meta exibida na sessão real, “Ler 70 páginas por semana”, tem GoalSource **MANUAL**. A consulta ao Supabase confirmou dois GoalRecords; a interface mostrava 36/70. Não era uma meta MODULE sendo apresentada como manual.

O fluxo “Nova meta” do planejamento começa com MANUAL. O título, a unidade páginas e o nome da área não configuram a fonte. Somente a seleção explícita de Leitura ou o fluxo “Definir meta de leitura” da biblioteca chama `save_reading_goal`. Habilitar o módulo posteriormente também não converte metas existentes.

Havia ainda uma lacuna no fluxo MODULE: o botão “Registrar leitura” redirecionava para a biblioteca/detalhe em vez de abrir o formulário no planejamento. O formulário compartilhado pré-selecionava o livro, mas só bloqueava a seleção durante edição de um log, permitindo trocar o livro de uma entrada BOOK.

A lista genérica de GoalRecords era renderizada sem condicionar à fonte. Embora as constraints já impedissem novas gravações em MODULE, esse caminho visual precisava ser fechado. Não foi encontrada possibilidade de persistir GoalRecord para MODULE no banco atual: o trigger `validate_goal_record` exige MANUAL tanto para gravação direta quanto para RPC.

## Comportamento corrigido

- A decisão de registro consulta a GoalSource estruturada. MANUAL preserva “Registrar execução” e GoalRecord. MODULE/READING/PAGES_READ abre “Registrar leitura” no planejamento.
- Planejamento, biblioteca e card/detalhe reutilizam `ReadingLogForm` → `saveReadingLog` → `save_reading_log`. Sem persistência paralela ou espelho em GoalRecord.
- ALL_BOOKS lista apenas livros do proprietário e da associação da fonte. BOOK fixa o livro correto, com seleção desabilitada.
- A ação do servidor relê a fonte e valida livro, usuário e associação quando a entrada vem da meta. Alterar campos do formulário não permite trocar o escopo.
- Livro é obrigatório. Sem livros, nenhum campo de páginas ou botão de salvar é apresentado; “Adicionar livro” abre o cadastro na associação correta.
- O planejamento oferece “Nova meta de leitura” quando Leitura está habilitada. Esse fluxo inicia explicitamente como MODULE. A criação genérica continua disponível para metas manuais, com orientação sobre a fonte.
- Registros genéricos e sua edição aparecem somente para fonte MANUAL; a ação manual também rejeita outras fontes antes da RPC.

A meta real e seus dois registros foram preservados. Como já possui histórico, a regra existente do banco impede convertê-la em MODULE. Para adotar o acompanhamento por livro, crie uma nova meta de leitura; a anterior pode ser retirada do cálculo pela edição de situação. Não houve migração automática de páginas sem livro.

## Banco real e evidências

Consulta somente leitura no Supabase confirmou `reading_logs.book_id IS NOT NULL`, FK `(user_id, book_id) REFERENCES books(user_id, id) ON DELETE RESTRICT`, zero logs sem livro e zero vínculos órfãos ou com proprietário incompatível. Nenhuma migration foi necessária.

O [script transacional](../supabase/tests/reading-goal-entry.sql) criou uma conta isolada, dois livros e uma meta MODULE com alvo 70. Registrou 21 + 35 páginas pelas RPCs existentes e confirmou **56/70, 80%, 8,0/10, dois ReadingLogs e zero GoalRecords**. Uma tentativa de GoalRecord foi rejeitada. O teste terminou com ROLLBACK; consulta posterior confirmou zero usuários temporários restantes.

O percentual/nota no relatório SQL são a razão aritmética da fixture. Os E2E verificam os mesmos valores apresentados pelo motor v1 e sua atualização após salvar/recarregar.

- [Relatório do Supabase real](evidence/fase-3-fix-remote-audit.json).
- [Auditoria do banco efêmero do E2E](evidence/fase-3-fix-audit-desktop.json), com IDs dos dois livros/logs e `goal_records: []`.

| Evidência       | Desktop                                                 | Tablet                                                 | Mobile                                                 |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Modal ALL_BOOKS | [imagem](evidence/fase-3-fix-reading-modal-desktop.png) | [imagem](evidence/fase-3-fix-reading-modal-tablet.png) | [imagem](evidence/fase-3-fix-reading-modal-mobile.png) |
| Modal BOOK fixo | [imagem](evidence/fase-3-fix-book-modal-desktop.png)    | [imagem](evidence/fase-3-fix-book-modal-tablet.png)    | [imagem](evidence/fase-3-fix-book-modal-mobile.png)    |
| Sem livros      | [imagem](evidence/fase-3-fix-empty-modal-desktop.png)   | [imagem](evidence/fase-3-fix-empty-modal-tablet.png)   | [imagem](evidence/fase-3-fix-empty-modal-mobile.png)   |
| Resultado 56/70 | [imagem](evidence/fase-3-fix-result-desktop.png)        | [imagem](evidence/fase-3-fix-result-tablet.png)        | [imagem](evidence/fase-3-fix-result-mobile.png)        |

## Regressões adicionadas

- Quatro testes unitários: identificação da fonte, filtro por usuário/associação, livro específico e configuração vazia/inválida.
- Um teste de integração: schema real das migrations, NOT NULL, FK composta, rejeição de livro nulo e rastreabilidade do log.
- Um teste de integração executa o mesmo script usado remotamente e comprova rollback de todas as fixtures.
- Cinco cenários E2E, em desktop/tablet/mobile: MANUAL; ALL_BOOKS com 21+35, recálculo/reload e zero GoalRecord; BOOK com tentativa de adulteração; vazio com cadastro de livro; isolamento e rejeição de livros de outro usuário/associação.

Validação: **165 testes unitários/integração e 39/39 E2E aprovados**, incluindo as Fases 1 e 2. Build de produção, TypeScript, ESLint e formatação aprovados. As capturas anteriores foram preservadas; somente as novas evidências `fase-3-fix-*` acompanham a correção.

## Arquivos da correção

Aplicação:

- `src/features/planning/planning-workspace.tsx`
- `src/features/planning/goal-forms.tsx`
- `src/features/planning/actions.ts`
- `src/features/reading/goal-source.ts` (novo)
- `src/features/reading/reading-forms.tsx`
- `src/features/reading/reading-workspace.tsx`
- `src/features/reading/actions.ts`

Testes e documentação:

- `tests/unit/reading-goal-source.test.ts` (novo)
- `tests/integration/reading-db.test.ts`
- `tests/integration/reading-goal-entry-script.test.ts` (novo)
- `tests/e2e/reading.spec.ts`
- `tests/fixtures/supabase.mjs`
- `supabase/tests/reading-goal-entry.sql` (novo)
- Este relatório e `docs/evidence/fase-3-fix-*` (novos).

`next-env.d.ts` já estava modificado antes da correção e também é atualizado automaticamente pelas ferramentas Next.js. Não é parte da implementação funcional. Sem novas dependências, alteração de migration, publicação ou avanço para outra fase.
