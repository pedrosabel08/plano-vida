# Áreas especializadas V1 — auditoria e contrato

Auditoria de 25/10/2026, antes da implementação. Leitura aprovada é a referência de qualidade e deve ser preservada, incluindo alterações locais anteriores à tarefa.

## Arquitetura e estado inicial

Next.js 16.4.2, App Router, React 19, TypeScript, Supabase SSR/Auth/PostgreSQL. Foram lidos os guias locais de Server/Client Components, mutações e page do Next instalado. Pages autenticadas carregam repositories server-only; Server Actions autenticam e validam entradas; regras puras ficam em domain; interfaces interativas em features.

Existem quatro migrations: fundação, planejamento/desempenho, Leitura e ações compartilhadas. As tabelas existentes são profiles, areas, objectives, weeks, area_weekly_plans, weekly_goals, goal_sources, goal_records, area_modules, books, reading_logs, external_book_references e actions. RLS é habilitada/forçada; FKs compostas por proprietário evitam vínculos cruzados; privilégios de coluna protegem ownership. RPCs usam security invoker e search_path vazio. Leitura usa logs canônicos, sem copiar dados para goal_records. Fonte MODULE aceita somente READING/PAGES_READ; não deve ser ampliada silenciosamente.

Estudos, Finanças, Carreira, Sono e Saúde Bucal não possuem tabelas, serviços ou dashboards especializados. As áreas sugeridas atuais incluem “Leitura e estudos”, Finanças, Carreira, Mente e pessoal e Saúde; o nome não é identidade de módulo. Objetivos têm progresso manual explícito. Revisão e snapshots ainda não existem; um botão de revisão não pode simular essa funcionalidade.

Reuso: shell, tokens dark, navegação, Modal, ProgressBar, SensitiveText, utilitários de datas/fuso, autenticação, objetivos e planejamento compartilhados, actions e suas RPCs. Não reutilizar indicadores de Leitura como se fossem universais. Não criar engine configurável de dashboards. As quatro experiências e suas rotas serão fixas, associadas explicitamente ao ID da área.

## Referências e decisões aprovadas

- Estudos: não há imagem dedicada. Aprovação nesta conversa para adaptar leitura-e-estudos.png, substituindo páginas/livros por horas/disciplinas/sessões.
- Finanças: financas.png. BRL em centavos; mês pela data local; realizado separado de compromissos futuros; metas alimentadas por aportes explícitos, nunca automaticamente pelo saldo. Sem banco conectado.
- Carreira: carreira.png. Progresso = marcos concluídos / total. Reuniões/entregas = compromissos datados. “No ritmo” exige prazo e ausência de marcos vencidos. Sem avaliação subjetiva automática. Objetivo em foco reaproveita objetivos/metas existentes.
- Saúde: sono-e-descanso.png para Sono. saude.png fornece composição, mas seu conteúdo de exercícios é expressamente excluído. Aprovação para checklist bucal configurável. Sono pertence à data de despertar, média só das noites registradas, regularidade mede variação dos horários. Consistência bucal = itens concluídos / previstos; sem recomendações clínicas.
- Imagens mente-e-pessoal.png e painel-da-semana.png não ampliam o escopo.

## Matriz de requisitos

Estado nesta auditoria: **novo** significa inexistente; **reuso** significa existente e integrado na implementação seguinte. Os detalhes aprovados acima resolvem as ambiguidades; exceções visuais devem constar no relatório final.

