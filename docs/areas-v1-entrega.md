# Plano de Vida V1 — quatro áreas especializadas

Entrega de 25/10/2026. Contrato: [auditoria e matriz de requisitos](areas-v1-auditoria.md). Referências: `assets/referencias/`. As adaptações de Estudos e Saúde Bucal e as regras de Carreira, Finanças e Saúde foram aprovadas explicitamente nesta conversa.

## Estudos

- Dashboard com meta semanal, sete dias, evolução de 14 dias, média, sequência, disciplinas, histórico e próximas ações. A composição adapta a referência aprovada de Leitura: amarelo, resumo e gráfico lado a lado, sequência e paisagem, disciplinas e ações abaixo.
- Disciplinas com alvo opcional em minutos, objetivo compartilhado opcional e arquivamento. Progresso de duração = soma das sessões válidas da disciplina / alvo total; não representa domínio subjetivo do assunto.
- Sessões em minutos inteiros, data local e anotações. Cadastro, correção e remoção lógica atualizam os indicadores. Reenvios do mesmo ID/payload não duplicam sessões; edições exigem timestamp esperado.
- Meta usa `weekly_goals` e `goal_sources`, fonte MODULE/STUDIES/MINUTES_STUDIED/ALL_SUBJECTS. Alimenta o mesmo engine v1 e o planejamento compartilhado, sem copiar para `goal_records`. Escolha explícita da meta exibida quando houver várias; metas sobrepostas não somam alvos.
- Semana = segunda a domingo. Gráfico = 14 datas até hoje, incluindo zeros, média = total / 14. Sequência conta datas distintas até hoje ou ontem, encerrando no primeiro intervalo. Sessões futuras são rejeitadas no banco.

## Finanças

- Hero, receita, despesa e saldo do mês, comparação com mês anterior, receita x despesas, categorias, metas financeiras e ações conforme `financas.png`. Complementos solicitados: movimentações, orçamentos, compromissos, aportes, histórico e evolução de seis meses.
- BRL com entrada sem separador de milhares e até duas casas decimais, convertido para centavos inteiros. Cada valor fica limitado a 999.999.999.999 centavos; totais e aportes usam BigInt no domínio, sem somas monetárias em ponto flutuante.
- Mês usa `booked_on`, uma data de calendário no fuso da conta. Só REALIZED alimenta indicadores; futuro precisa ser PLANNED. Dar baixa exige escolher realizado e informar a data efetiva. Saldo = receitas − despesas; não há integração bancária.
- Categorias de receita e despesa são explícitas. FK composta impede tipo incompatível e categoria de outra área/conta. Tipo de categoria com movimentações não muda silenciosamente; arquivamento mantém o histórico.
- Orçamento por categoria de despesa/mês. Consumo = despesas realizadas da categoria / limite; excesso aparece explicitamente. Comparação mensal = (atual − anterior) / abs(anterior); base anterior zero mostra “Sem base”.
- Metas financeiras de prazo próprio, com objetivo compartilhado opcional e aportes explícitos. Aporte não cria movimentação nem é inferido do saldo. Correção/remoção lógica de aporte recalcula o progresso. Barras limitam apenas o desenho a 100%; valores reais permanecem visíveis.
- Privacidade global existente oculta valores, gráficos e variações monetárias. Gráfico mensal usa escala comum para receitas/despesas, com valores acessíveis por teclado/toque; os totais textuais permanecem disponíveis.

## Carreira

- Cabeçalho com projetos no ritmo, reuniões da semana, entregas do mês, horas de estudo e projetos de trabalho ativos. Listas distintas de trabalho atual e desenvolvimento pessoal/competências, próximas ações, objetivo em foco e revisão, conforme `carreira.png`.
- Projetos e iniciativas com prazo opcional, objetivo compartilhado e situação. Marcos de tarefa, aula, entrega ou conquista, com prazo e conclusão datada. Progresso = quantidade concluída / total de marcos válidos; sem marcos = sem percentual, sem nota inventada.
- “No ritmo” mede situação atual: projetos ativos com prazo não vencido e sem marco pendente vencido. Projetos sem prazo ficam fora do denominador. Não existe projeção automática da velocidade do trabalho.
- Reuniões = concluídas / previstas por data prevista na semana selecionada. Entregas = concluídas / previstas no mês da segunda-feira selecionada, identificado no cartão. Conclusões futuras são rejeitadas.
- Horas só aparecem depois de escolher explicitamente uma área de Estudos em Definir foco. Somam as sessões canônicas dessa área na semana, sem duplicação. Alvo opcional em minutos; não se infere que qualquer estudo pertence à carreira.
- Objetivo em foco é escolhido entre os objetivos compartilhados e conserva o progresso manual explícito daquele modelo. Diário de revisão persiste conquistas, aprendizados e próximos passos, com edição e histórico; não gera desempenho subjetivo.

## Saúde — Sono e Saúde Bucal

