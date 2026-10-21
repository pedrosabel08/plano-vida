# Fase 3 — Leitura e estudos

Primeira vertical especializada entregue: biblioteca → registro de páginas → progresso derivado → fonte MODULE → adapter → engine v1 → área → semana → dashboard. O cadastro e a leitura funcionam sem catálogo externo. Nenhum módulo ou funcionalidade de fase posterior foi antecipado.

## Modelo final

| Entidade                 | Dados principais                                                                                                                                              | Relações e regras                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| area_modules             | id, proprietário, area_id, module=READING, enabled, timestamps                                                                                                | associação explícita por identidade, única por usuário/área/módulo; só Leitura habilitada nesta fase                                   |
| books                    | id interno, proprietário, area_module_id, título, autores[], total_pages opcional, initial_tracking_page, cover_url, ISBN-10/13 opcionais, status, timestamps | FK composta com proprietário; metadados editáveis; nenhuma current_page persistida                                                     |
| reading_logs             | id, proprietário, book_id, read_on, pages, operation_id, is_deleted, timestamps                                                                               | páginas inteiras positivas; idempotência por proprietário/operação; correção e remoção lógica; livro/contexto imutáveis para o cliente |
| external_book_references | id, proprietário, book_id, provider, external_id, looked_up_at, imported_at, metadata                                                                         | origem de importação independente do livro; metadados mínimos, sem resposta bruta do provider; FK composta                             |
| goal_sources — evolução  | kind, module, metric, scope, area_module_id, book_id                                                                                                          | uma fonte por meta; MANUAL ou MODULE/READING/PAGES_READ; ALL_BOOKS ou BOOK explícito                                                   |

As áreas permanecem livres. Uma área chamada Minha biblioteca pode habilitar Leitura, e renomear a área não altera a associação. É possível habilitar Leitura em mais de uma área; cada associação possui sua biblioteca. ALL_BOOKS significa todos os livros daquela associação, não livros de outras áreas.

Autores usam text[], sem tabela própria ou normalização de catálogo de pessoas. Status: WANT_TO_READ (Quero ler), READING (Lendo), FINISHED (Concluído), ABANDONED (Abandonado). Não há status extra.

## Progresso e correções

currentPage = initialTrackingPage + soma dos pages de ReadingLogs não removidos.

Exemplo: página inicial 40, logs 10+15+20 → página atual 85. Em um livro de 320 páginas, o progresso é 26,5625%, apresentado como 26,56%. O valor atual é uma projeção de leitura da fonte canônica, calculada no banco; não existe uma coluna editável ou um cache persistido de posição.

Página inicial 120 em um livro de 300 não soma 120 à semana. Somente os logs datados na semana alimentam a meta. O cadastro não cria ReadingLog inicial artificial.

Total desconhecido é permitido, sem percentual inventado. Total conhecido deve ser positivo e cobrir a página inicial e o progresso derivado. Registrar/corrigir além do total é rejeitado, nunca truncado. Alterar totalPages ou página inicial também precisa preservar a posição derivada. A capacidade técnica é limitada ao inteiro positivo do PostgreSQL, até 2.147.483.647 páginas; valores inválidos são rejeitados também na entrada.

Correções editam páginas/data ou removem logicamente o log, preservando identidade e timestamps. Podem modificar resultados operacionais retroativos. Remover não faz o histórico desaparecer fisicamente. Não há valores negativos para compensar erros: edite o registro original.

Quando a posição alcança o total, a UI oferece Marcar como concluído, abrindo edição com status Concluído para confirmação por Salvar livro. Não muda status silenciosamente. O status continua sendo uma decisão explícita; uma correção posterior não reescreve status automaticamente nem impede consulta ao histórico.

## Contrato do adapter MODULE

Fluxo de dados:

ReadingLog → readingObservations → NormalizedGoal → calcularDesempenhoMeta → calcularDesempenhoArea → calcularDesempenhoSemana.

