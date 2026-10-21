# Fase 2 — Planejamento e motor de desempenho

Implementação limitada ao núcleo genérico. Fluxo entregue: escolher semana → criar objetivo/meta → registrar execução manual → calcular meta → agregar área → agregar semana → abrir composição. A Fundação e sua migration aplicada foram preservadas. Nenhum módulo especializado, ação, revisão, snapshot ou notificação foi antecipado.

## Modelo final

| Entidade          | Campos centrais                                                            | Relações e invariantes                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| objectives        | título, tipo, alvo/progresso/unidade opcionais, prazo, estado, timestamps  | proprietário obrigatório; área opcional; qualitativo sem números; percentual 0–100; quantitativo com alvo positivo e progresso não negativo; progresso manual |
| weeks             | início/fim civil, fuso, início UTC, fim UTC exclusivo                      | única por usuário/data da segunda; fuso copiado do perfil; período imutável                                                                                   |
| area_weekly_plans | usuário, semana, área, estado                                              | único por área/semana; PLANNED quando possui meta ativa, UNPLANNED caso contrário                                                                             |
| weekly_goals      | título, tipo, alvo, unidade, base, modo de frequência, cobertura, estado   | plano/semana/área coerentes por FK composta; objetivo opcional da mesma área ou sem área; sem pesos                                                           |
| goal_sources      | usuário, meta, kind                                                        | exatamente uma fonte canônica automática por meta; somente MANUAL habilitada                                                                                  |
| goal_records      | usuário, meta/tipo, data, valor ou conclusão, operation_id, remoção lógica | data dentro da semana; valores não negativos; frequência inteira; uma média por dia e uma conclusão ativa por meta                                            |

Todas as entidades têm ownership explícito. FKs compostas com user_id impedem cruzar proprietários, inclusive por chamadas diretas à API. Todas as novas relações usam ON DELETE RESTRICT. Não há DELETE de semana/plano/meta/fonte/registro para clientes. Objetivos sem vínculos podem ser excluídos. Uma meta pode ser retirada do cálculo sem apagar o histórico; remover registro é uma correção lógica operacional.

### Semana e timezone

Identidade persistente: (user_id, start_date), sem depender do número ISO da semana. A segunda é validada pelo banco. O intervalo temporal é [segunda 00:00, próxima segunda 00:00), incluindo todo o domingo e suas frações de segundo. end_date guarda o domingo civil; ends_at_exclusive guarda o limite UTC exclusivo.

A criação deriva o fuso diretamente do perfil. Clientes não escolhem timestamps de contexto nem podem alterá-los. O fuso da semana existente permanece estável após editar o perfil; semanas novas usam o novo fuso. Há teste de transição de horário de verão, com semana de 167 horas. Abrir páginas não cria semanas vazias: a primeira meta cria semana e plano atomicamente.

### Objetivos e metas

Objetivo de médio/longo prazo tem progresso independente, atualizado manualmente. Não se infere progresso a partir das metas. Uma meta pode vincular um objetivo da própria área ou um objetivo global. Mover um objetivo que invalidaria vínculos existentes é rejeitado.

Metas QUANTITY/FREQUENCY podem usar alvo semanal ou diário; diário significa alvo × 7 para aquela semana, nunca pelos dias restantes. A interface explicita essa base. AVERAGE e COMPLETION usam base semanal. Tipo, unidade, base e modo de frequência ficam protegidos após qualquer registro, inclusive removido. Alvo/título/vínculo/cobertura continuam editáveis e recalculam o resultado operacional.

Frequência usa unidade definida pelo usuário e modo explícito: ocorrências soma inteiros; dias distintos conta datas diferentes com registro de valor 1, com alvo efetivo até sete. Não se deduz o modo apenas pelo texto da unidade.

Média manual aceita uma observação por dia. Cobertura esperada é configurável entre 1 e 7, com rótulo próprio, padrão dias. Há edição da observação existente para corrigir uma data. A quantidade observada pode superar a esperada; a cobertura informa o fato sem alterar a performance. Isso é um limite do adapter manual desta fase; módulos futuros poderão normalizar suas próprias unidades/observações por contrato explícito.

## Motor puro v1

Arquivos em src/domain/performance. Não depende de React, DOM, Supabase ou locale. Entradas normalizadas contêm tipo/alvo/base/configuração, origem canônica, estado e observações. Saída contém versão, estado, realizado/alvo, percentual real, contribuição, nota, cobertura, motivo quando aplicável e valores exatos serializáveis.

- QUANTITY: realizado = soma dos valores.
- FREQUENCY: realizado = ocorrências somadas ou dias distintos, conforme configuração.
- AVERAGE: realizado = soma / número de observações existentes. Sem observações: INSUFFICIENT_DATA, média nula e cobertura zero.
- COMPLETION: false/ausente = 0; true = 1; alvo 1. Resultado binário.
- rawPercent = actual / effectiveTarget × 100.
- contributionPercent = min(rawPercent, 100).
- score = contributionPercent / 10.
- Área = média das contribuições de suas metas calculáveis, com pesos iguais.
- Semana = média das áreas calculáveis, com pesos iguais, independentemente da quantidade de metas por área.

