# Configuração Supabase

## Ambiente remoto de desenvolvimento

1. Crie um projeto Supabase próprio para desenvolvimento.
2. Preencha localmente `.env.local` a partir de `.env.example` com a Project URL e a publishable key. NEXT_PUBLIC_APP_URL deve ser a origem usada no navegador (por exemplo http://127.0.0.1:3000).
3. Revise e aplique `supabase/migrations/202610200001_foundation.sql` no SQL Editor do projeto vazio. O arquivo abre e confirma sua própria transação. Alternativamente, use a CLI Supabase para vincular o projeto e aplicar migrations com `supabase db push`.
4. Não misture aplicação manual com histórico CLI sem reconciliar o histórico de migrations. Prefira CLI no fluxo contínuo da equipe. Não execute novamente uma migration já aplicada; faça nova migration para mudanças futuras.
5. Cadastre em Auth > URL Configuration o Site URL e o Redirect URL completo do app: `http://127.0.0.1:3000/auth/callback`. Adicione separadamente localhost se também for utilizá-lo. Em produção, use HTTPS e uma origem fixa.
6. Configure o OAuth Client do Google, consentimento e usuários de teste quando aplicável. O Authorized redirect URI do Google é o callback do **Supabase**, informado no painel (normalmente `https://<project-ref>.supabase.co/auth/v1/callback`); não o callback do Next.js.
7. Habilite Google no Supabase e informe Client ID e Client Secret apenas no painel/ambiente apropriado. O app não recebe nem precisa do Google Client Secret.
8. Entre por Google e verifique criação do perfil, onboarding, criação/edição/ordem/exclusão das áreas, perfil/fuso e logout. Repita com duas contas distintas.

## Supabase local, opcional

A configuração está em `supabase/config.toml`, sem seed. CLI e Docker não são dependências da aplicação e precisam estar instalados para esse caminho.

- `supabase start`
- `supabase db reset` **somente no ambiente local descartável**
- Use URL e chave publicável locais em `.env.local`.

Google local permanece desabilitado por padrão até você fornecer e configurar as credenciais externas. Não há provider falso em produção.

## Esquema e políticas

- `profiles`: criado pelo trigger de Auth; SELECT e UPDATE somente do proprietário. Colunas de identidade/criação não podem ser alteradas pelo cliente. Sem INSERT/DELETE de perfil expostos ao usuário.
- `areas`: SELECT/INSERT/UPDATE/DELETE somente do proprietário. Ownership e timestamps não podem ser editados pelo cliente. Cores, nomes, ícones e ordem têm restrições no banco.
- RLS habilitada e forçada. Sem permissões de tabela para anon.
- `create_area`, `reorder_areas`, `complete_onboarding`: security invoker, executáveis apenas por authenticated e sempre sob RLS. Serializam pelo perfil do usuário para proteger criação e ordenação.
- `handle_new_user`: única função security definer; função de trigger com search_path vazio e sem EXECUTE concedido aos clientes. Cria somente o perfil do novo auth.users.id.
- A migration também cria perfis para contas Auth que já existam, sem criar áreas.

## Evolução

A Fase 2 adiciona objetivos, semanas, planos, metas, fontes e registros com FKs RESTRICT. Áreas com vínculos não podem ser excluídas; metas podem ser retiradas do cálculo. Não há exclusão destrutiva de histórico.

Os tipos em `src/types/database.ts` refletem as migrations aplicadas e os DTOs que preservam números como texto. A geração da CLI pode ser usada para conferir o esquema; não substitua os DTOs de RPC sem revisar a precisão numérica.

## Evolução contínua — Fase 2

Preserve `202610200001_foundation.sql`. A nova migration é `202610200002_planning_performance.sql`. No projeto já vinculado, depois dos testes locais:

```sh
supabase migration list
supabase db push --dry-run
supabase db push --yes
supabase db query --linked --file supabase/tests/planning-rls.sql
supabase migration list
```

O teste SQL insere duas contas temporárias, usa os papéis authenticated/anon e termina em ROLLBACK. Não autentica via Google nem modifica contas existentes. Nunca execute db reset no projeto hospedado. Resultado desta execução documentado em `fase-2.md`.

## Fontes técnicas

- [SSR Supabase/Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Fase 3 — Leitura

A migration 202610200003_reading_module.sql evolui GoalSource e cria o módulo Leitura. Preserve 001/002; não reexecute alterações manualmente após db push. O relatório `fase-3.md` registra a aplicação e os testes.

```sh
supabase db push --dry-run
supabase db push --yes
supabase migration list
supabase db query --linked --file supabase/tests/reading-rls.sql
```

O teste SQL usa BEGIN/ROLLBACK. O runner opcional `node tests/remote/reading-concurrency.mjs` executa transações realmente sobrepostas via CLI: usa uma conta transitória marcada, precisa confirmar fixtures para compartilhá-las entre conexões e remove somente seus dados em finally, verificando a limpeza. Ele não faz parte de npm test nem da aplicação, e nunca usa db reset hospedado. Execute somente em projeto de desenvolvimento/testes explicitamente autorizado.

Open Library não exige chave para a busca pública desta integração. BOOK_CATALOG_CONTACT opcional identifica um contato público do app, apenas no servidor. Não use dados pessoais do usuário ou segredos nesse campo. Cadastro manual permanece disponível sem essa configuração.

## Dashboard de Leitura V1 — ações compartilhadas

A migration aditiva `202610250001_shared_actions.sql` cria `public.actions`, compartilhada entre áreas, com RLS por proprietário e vínculo opcional a livro/objetivo. Nenhuma tabela anterior é modificada. Foi aplicada ao projeto de desenvolvimento vinculado nesta entrega.

Em outro ambiente, confira o histórico e aplique somente migrations pendentes:

```sh
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked --yes
supabase db query --linked --file supabase/tests/shared-actions.sql
```

O script de auditoria cria duas contas temporárias dentro de BEGIN/ROLLBACK. Ele verifica conclusão sem páginas, isolamento por proprietário, conflito de edição e vínculo inválido. O [relatório de entrega](leitura-v1-dashboard.md) contém a validação e as evidências.

## Áreas especializadas V1

Aplicar, em ordem, as migrations aditivas `202610250002_studies.sql`, `202610250003_finances.sql`, `202610250004_career.sql`, `202610250005_health.sql`, `202610250006_dashboard_preferences.sql` e `202610250007_specialized_date_guards.sql`. Todas já estão aplicadas no desenvolvimento vinculado. Não reescrever migrations aplicadas nem executar reset hospedado.

Estudos amplia a associação de módulos com STUDIES e a fonte canônica MINUTES_STUDIED, preservando READING/PAGES_READ. Finanças mantém centavos inteiros; Carreira usa marcos verificáveis; Saúde mantém instantes/fuso da noite e agenda histórica de rotinas. Há 17 tabelas novas com RLS habilitada e forçada, sem acesso anon, exclusão de histórico ou edição de ownership pelo cliente.

O runner explícito `node tests/remote/specialized-audit.mjs` confere URL/projeto vinculado, executa dry-run, aceita somente os nomes de migrations desta entrega, aplica pendências e executa `supabase/tests/specialized-areas.sql` e a regressão SQL de Leitura. Fixtures sempre terminam em ROLLBACK; contagens das tabelas existentes são comparadas antes/depois. Execute apenas no desenvolvimento autorizado. As evidências originais e a verificação adicional de datas ficam em `docs/evidence/areas-v1-remote-audit.json` e `areas-v1-hardening-audit.json`.

O adaptador `tests/fixtures/supabase.mjs` continua exclusivamente local e efêmero. Ele carrega todas as migrations para integração/E2E e nunca é importado pela aplicação. `PLANO_VIDA_REUSE_TEST_SERVERS=1` permite ao Playwright reutilizar os dois servidores de teste iniciados separadamente; por padrão a suíte inicia servidores isolados e não reutiliza processos.