O adapter recebe WeeklyGoal, GoalSource estruturada, início civil da Week, livros, logs e associações de módulo já isolados pelo repositório/RLS. Valida a configuração READING/PAGES_READ e QUANTITY/páginas; seleciona livros da associação e, opcionalmente, o book_id explícito; filtra logs ativos no intervalo [segunda, próxima segunda). Produz observações com id canônico do log, data, pages como texto e completed=null.

A data é uma data civil informada no fuso do usuário. O default é hoje nesse fuso. O período da meta usa a Week explícita e seu contexto preservado; não usa o timezone do servidor ou número ISO como identidade. Livro adicionado no meio da semana não reduz o alvo. Base diária 10 continua alvo efetivo semanal 70, calculado pelo mesmo engine.

Zero logs resulta em QUANTITY calculável com realizado zero. IDs duplicados continuam explícitos para que o engine v1 devolva INVALID, em vez de somar o mesmo registro duas vezes. Não se altera o engine, seu contrato, versão, precisão, teto de contribuição, cobertura ou agregação.

**Não existe espelho em goal_records.** A migration também rejeita inserções diretas ou via RPC de GoalRecord quando a fonte é MODULE. ReadingLog alimenta diretamente o adapter. As metas MANUAL continuam consultando seus registros originais e passaram na regressão.

Uma meta MANUAL sem histórico pode ser vinculada à Leitura. Se já existir qualquer GoalRecord, inclusive removido, a transição é rejeitada. Depois de vinculada a MODULE, fonte e escopo são protegidos; para outro escopo, crie outra meta e retire a anterior do cálculo conforme necessário. Isso evita reinterpretação silenciosa do histórico. Metas distintas podem compartilhar logs por escopos sobrepostos: cada compromisso mantém sua própria medição e peso; isso não cria registros duplicados.

## Catálogo externo

Provider escolhido: Open Library, atrás da interface BookCatalogProvider. A escolha prioriza busca pública de baixa frequência, sem chave obrigatória, identificadores próprios, autores, ISBN e capas. O DTO CatalogBook contém somente dados normalizados; Book não importa nem persiste o formato bruto da API.

Google Books foi avaliado: a documentação exige identificação por chave/token para dados públicos e oferece consultas de volumes com campos de paginação, imagens e identificadores. Não adicionamos configuração/credencial extra nesta vertical porque Open Library atende a conveniência inicial. Não existe promessa de SLA ou completude de nenhuma das fontes.

| Critério     | Open Library — escolhido                                                   | Google Books — avaliado                                          |
| ------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Autenticação | busca pública sem chave; identificação de aplicação recomendada            | identificação por API key/token documentada                      |
| Limites      | documentação informa 1 req/s padrão e 3 req/s identificadas com contato    | quota gerenciada por projeto; não presumimos um limite universal |
| Paginação    | number_of_pages_median pode representar outras edições; sugestão revisável | pageCount do volume, também sujeito à edição correta             |
| Capas/ISBN   | opcionais; qualidade e disponibilidade variam                              | imagens/identificadores também opcionais                         |
| Acoplamento  | adapter normaliza e importação salva Book independente                     | pode ser adicionado como outro provider sem trocar a entidade    |