**Percentual exibido != contribuição agregada quando maior que 100%.** Exemplo: 100/70 = 142,857…%, exibido 143%; contribuição 100%; nota 10,0. Meta A em 200% e Meta B em 0% resultam em área 50%, nota 5,0. O detalhamento preserva os 200% da Meta A.

Aritmética racional com numerador/denominador BigInt reduzidos mantém somas, médias e agregações sem arredondamento intermediário. Os dados NUMERIC do PostgreSQL chegam aos DTOs como texto. O campo exact usa strings e pode ser serializado; os campos number aproximados são conveniências para gráficos, nunca entradas da próxima agregação. A UI usa as frações para formatação half-up: nota com uma casa, percentual com até duas casas (superação com inteiro), cobertura inteira e valores medidos com até quatro casas. A apresentação de valores não muda o cálculo.

Estados: CALCULABLE, NO_GOALS, INSUFFICIENT_DATA, INVALID e EXCLUDED. Sem meta não recebe zero. Quantidade/frequência sem registros e conclusão pendente são zero calculável; média sem registros é ausência de dados. Agregados ignoram resultados não calculáveis e explicam a composição incompleta. IDs repetidos de registro/meta/área são rejeitados para evitar dupla contagem. Configuração inconsistente não vira nota zero.

O adapter MANUAL consulta somente goal_records ativos da fonte canônica. MODULE/ACTION são discriminantes reservados, sem implementação. ReadingLog ou outro módulo futuro deverá ser consultado diretamente por um adapter: não copiar registros especializados para goal_records nem somar conclusão de ação à mesma medição.

## Migration, RLS e APIs

Nova migration: 202610200002_planning_performance.sql. A 202610200001_foundation.sql não foi editada nesta fase. A nova migration cria as seis tabelas, índices, constraints, triggers e cinco RPCs públicas de aplicação.

| Recurso           | SELECT  | INSERT                | UPDATE                      | DELETE                      |
| ----------------- | ------- | --------------------- | --------------------------- | --------------------------- |
| objectives        | próprio | próprio               | próprio, colunas funcionais | próprio, sujeito a RESTRICT |
| weeks             | próprio | próprio, início civil | sem grant                   | sem grant                   |
| area_weekly_plans | próprio | próprio               | somente estado coerente     | sem grant                   |
| weekly_goals      | próprio | próprio               | colunas funcionais          | sem grant                   |
| goal_sources      | próprio | próprio, MANUAL       | sem grant                   | sem grant                   |
| goal_records      | próprio | próprio               | medição/data/remoção lógica | sem grant                   |

RLS habilitada e forçada nas seis tabelas. Policies usam auth.uid() = user_id em USING/WITH CHECK. Colunas de identidade, proprietário, contexto e timestamps são protegidas por grants específicos. anon não tem acesso. Índices atendem ownership, vínculos de semana/área/objetivo e busca por meta/data, além das unicidades.

RPCs security invoker, search_path vazio, executáveis por authenticated e sujeitas à RLS:

- ensure_planning_week: cria ou encontra a semana de forma idempotente.
- save_weekly_goal: transação de semana/plano/meta/fonte ou edição com comparação de updated_at.
- save_goal_record: registro manual com chave de operação idempotente e edição com comparação de updated_at.
- list_objectives / get_planning_data: leitura com números como texto para preservar precisão.

Triggers mantêm fonte canônica e estado do plano, validam datas/vínculos/configuração e atualizam timestamps. RPCs de registro serializam pela meta. Repetir a mesma operação manual não soma novamente; reutilizar sua chave para outro conteúdo é rejeitado. As operações normais usam a sessão do usuário; não há chave administrativa no browser ou nos handlers.

## UI e arquivos desta fase

Rotas /inicio, /planejamento, /objetivos e /areas/[areaId]. Navegação entre semanas por botões e data; semana atual usa o fuso do perfil. Cards mostram realizado/alvo, percentual real, contribuição, nota e cobertura. Composição expande os títulos e contribuições das metas e explica a média; dashboard explica a média simples das áreas. Formulários reutilizam o Modal e tokens da Fundação. Layout de cards e navegação adapta-se a desktop, tablet e mobile.

### Criados

- src/domain/performance/{fraction,types,engine}.ts
- src/lib/dates/weeks.ts; src/lib/formatting/performance.ts
- src/features/planning/{types,schema,normalize,actions}.ts
- src/features/planning/{goal-forms,planning-workspace,weekly-dashboard}.tsx
- src/features/objectives/objective-manager.tsx
- src/server/repositories/planning.ts
- src/components/data/performance.tsx; src/components/navigation/week-selector.tsx
- src/app/(protected)/{planejamento,objetivos}/page.tsx
- src/app/(protected)/areas/[areaId]/page.tsx
- src/styles/planning.css
- supabase/migrations/202610200002_planning_performance.sql
- supabase/tests/planning-rls.sql
- tests/unit/performance.test.ts
- tests/integration/{planning-db,planning-rls-script}.test.ts
- tests/helpers/session.ts; tests/e2e/planning.spec.ts
- docs/fase-2.md; docs/evidence/fase-2-*.png