- Sono adapta `sono-e-descanso.png`: gráfico semanal, linha da meta pessoal, energia informada, média com cobertura, noites com sete horas ou mais, rituais e ações. Bucal usa o verde da composição de `saude.png`, com checklist e consistência, conforme adaptação aprovada. Treinos e demais conteúdos da referência de Saúde foram excluídos por escopo.
- Noite principal por data de despertar, com início e fim convertidos para instantes reais. Duração = diferença entre os instantes, entre um minuto e 24 horas. Sobreposição de noites é rejeitada. Correção e remoção lógica preservam o registro e recalculam gráficos.
- Fuso da noite fica persistido e não muda ao editar o perfil. Horário inexistente em mudança de fuso é rejeitado; horário repetido exige deslocamento UTC explícito, validado contra o fuso. Horários futuros não são registros executados.
- Média considera somente noites registradas; cobertura informa quantas de sete existem. Ausência aparece como “—”. Contagem de noites com ≥ 420 minutos é descritiva. Energia é autoavaliação opcional de 1 a 5, sem inferência.
- Regularidade é a menor amplitude circular dos horários locais ao acordar e deitar: 23:50 e 00:10 variam 20 minutos. Requer ao menos duas noites; não gera avaliação clínica ou percentual de saúde.
- Meta pessoal começa vazia e é configurável em minutos. Rotinas SLEEP/ORAL são diárias e inteiramente configuradas pelo usuário, sem checklist clínico predefinido. Para momentos diferentes, cadastrar itens separados.
- Checklist por data, marcação/desmarcação persistida e histórico semanal. Consistência = itens marcados / previstos até hoje na semana. Antes do início, depois do fim e em dias futuros não há itens previstos. Início/tipo da rotina ficam protegidos; encerrar a partir de hoje não reescreve o denominador passado. Rotina já encerrada no passado é retomada criando outra.

## Integração, segurança e navegação

As quatro interfaces são implementações fixas em features próprias; os componentes compartilhados são apenas primitivas visuais e infraestrutura de formulários. Não há construtor configurável de áreas.

Rotas `/areas/[areaId]/estudos`, `/financas`, `/carreira` e `/saude`, acessíveis pelo planejamento da área. “Dashboard inicial desta área” persiste uma das cinco experiências pelo ID da área. O nome da área não determina seu domínio e pode mudar. A abertura anterior de Leitura é preservada até uma escolha explícita; Planejamento da área continua disponível com `view=planning`.

Todas as áreas reutilizam `actions`, seu vínculo opcional a objetivo, datas/horários, edição, conclusão e reabertura. Concluir ação não gera sessão, movimentação, marco ou cumprimento de rotina. O seletor de livro continua na Leitura e é omitido nas quatro interfaces novas.

Pages autenticadas → repositories server-only → Supabase com sessão do usuário. Server Actions validam entradas; regras puras ficam em domain. Cada rota tem carregamento e erro recuperável; no Next instalado, a recuperação usa `retry()` para buscar novamente. Formulários preservam campos depois de erro, inclusive seleções, e bloqueiam reenvio enquanto pendentes.

17 tabelas novas, todas com RLS habilitada/forçada, sem acesso anon, sem exclusão exposta de histórico e sem edição de ownership. FKs compostas protegem usuário/área; funções são security invoker com search_path vazio. Alterações usam comparação de timestamp; novos registros operacionais têm chave estável para reenvio idempotente.

## Migrations e preservação

| Migration                                  | Alteração                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `202610250002_studies.sql`                 | Disciplinas, sessões, RPCs e integração canônica às metas; amplia associação para STUDIES, mantendo regras de livros e fontes de Leitura |
| `202610250003_finances.sql`                | Categorias, movimentações, orçamentos, metas e aportes; centavos, datas, FKs, RLS e operações                                            |
| `202610250004_career.sql`                  | Projetos, marcos, compromissos, foco/vínculo de Estudos e diário de revisão                                                              |
| `202610250005_health.sql`                  | Meta pessoal, noites, rotinas e cumprimentos; instantes, agenda e proteção do histórico                                                  |
| `202610250006_dashboard_preferences.sql`   | Dashboard inicial explícito por ID da área                                                                                               |
| `202610250007_specialized_date_guards.sql` | Impede execução futura também em INSERT/UPDATE direto autenticado de sessões e revisões                                                  |

Todas aplicadas ao Supabase de desenvolvimento vinculado, após conferir a correspondência com a URL da aplicação e o dry-run. As migrations anteriores foram preservadas. As alterações nas constraints/fontes ampliam STUDIES sem converter metas manuais ou de Leitura.

Auditorias remotas: [implantação aditiva](evidence/areas-v1-remote-audit.json) e [proteção adicional de datas](evidence/areas-v1-hardening-audit.json). Fixtures temporárias terminam em ROLLBACK. Contagens de todas as tabelas existentes permaneceram idênticas: inclusive 1 livro, 0 ReadingLogs, 2 GoalRecords e 1 meta semanal da conta existente. Não foram inseridos dados de demonstração nessa conta. Sem publicação em produção.

## Validação