| Área / componente da referência      | Funcionalidade / cálculo                                                     | Fonte de dados prevista                           | Estado inicial               |
| ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| Estudos / cabeçalho, definir meta    | Meta por semana, em minutos; exibir horas                                    | Meta semanal especializada, vinculável a objetivo | Novo                         |
| Estudos / leitura da semana adaptada | Soma de sessões válidas na semana / alvo                                     | Sessões canônicas em minutos                      | Novo                         |
| Estudos / sete dias                  | Minutos por data local, segunda–domingo                                      | Sessões                                           | Novo                         |
| Estudos / últimos 14 dias            | Série com zeros explícitos; média do período / 14                            | Sessões                                           | Novo                         |
| Estudos / sequência                  | Datas distintas até hoje ou ontem; sem registros futuros                     | Sessões                                           | Novo                         |
| Estudos / disciplinas em andamento   | Cadastro, alvo em minutos, progresso por sessões                             | Disciplinas + sessões                             | Novo                         |
| Estudos / histórico                  | Cadastro, correção e remoção lógica de sessões                               | Sessões                                           | Novo                         |
| Estudos / próximas ações             | Criar, editar, concluir/reabrir; objetivo opcional                           | actions compartilhadas                            | Reuso                        |
| Finanças / hero e frase              | Composição e imagem local existentes                                         | Texto estático identificado                       | Novo / reuso de asset        |
| Finanças / receita, despesa, saldo   | Soma de realizados no mês; saldo = receita − despesa                         | Movimentações em centavos                         | Novo                         |
| Finanças / variação mensal           | Comparar mesmo tipo ao mês anterior; base zero sem percentual                | Movimentações                                     | Novo                         |
| Finanças / receita x despesa         | Barras proporcionais e série mensal                                          | Movimentações                                     | Novo                         |
| Finanças / gastos por categoria      | Soma de despesas realizadas, maior primeiro                                  | Categorias + movimentações                        | Novo                         |
| Finanças / limites                   | Orçamento por categoria e mês; consumo / limite                              | Orçamentos + movimentações                        | Novo; complemento solicitado |
| Finanças / metas                     | Alvo e soma de aportes explícitos; objetivo opcional                         | Metas + aportes                                   | Novo                         |
| Finanças / compromissos              | Previsto separado de realizado, dar baixa explícita                          | Movimentações previstas + actions                 | Novo / reuso                 |
| Carreira / hero, no ritmo            | Projetos ativos com prazo, sem marco vencido; sem prazo fora do denominador  | Projetos + marcos                                 | Novo                         |
| Carreira / reuniões da semana        | Reuniões concluídas / previstas na semana                                    | Compromissos                                      | Novo                         |
| Carreira / entregas do mês           | Entregas concluídas / previstas no mês                                       | Compromissos                                      | Novo                         |
| Carreira / horas de estudo           | Sessões da área de Estudos explicitamente vinculadas a Carreira              | Sessões + vínculo de projeto                      | Novo; sem inferir vínculo    |
| Carreira / projetos ativos           | Contagem de projetos de trabalho ativos                                      | Projetos                                          | Novo                         |
| Carreira / trabalho atual            | Projetos, tarefas/marcos, progresso por contagem                             | Projetos + marcos                                 | Novo                         |
| Carreira / desenvolvimento pessoal   | Competências e iniciativas com marcos; sem nota subjetiva                    | Iniciativas + marcos                              | Novo                         |
| Carreira / objetivo em foco          | Objetivo compartilhado escolhido explicitamente                              | objectives                                        | Reuso                        |
| Carreira / histórico e conquistas    | Marcos e compromissos concluídos com datas                                   | Marcos + compromissos                             | Novo                         |
| Carreira / revisão                   | Não existe fluxo de revisão/snapshot; não simular botão operacional          | Ausente                                           | Exceção a documentar         |
| Carreira / próximas ações            | Operações compartilhadas                                                     | actions                                           | Reuso                        |
| Sono / gráfico semanal               | Duração real entre instantes; data de despertar no fuso do perfil            | Registros de início/fim                           | Novo                         |
| Sono / meta e média                  | Meta configurável; média só de noites registradas com cobertura              | Configuração + registros                          | Novo                         |
| Sono / noites com 7h ou mais         | Contar noites registradas com duração ≥ 420 minutos                          | Registros                                         | Novo                         |
| Sono / energia ao acordar            | Autoavaliação explícita opcional 1–5                                         | Registro, sem inferência                          | Novo                         |
| Sono / regularidade                  | Variação dos horários locais, tratar virada da meia-noite                    | Registros                                         | Novo                         |
| Sono / rituais                       | Checklist configurável, sem prescrição                                       | Rotinas e cumprimentos diários                    | Novo                         |
| Saúde Bucal / rotinas                | Itens configuráveis pelo usuário e data de início/fim                        | Rotinas                                           | Novo; adaptação aprovada     |
| Saúde Bucal / consistência           | Cumprimentos / itens previstos no intervalo; ausências contam como pendentes | Rotinas + cumprimentos                            | Novo                         |
| Saúde Bucal / histórico              | Calendário e gráfico semanal, sem alterar semanas passadas ao arquivar item  | Rotinas + cumprimentos                            | Novo                         |
| Saúde / próximas ações               | Somente contexto de Sono/Bucal                                               | actions                                           | Reuso                        |

## Plano de execução e validação

Ordem: Estudos → Finanças → Carreira → Saúde. Cada fase adiciona estruturas próprias com RLS, operações e domínio puro; depois interface, integração e testes antes de avançar. Nenhuma mudança destrutiva nem publicação em produção é autorizada. Migrations anteriores não serão reescritas. Associações por ID, sem migração automática por nome.

Validar precisão monetária, limites de datas, fusos/virada do dia, ausência versus zero, duplicação/reenvio, concorrência, isolamento entre usuários e áreas e preservação de Leitura. Integração PostgreSQL com PGlite exercita SQL/RLS real em banco efêmero; E2E usa adapter HTTP somente de testes, nunca dados fictícios na aplicação. Capturas de fixtures devem ser identificadas e separadas das evidências aprovadas. Validação remota deve conferir o projeto vinculado e aplicar apenas migrations aditivas após dry-run.

Linha de base: `npm.cmd test` — 175 testes em 13 arquivos aprovados. E2E e checks estáticos em execução no início da implementação; resultados finais ficam no relatório de entrega.

## Resultado da execução

Os componentes da matriz foram implementados nas quatro interfaces especializadas e suas fontes reais. A revisão de Carreira recebeu diário próprio persistido; a revisão semanal global/snapshots permanece fora do escopo. Estudos integra a meta semanal compartilhada por fonte canônica; objetivos e ações são reaproveitados nas quatro áreas. As seis migrations novas estão aplicadas no desenvolvimento, com auditorias de isolamento e preservação. Contratos de cálculo, exceções visuais, capturas e resultados finais estão em [areas-v1-entrega.md](areas-v1-entrega.md).
