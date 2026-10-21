# Fase 1 — Fundação

Implementação local concluída em 20/10/2026. Integração com um projeto Supabase real e login Google real permanecem pendentes de configuração externa: o usuário informou que ainda não possui projeto Supabase.

## 1. Arquivos criados/alterados

Criados: 66 arquivos de aplicação, configuração, testes, documentação e evidências. Alterados: `.gitignore` e `README.md`.

O contrato original foi preservado (hash SHA-256 conferido). Os sete mockups também foram preservados. A movimentação anterior de `assets/*.png` para `assets/referencias/*.png` já estava no Git antes desta fase e não foi feita por esta implementação.

`AGENTS.md` foi gerado automaticamente pelo próprio Next.js durante `next dev`. Não houve commit, push ou publicação.

### Inventário dos arquivos novos

- `.env.example`
- `.github/workflows/checks.yml`
- `AGENTS.md`
- `docs/decisions-v1.md`
- `docs/evidence/fase-1-desktop.png`
- `docs/evidence/fase-1-form-desktop.png`
- `docs/evidence/fase-1-form-mobile.png`
- `docs/evidence/fase-1-form-tablet.png`
- `docs/evidence/fase-1-mobile.png`
- `docs/evidence/fase-1-tablet.png`
- `docs/fase-1.md`
- `docs/supabase-setup.md`
- `eslint.config.mjs`
- `next-env.d.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(protected)/areas/page.tsx`
- `src/app/(protected)/configuracoes/page.tsx`
- `src/app/(protected)/inicio/page.tsx`
- `src/app/(protected)/layout.tsx`
- `src/app/(protected)/loading.tsx`
- `src/app/(public)/entrar/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/error.tsx`
- `src/app/layout.tsx`
- `src/app/not-found.tsx`
- `src/app/page.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/navigation/navigation.tsx`
- `src/components/privacy/privacy-provider.tsx`
- `src/components/ui/brand.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/icon.tsx`
- `src/components/ui/modal.tsx`
- `src/components/ui/page-heading.tsx`
- `src/domain/README.md`
- `src/features/areas/actions.ts`
- `src/features/areas/area-manager.tsx`
- `src/features/areas/constants.ts`
- `src/features/areas/schema.ts`
- `src/features/auth/actions.ts`
- `src/features/auth/profile-form.tsx`
- `src/features/auth/redirect.ts`
- `src/features/auth/schema.ts`
- `src/features/onboarding/actions.ts`
- `src/features/onboarding/onboarding-form.tsx`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/env.ts`
- `src/lib/supabase/server.ts`
- `src/proxy.ts`
- `src/server/repositories/account.ts`
- `src/styles/globals.css`
- `src/styles/tokens.css`
- `src/types/actions.ts`
- `src/types/database.ts`
- `supabase/config.toml`
- `supabase/migrations/202610200001_foundation.sql`
- `tests/e2e/foundation.spec.ts`
- `tests/fixtures/supabase.mjs`
- `tests/integration/foundation-db.test.ts`
- `tests/unit/foundation.test.ts`
- `tsconfig.json`
- `vitest.config.ts`

## 2. Migration

`supabase/migrations/202610200001_foundation.sql`, transacional:

- Tabelas `profiles` e `areas`.
- Perfil criado pelo trigger de Auth, com fuso America/Sao_Paulo. Contas Auth anteriores à migration também recebem perfil.
- Nenhuma área automática no signup; nenhum livro, objetivo, ação ou outro dado fictício.
- Restrições de nome, ícone, cor, ordem e integridade do proprietário.
- Ordenação única por usuário, diferível para permitir permuta atômica.
- RPCs `create_area`, `reorder_areas` e `complete_onboarding` com security invoker, controle pelo auth.uid() e RLS.
- Criação/ordenação/onboarding serializados pelo perfil do proprietário. Onboarding é idempotente e grava a seleção e a conclusão na mesma transação.
- Função de trigger de signup com security definer, search_path vazio e sem EXECUTE para clientes.

A migration foi aplicada e executada nos bancos PostgreSQL embarcados dos testes. Não foi aplicada a um Supabase hospedado, pois não há projeto real disponível. O procedimento está em [supabase-setup.md](supabase-setup.md).

## 3. Políticas RLS

RLS habilitada e forçada nas duas tabelas. Tabelas sem acesso para anon. Clientes autenticados não podem editar propriedade nem timestamps.

| Política            | Operação | Condição                                            |
| ------------------- | -------- | --------------------------------------------------- |
| profiles_select_own | SELECT   | auth.uid() = user_id                                |
| profiles_update_own | UPDATE   | proprietário anterior e posterior iguais ao usuário |
| areas_select_own    | SELECT   | auth.uid() = user_id                                |
| areas_insert_own    | INSERT   | proprietário novo igual ao usuário                  |
| areas_update_own    | UPDATE   | proprietário anterior e posterior iguais ao usuário |
| areas_delete_own    | DELETE   | auth.uid() = user_id                                |

Sem INSERT/DELETE de perfil concedidos ao cliente. INSERT de perfil ocorre pelo trigger Auth. As RPCs de aplicação não usam service-role key e só são executáveis por authenticated.

## 4. Testes realizados

| Verificação                             | Resultado                                                        |
| --------------------------------------- | ---------------------------------------------------------------- |
| TypeScript                              | Aprovado                                                         |
| ESLint                                  | Aprovado                                                         |
| Testes unitários                        | 16 aprovados                                                     |
| PostgreSQL/PGlite, migration e RLS      | 18 aprovados                                                     |
| Navegador desktop (1448 × 1086)         | 3 aprovados                                                      |
| Navegador tablet/iPad Mini (768 × 1024) | 3 aprovados                                                      |
| Navegador mobile/iPhone 13 (390 × 844)  | 3 aprovados                                                      |
| Largura estreita adicional de 320 px    | Sem overflow horizontal nos fluxos exercitados                   |
| Build de produção                       | Aprovado, Next.js 16.4.2                                         |
| Auditoria de dependências de produção   | 0 vulnerabilidades conhecidas retornadas                         |
| git diff --check                        | Aprovado                                                         |
| Smoke HTTP de produção                  | Entrada 200; quatro rotas privadas redirecionam 307 para /entrar |

Os testes de banco executam a migration real no PGlite, com papéis anon/authenticated e contrato auth.uid() de teste. Cobrem CRUD, acesso cruzado entre duas identidades, tentativas de falsificar proprietário, acesso anônimo, ordenação inválida, onboarding vazio/selecionado, idempotência e rollback.

Os E2E executam o app Next.js com um adaptador efêmero da API Supabase em `tests/fixtures`, conectado ao PostgreSQL embarcado. O adaptador é exclusivo de testes, não é importado por src/ e não fornece bypass ou rota especial na aplicação de produção. Não representa validação de OAuth contra o Google real.

Os navegadores usam Chromium/Edge com tamanhos e interação por toque emulados. Isso não substitui uma verificação futura em Safari/iOS e dispositivos físicos.

## 5. Decisões técnicas

- Next.js 16 App Router, React e TypeScript, com versões fixas e package-lock.
- Server Components para leitura/composição; Client Components para interação.
- Auth SSR com cookies, fluxo PKCE, proxy de renovação e getUser() validado; autorização novamente em cada operação de servidor.
- Rotas pessoais dinâmicas; sem cache público de dados autenticados.
- Backend normal sempre com a sessão e RLS do usuário, sem chaves administrativas.
- Áreas personalizáveis e independentes de módulos futuros. Ordem alterada por botões acessíveis e operação atômica.
- Onboarding com sugestões desmarcadas, seleção explícita e opção de começar sem áreas.
- Exclusão básica atende áreas atualmente vazias. Futuros vínculos deverão impedir exclusão de conteúdo sem política aprovada.
- CSS compartilhado e tokens semânticos; dark mode inicial e tokens preparados para light mode, sem seletor de tema claro.
- Inter servida localmente por dependência, sem download de fonte em runtime.
- Dialog nativo: modal desktop, bottom sheet mobile, foco e Escape.
- Privacidade global em memória durante a navegação. Recarregar a página restaura o estado inicial; persistência entre sessões não foi introduzida.
- ESLint 9 fixado pela compatibilidade dos plugins transitivos atuais do eslint-config-next. A atualização para ESLint 10 requer versões compatíveis desses plugins.
- CI adicionada, mas não executada no GitHub: não houve push.

As decisões funcionais aprovadas para fases posteriores estão em [decisions-v1.md](decisions-v1.md). Não foram criadas tabelas nem implementações antecipadas para elas.

## 6. Pendências externas

1. Criar projeto Supabase de desenvolvimento.
2. Aplicar a migration e conferir o esquema no projeto real.
3. Preencher .env.local com URL, chave publicável e origem coerentes.
4. Configurar Google OAuth e callbacks no Google/Supabase.
5. Executar login/logout reais com duas contas Google e verificar isolamento no ambiente conectado.
6. Configurar Vercel/domínio quando a publicação for solicitada.

## 7. Evidências

Todas as capturas autenticadas usam exclusivamente uma pessoa de teste e áreas escolhidas no onboarding do ambiente efêmero. Esses registros não existem em banco permanente.

- [Início desktop](evidence/fase-1-desktop.png)
- [Início tablet](evidence/fase-1-tablet.png)
- [Início mobile](evidence/fase-1-mobile.png)
- [Formulário desktop](evidence/fase-1-form-desktop.png)
- [Formulário tablet](evidence/fase-1-form-tablet.png)
- [Formulário mobile](evidence/fase-1-form-mobile.png)

O build de produção sem Supabase real foi servido temporariamente em http://127.0.0.1:3000 para smoke HTTP; a entrada informa indisponibilidade da conexão e não libera páginas privadas. O servidor temporário é encerrado ao terminar a verificação.

## Limite de escopo

Nenhum motor de desempenho, meta, objetivo, leitura, finanças, projetos, sono, saúde bucal, check-in, revisão, notificação, service worker ou gravação offline foi implementado. A Fase 2 aguarda aprovação.
