# Plano de Vida

Sistema pessoal Plano de Vida — Fundação e planejamento semanal. Next.js App Router + TypeScript + Supabase Auth/PostgreSQL. Tema inicial escuro, interface responsiva e isolamento por usuário.

## Executar

Requisitos: Node.js 22.12+ (validado com Node 24), npm e um projeto Supabase para autenticação/persistência reais.

1. Execute `npm ci`.
2. Copie `.env.example` para `.env.local` e configure URL Supabase, chave **publicável** e origem do app. Não use uma service-role key.
3. Aplique as migrations, em ordem, em um projeto de desenvolvimento conforme [configuração](docs/supabase-setup.md).
4. Habilite Google no Supabase e configure as URLs de retorno.
5. Execute `npm run dev` e abra http://127.0.0.1:3000. Use a mesma origem configurada em NEXT_PUBLIC_APP_URL para iniciar e concluir OAuth.

Sem configuração Supabase, a aplicação apresenta a entrada com autenticação indisponível. Não existe modo de demonstração nem bypass de autenticação na aplicação.

## Comandos

| Comando             | Finalidade                                              |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Desenvolvimento local                                   |
| `npm run build`     | Build de produção                                       |
| `npm start`         | Servir o build                                          |
| `npm run typecheck` | Verificação TypeScript                                  |
| `npm run lint`      | ESLint                                                  |
| `npm test`          | Testes unitários e PostgreSQL embarcado                 |
| `npm run test:e2e`  | Fluxos reais de navegador com backend efêmero de testes |

E2E usa Edge instalado no Windows; em Linux/macOS, execute `npx playwright install chromium`. As portas 3100 e 54329 precisam estar livres. Não usa o Supabase hospedado. O build de testes usa `.next-e2e` para coexistir com o servidor local de desenvolvimento. O teste transacional `supabase/tests/planning-rls.sql` valida o PostgreSQL real, com fixtures temporárias e ROLLBACK.

## Entregue na Fase 1

- Auth Google, callback PKCE, renovação de sessão e saída.
- Perfil, fuso editável (inicial America/Sao_Paulo) e onboarding sem dados fictícios.
- Áreas: criação, consulta, edição, exclusão, ícone, cor e ordem.
- AppShell, sidebar, header, navegação mobile, estados vazios e formulário responsivo.
- Tokens semânticos, dark mode e fronteira de tema preparada para light mode.
- RLS, restrições, operações atômicas e testes de isolamento.
- Estado global de privacidade em memória durante a navegação autenticada.

## Entregue na Fase 2

- Objetivos qualitativos, quantitativos e percentuais, com progresso manual.
- Semanas explícitas no fuso do usuário e planejamento por área.
- Metas de quantidade, frequência, média e conclusão; registros manuais e correções.
- Motor puro v1 com aritmética racional, desempenho por área/semana e composição explicável.
- Percentual individual acima de 100%, contribuição agregada limitada por meta.
- Navegação entre semanas e dashboard responsivo.

Módulos especializados, ações, revisão/snapshots, notificações e gravação offline permanecem para fases posteriores.

## Arquitetura

- `src/app`: rotas e composição; todas as rotas pessoais são dinâmicas e autenticadas.
- `src/features`: recursos (auth, onboarding, áreas, objetivos e planejamento).
- `src/components`: primitivas, layout, navegação e privacidade.
- `src/server`: acesso a dados no servidor, sempre com sessão do usuário.
- `src/lib`: Supabase e infraestrutura compartilhada.
- `src/domain`: motor puro e versionado de desempenho.
- `supabase/migrations`: mudanças versionadas de esquema e políticas.
- `tests`: validação, integração e navegador. Fixtures não são importadas pela aplicação.

Consulte [decisões aprovadas](docs/decisions-v1.md), [configuração Supabase](docs/supabase-setup.md) e [relatório da Fundação](docs/fase-1.md) e [relatório da Fase 2](docs/fase-2.md).