- Unitários e integração PostgreSQL/PGlite: **199 testes em 23 arquivos aprovados**. Incluem cálculos, centavos, limites, DST, datas ausentes, fontes compartilhadas, edição concorrente, reenvio, remoção lógica e segurança das 17 tabelas.
- O mesmo [script SQL de auditoria](../supabase/tests/specialized-areas.sql) roda localmente e no Supabase remoto. A regressão SQL de entrada de Leitura também passou remotamente.
- E2E final: **66/66 cenários aprovados**, sem falhas, instabilidade ou testes ignorados, em desktop, tablet e mobile. Inclui toda a regressão existente de Leitura/planejamento/fundação, fluxos das quatro áreas, ações compartilhadas, erros recuperáveis e 320 px. [Resultado completo](evidence/areas-v1-e2e.json).
- Após a última proteção contra inferir capacidades pelo nome da área: **3/3 E2E de Estudos novamente aprovados**, incluindo renomear a área para “leitura”, preservar a preferência por ID, omitir livros nas ações de Estudos e manter os indicadores. [Resultado adicional](evidence/areas-v1-identity-e2e.json).
- Lint e TypeScript aprovados; build de produção aprovado, incluindo as quatro rotas novas. Nenhum deploy foi executado.
- Verificação visual independente de cada área em desktop (1448 × 1086), tablet e mobile. Estados vazios e preenchidos capturados com fixtures reais no banco efêmero, identificadas como dados de testes. Cenários de falha recuperável também verificam largura de 320 px.

## Capturas visuais

Todos os valores das capturas são fixtures de testes, não os dados da conta real.

| Área / estado  | Desktop                                                 | Tablet                                                 | Mobile                                                 |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Estudos        | [dashboard](evidence/estudos-v1-dashboard-desktop.png)  | [dashboard](evidence/estudos-v1-dashboard-tablet.png)  | [dashboard](evidence/estudos-v1-dashboard-mobile.png)  |
| Estudos vazio  | [captura](evidence/estudos-v1-empty-desktop.png)        | [captura](evidence/estudos-v1-empty-tablet.png)        | [captura](evidence/estudos-v1-empty-mobile.png)        |
| Finanças       | [dashboard](evidence/financas-v1-dashboard-desktop.png) | [dashboard](evidence/financas-v1-dashboard-tablet.png) | [dashboard](evidence/financas-v1-dashboard-mobile.png) |
| Finanças vazio | [captura](evidence/financas-v1-empty-desktop.png)       | [captura](evidence/financas-v1-empty-tablet.png)       | [captura](evidence/financas-v1-empty-mobile.png)       |
| Carreira       | [dashboard](evidence/carreira-v1-dashboard-desktop.png) | [dashboard](evidence/carreira-v1-dashboard-tablet.png) | [dashboard](evidence/carreira-v1-dashboard-mobile.png) |
| Carreira vazio | [captura](evidence/carreira-v1-empty-desktop.png)       | [captura](evidence/carreira-v1-empty-tablet.png)       | [captura](evidence/carreira-v1-empty-mobile.png)       |
| Saúde          | [dashboard](evidence/saude-v1-dashboard-desktop.png)    | [dashboard](evidence/saude-v1-dashboard-tablet.png)    | [dashboard](evidence/saude-v1-dashboard-mobile.png)    |
| Saúde vazio    | [captura](evidence/saude-v1-empty-desktop.png)          | [captura](evidence/saude-v1-empty-tablet.png)          | [captura](evidence/saude-v1-empty-mobile.png)          |

## Diferenças justificadas e limites

- Estudos e Saúde Bucal não tinham referências próprias; as adaptações foram aprovadas antes da implementação. Os conteúdos de exercício de saude.png não fazem parte desta versão.
- O shell, a navegação, o avatar de iniciais e o controle global de privacidade são os existentes no projeto. Por isso Finanças usa a privacidade global, em vez de três controles independentes nos cartões do desenho.
- A paisagem usa o SVG local já aprovado em Leitura; o bitmap original das referências não foi fornecido separadamente. Textos e números ilustrativos dos wireframes foram substituídos por estados vazios/dados persistidos.
- Formulários, seletores de período, vínculo de dashboard, histórico e operações ficam disponíveis além da composição principal dos wireframes. O fluxo completo é mais longo que a imagem estática para comportar os recursos solicitados.
- Projetos sem marcos e indicadores sem fonte suficiente ficam sem percentual/base. Deltas decorativos de Carreira não foram copiados: as imagens não especificavam período/base para os “+1/+2”, e não se inventou comparação. Há contagens datadas verificáveis.
- A revisão de Carreira é reflexão persistida. Revisão semanal global, snapshots e notas históricas continuam fora deste escopo; não há botão que prometa um fluxo inexistente.
- Sono acompanha uma noite principal por despertar; cochilos e múltiplos episódios não fazem parte do contrato V1. Metas pessoais e checklists não fornecem orientação clínica.
- Sem integração bancária, recorrência de ações, notificações ou gravação offline. Cadastros e históricos completos ainda não têm paginação; esta entrega não inclui medição de carga em contas com anos de registros.