### Alterados

- src/app/(protected)/inicio/page.tsx; src/app/layout.tsx
- src/components/navigation/nav-links.tsx; src/features/areas/area-manager.tsx
- src/types/database.ts; src/domain/README.md
- tests/fixtures/supabase.mjs; playwright.config.ts
- next.config.ts; tsconfig.json; eslint.config.mjs; .gitignore
- README.md; docs/decisions-v1.md; docs/supabase-setup.md

A configuração E2E usa .next-e2e para coexistir com o servidor de desenvolvimento do usuário. Os testes de regressão da Fundação também atualizam suas capturas. Não houve dependências novas, commits ou publicação. Os mockups em assets/referencias e o contrato funcional não foram alterados; sua reorganização já existia antes desta fase.

## Verificações e evidências

Validação final executada em 20/10/2026:

| Verificação              | Resultado                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Vitest completo          | 107 testes aprovados: 44 do motor, 16 da Fundação, 28 de banco da Fase 2, 18 de banco da Fundação e 1 do script remoto exato |
| Playwright               | 15/15 aprovados: 5 cenários por desktop/tablet/mobile                                                                        |
| PostgreSQL Supabase real | 38 asserções aprovadas no script transacional; consulta posterior confirmou zero usuários temporários restantes              |
| TypeScript               | tsc --noEmit aprovado                                                                                                        |
| ESLint                   | aprovado, sem avisos                                                                                                         |
| Produção                 | next build aprovado, novas rotas pessoais dinâmicas                                                                          |
| Banco remoto             | supabase db lint --linked --level warning: No schema errors found                                                            |

Ordem remota cumprida: testes → apresentação da migration → db push --dry-run → db push --yes → teste SQL com ROLLBACK → verificação de limpeza e histórico. O dry-run listou somente 202610200002_planning_performance.sql; a aplicação concluiu sem seeds/roles/reset. migration list confirmou 202610200001 e 202610200002 presentes localmente e remotamente.

A fixture de navegador usa PostgreSQL embarcado efêmero com as migrations reais e sessão de teste; fica exclusivamente em tests, sem bypass na aplicação. A autenticação Google e isolamento entre duas contas reais da Fundação foram informados pelo usuário como já validados remotamente. A Fase 2 não simula uma nova validação do consentimento Google.

O script supabase/tests/planning-rls.sql usa duas contas temporárias dentro de BEGIN/ROLLBACK no PostgreSQL real. Exercita os papéis authenticated/anon, isolamento de todas as entidades, FKs, constraints e grants. Não reseta banco hospedado nem remove dados existentes.

Evidências automatizadas geradas e inspecionadas: 56/70 = 80% e 8,0, superação individual 200% com área 50%, e dashboard após reload. Capturas em desktop 1448×1086, tablet 768×1024 e mobile 390×844, com emulação Chromium/Edge. Não equivalem a teste físico de iPad/iPhone ou Safari.

| Cenário               | Desktop                                          | Tablet                                          | Mobile                                          |
| --------------------- | ------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------- |
| 56/70 = 80%, nota 8,0 | [imagem](evidence/fase-2-80-percent-desktop.png) | [imagem](evidence/fase-2-80-percent-tablet.png) | [imagem](evidence/fase-2-80-percent-mobile.png) |
| 200% + 0% = área 50%  | [imagem](evidence/fase-2-superacao-desktop.png)  | [imagem](evidence/fase-2-superacao-tablet.png)  | [imagem](evidence/fase-2-superacao-mobile.png)  |
| Dashboard após reload | [imagem](evidence/fase-2-dashboard-desktop.png)  | [imagem](evidence/fase-2-dashboard-tablet.png)  | [imagem](evidence/fase-2-dashboard-mobile.png)  |

## Decisões, diferenças e próximos limites

- Modelo manteve a arquitetura aprovada; as escolhas de fuso congelado por semana, uma média manual por dia, limites de edição de configuração e remoção lógica foram detalhadas para proteger o histórico operacional.
- Aritmética racional foi escolhida para cumprir ausência de arredondamento intermediário sem dependência nova. Resultados contêm a versão v1 e frações serializáveis, preparando snapshots futuros sem implementá-los.
- Dados operacionais podem ser corrigidos e recalculados. Uma futura revisão deverá persistir uma cópia independente do resultado e contexto no instante de conclusão; nunca uma consulta viva a essas tabelas.
- Próxima fase deverá definir contratos próprios dos módulos e migração explícita da fonte MANUAL para MODULE, preservando a unicidade da fonte e sem copiar dados para um espelho genérico.
- Objetivos continuam com progresso manual; não há sincronização implícita com metas.
- Metas retiradas e planos antigos preservam vínculos; exclusão/arquivamento definitivo de áreas com histórico exige decisão de produto futura.
- Não há offline, snapshots, notificações, ações ou módulos. Saúde continua planejada exclusivamente com Sono e Saúde bucal; nenhum treino foi criado.
- O plano não foi ampliado para Fase 3. Os testes de navegador usam backend efêmero; o PostgreSQL remoto recebe testes específicos de RLS e integridade transacionais.