Referências consultadas em 20/10/2026: [Open Library APIs e limites](https://openlibrary.org/developers/api), [Search API](https://openlibrary.org/dev/docs/api/search), [Covers API](https://openlibrary.org/dev/docs/api/covers), [Google Books — autenticação e uso](https://developers.google.com/books/docs/v1/using), [Volumes list](https://developers.google.com/books/docs/v1/reference/volumes/list).

A busca é explícita, por título/autor ou ISBN normalizado, até oito resultados. O endpoint Next é autenticado. O servidor aplica timeout de 6s, cache de até 100 consultas por 1h e espaçamento de 1,1s por processo entre consultas externas. BOOK_CATALOG_CONTACT opcional permite identificar um contato público do app; nenhuma credencial extra é necessária. Cache/throttle são locais ao processo, não um rate limiter distribuído para múltiplas instâncias.

Ao selecionar, o formulário permite revisar título, autores, total, capa e ISBN antes de salvar. O lookup mantém referência e data, mas o UUID interno é independente. ISBN remove separadores, preserva X maiúsculo e valida formato; não é obrigatório nem único. Não há deduplicação destrutiva. Um resultado no nível de obra pode agregar edições: a UI alerta para revisar paginação e ISBN da edição.

A pesquisa pode falhar, não retornar resultados ou omitir capa/paginação. Adicionar manualmente permanece sempre disponível. Não há sync automático posterior de metadados. Livros cadastrados não precisam de nova consulta externa para funcionar.

Uma consulta pública real por Dom Casmurro retornou HTTP 200, resultados, Machado de Assis, sugestão de 268 páginas, capa e ISBN nesta execução. A suíte usa respostas mockadas, inclusive erro de rede/429/503, vazio e campos ausentes; não depende da disponibilidade do serviço.

### Capas

URL HTTPS opcional, carregada diretamente pelo navegador com referrerPolicy=no-referrer. Image usa unoptimized, sem proxy/fetch arbitrário no servidor. Falha de imagem vira placeholder consistente. Não há download/cópia para Storage: adicionaria armazenamento, custos e gestão de cópias sem necessidade para o MVP. Não garantimos disponibilidade eterna de imagens externas, e a ausência delas não interrompe leitura ou cadastro.

## Segurança, integridade e concorrência

RLS habilitada e forçada nas quatro tabelas novas. SELECT/INSERT próprios; UPDATE apenas de colunas funcionais em módulos/livros/logs; referências externas preservam dados da importação e não expõem UPDATE/DELETE. Não há DELETE de conteúdo especializado para usuários. anon não acessa tabelas/RPCs.

FKs compostas incluem user_id e RESTRICT. GoalSource também valida o módulo da mesma área e a combinação (user_id, book_id, area_module_id). O banco rejeita referência a livros/áreas de outro usuário e livro de outra associação do próprio usuário. Identidade, proprietário e timestamps não podem ser forjados via grants do cliente.

Novas RPCs security invoker: set_reading_module, save_reading_book, save_reading_log, save_reading_goal, get_reading_books e get_reading_data. As operações usam a sessão autenticada, nunca chave administrativa na aplicação. Fontes e logs manuais recebem guards adicionais sem alterar suas regras de cálculo.

save_reading_log bloqueia a linha do livro antes de validar/salvar. Triggers também bloqueiam o livro para proteger clientes diretos. Atualização dos metadados bloqueia a mesma linha; assim, registros concorrentes e mudanças de total validam a soma canônica sob serialização por livro. Chave de operação única por proprietário evita duplicação; retry com a mesma chave e payload devolve o mesmo id, e outro payload é rejeitado. Edição/remoção de log e edição de metadados comparam updated_at; versão obsoleta gera conflito em vez de sobrescrever silenciosamente.

Desabilitar Leitura bloqueia novos livros/logs e novas vinculações. Livros, logs, correções e desempenho histórico continuam acessíveis; não apagamos dados nem desligamos o adapter de metas já existentes. Reative para criar novos registros ou vínculos. Editar título/alvo/estado de uma meta MODULE existente usa a operação genérica de meta, sem reconfigurar a fonte; continua funcionando com o módulo desabilitado.

## Migration e verificação remota

Nova migration: 202610200003_reading_module.sql. As migrations 001/002 e os três arquivos do motor v1 tiveram hashes comparados e permaneceram idênticos. Não há seed, reset hospedado ou alteração das regras da Fase 2.

Sequência executada: testes locais/E2E e build → apresentação da migration → db push --dry-run (somente 003) → db push --yes → migration list → script transacional remoto → confirmação de limpeza. 001, 002 e 003 estão sincronizadas local/remotamente. Sem seed/reset.

O script reading-rls.sql passou nas **44 asserções** no PostgreSQL real e terminou com ROLLBACK. A consulta posterior confirmou zero usuários temporários.

O runner reading-concurrency.mjs executou cinco pares de transações realmente sobrepostas, sincronizadas por advisory locks usados somente como barreira do teste:

| Cenário                                           | Resultado                                            |
| ------------------------------------------------- | ---------------------------------------------------- |
| Dois registros de 80 em livro de 100              | um aplicado, outro rejeitado pelo limite             |
| Alterar total enquanto outro registro é criado    | um aplicado, outro rejeitado; posição final coerente |
| Corrigir e remover o mesmo log com a mesma versão | um aplicado, outro em conflito                       |
| Retry simultâneo da mesma operação                | mesmo id, somente um registro                        |
| Editar metadados simultaneamente                  | um aplicado, outro em conflito                       |

A fixture de concorrência precisa ser confirmada temporariamente para ser compartilhada entre conexões. O runner remove somente os dados da conta marcada em finally e verificou a limpeza. O [relatório JSON](evidence/fase-3-concurrency.json) contém os cinco resultados e cleanupVerified=true.

O lint SQL remoto não encontrou erro de esquema. Registrou um aviso estático extra: variável b não lida em save_reading_log. Ela recebe a linha usada para ownership/lock antes da gravação; a serialização foi validada pelos testes reais. Não reescrevemos uma migration já aplicada por esse aviso sem impacto funcional.

## Interface e evidências

Rotas /areas/[areaId]/leitura e /areas/[areaId]/leitura/[bookId]. A entrada fica no planejamento da área; habilitação é explícita e não depende do nome. A biblioteca tem filtros pelos quatro status, metadados editáveis, progresso, registro rápido, metas e histórico recente. O detalhe oferece consulta e correções. O histórico visual mostra os 50 registros ativos mais recentes; a projeção de progresso e o cálculo não se limitam aos 50.

O formulário de registro pede livro, data e páginas; no card/detalhe o livro já vem selecionado. Salvar revalida as rotas afetadas e atualiza livro, meta, área e dashboard. Reutilizamos Modal, AppShell, navegação, tokens, cards de desempenho e WeekSelector. Nenhum QuickAdd inteiro foi criado, pois ainda não existia. A privacidade global não esconde leitura por padrão.

| Evidência               | Desktop                                         | Tablet                                         | Mobile                                         |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Biblioteca + meta 56/70 | [imagem](evidence/fase-3-library-desktop.png)   | [imagem](evidence/fase-3-library-tablet.png)   | [imagem](evidence/fase-3-library-mobile.png)   |
| Livro + histórico       | [imagem](evidence/fase-3-book-desktop.png)      | [imagem](evidence/fase-3-book-tablet.png)      | [imagem](evidence/fase-3-book-mobile.png)      |
| Dashboard               | [imagem](evidence/fase-3-dashboard-desktop.png) | [imagem](evidence/fase-3-dashboard-tablet.png) | [imagem](evidence/fase-3-dashboard-mobile.png) |

Emulação Chromium/Edge: desktop 1448×1086, tablet 768×1024 e mobile 390×844. Capturas completas podem mostrar barras fixas na posição do viewport. Não equivalem a teste físico ou Safari.

## Testes

- 33 testes unitários novos: progresso, inicial, correções, remoção, total, escopos, período, ausência, IDs duplicados, normalização, integração v1 e catálogo mockável.
- 18 testes de banco novos: migrations reais em PostgreSQL embarcado, ownership, FKs, source, limites, idempotência, correções, anon e preservação de metas manuais.
- Script remoto exato também é executado localmente e comprova ROLLBACK.
- Total local: 159 testes aprovados, incluindo toda a regressão anterior.
- E2E completo: 24/24 aprovados; nove cenários de Leitura nos três breakpoints, repetidos após refinamento de fluxo/capturas.
- E2E verifica banco da fixture: zero GoalRecord, source estruturada, retry sem duplicação, persistência após reload, initialTrackingPage não pontuando, livro específico, 80→8, excesso rejeitado, superação e dashboard.
- Provider: resultados, vazio, indisponibilidade, campos ausentes, autores múltiplos e importação seguida de edição manual. Busca real foi uma verificação separada.
- Build de produção, TypeScript e ESLint aprovados. Formatação final aprovada após a documentação.

Google OAuth real e duas contas da Fundação já haviam sido validados pelo usuário. O E2E automatizado usa sessão e backend efêmeros exclusivamente em tests, com migrations reais; não adiciona bypass à aplicação. RLS é validada também no PostgreSQL hospedado.

## Arquivos criados/alterados

Criados:

- supabase/migrations/202610200003_reading_module.sql
- supabase/tests/reading-rls.sql
- src/domain/reading/progress.ts
- src/features/reading/{types,schema,actions,performance-adapter}.ts
- src/features/reading/{book-cover,reading-forms,reading-workspace}.tsx
- src/services/book-catalog/{provider,open-library}.ts
- src/server/catalog/search.ts; src/server/repositories/reading.ts
- src/app/api/book-catalog/route.ts
- src/app/(protected)/areas/[areaId]/leitura/page.tsx
- src/app/(protected)/areas/[areaId]/leitura/[bookId]/page.tsx
- src/styles/reading.css
- tests/unit/reading.test.ts; tests/helpers/reading-db.ts
- tests/integration/{reading-db,reading-rls-script}.test.ts
- tests/e2e/reading.spec.ts; tests/remote/reading-concurrency.mjs
- docs/fase-3.md; docs/evidence/fase-3-*.png e relatório JSON de concorrência

Alterados:

- src/features/planning/{actions,normalize,types}.ts
- src/features/planning/{goal-forms,planning-workspace}.tsx
- src/types/database.ts; src/app/layout.tsx; next-env.d.ts (gerado pelo build Next.js)
- tests/fixtures/supabase.mjs
- .env.example; README.md; docs/supabase-setup.md; docs/decisions-v1.md; src/domain/README.md

Sem dependências novas, commits, publicação de aplicação ou alterações de mockups/contrato. As evidências aprovadas das fases anteriores foram preservadas.

## Limitações e próxima fase

- Sem releitura, reinício, posição física independente, saltos de páginas, resenhas, notas, avaliações ou highlights.
- Status é manual; depois de corrigir uma leitura de um livro concluído, o usuário decide se altera o status.
- Fonte MODULE e escopo permanecem protegidos após vinculação; migração de histórico MANUAL exige regra própria futura, sem apagar ou duplicar dados.
- Remoção física/arquivamento de bibliotecas e áreas vinculadas não foi antecipada. A própria associação de módulo é preservada ao desabilitar e impede excluir a área por RESTRICT, mesmo se a biblioteca estiver vazia; remover a associação exige uma decisão futura explícita.
- Cache/throttle do catálogo não coordenam todas as instâncias de hospedagem; antes de crescer, acompanhar limites/429 e avaliar quota distribuída ou outro provider. O fallback manual mantém o fluxo principal utilizável.
- Histórico visual é recente e consultas desta vertical ainda carregam a biblioteca/metadata do usuário; paginação de grandes bibliotecas é evolução futura.
- Snapshots não existem ainda. A futura revisão deverá copiar resultados/contexto no instante da conclusão, sem consultar projeções operacionais vivas para reescrever histórico.
- Nenhum outro módulo, Ação, Revisão, notificação ou funcionalidade de Saúde foi implementado. Saúde permanece planejada somente com Sono e Saúde bucal.

A implementação para aqui, aguardando aprovação para qualquer próxima fase.
