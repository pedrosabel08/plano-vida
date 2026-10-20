# Plano de Vida — Contrato Funcional V1

> **Especificação funcional do MVP**  
> Versão 1.0 · 19 de outubro de 2026  
> Status: decisões consolidadas para orientar protótipo e implementação

## Como ler este documento

- **Fechado para o MVP** identifica decisões já tomadas e que devem orientar a V1.
- **Ponto para fase futura** identifica algo que não foi decidido e não deve ser tratado como requisito da V1.

Este documento consolida as decisões do questionário e da conversa de produto. Quando uma regra ainda não foi definida, ela é sinalizada como pendência de produto em vez de ser inventada.

## 1. Visão geral e objetivo do MVP

O Plano de Vida é uma aplicação pessoal para planejar objetivos e metas, registrar a execução ao longo da semana e acompanhar o próprio desempenho por áreas da vida. O MVP deve apoiar um ciclo simples e repetível:

**planejar a semana → registrar a execução → acompanhar o progresso → revisar no domingo → definir a próxima semana.**

O produto organiza áreas personalizáveis, objetivos, metas semanais, ações e registros especializados. O desempenho representa a execução das metas planejadas; não é uma avaliação da qualidade ou do valor da vida da pessoa.

### Resultado esperado

Ao final de uma semana, a pessoa deve conseguir identificar o que planejou, o que realizou em cada área, o que ficou pendente e o que pretende planejar para a semana seguinte. O fluxo deve funcionar tanto para quem está começando com a conta vazia quanto para quem já organizou sua rotina.

## 2. Escopo funcional

### Fechado para o MVP

- Conta individual com autenticação Google via Supabase Auth e arquitetura multiusuário desde o início.
- Áreas totalmente personalizáveis, com nome, cor e ícone, incluindo cinco áreas iniciais sugeridas.
- Objetivos mensuráveis ou qualitativos, metas semanais e ações.
- Cálculo do desempenho semanal e visualização da composição do resultado.
- Revisão semanal obrigatória para todas as áreas, oferecida aos domingos.
- Dashboard semanal e telas de detalhe por área e módulo.
- Módulos de leitura, finanças, carreira/projetos, mente e pessoal, sono e saúde bucal.
- Experiência responsiva/PWA, com desktop/iPad para visão geral e mobile para registros rápidos.
- Tema inicial escuro, privacidade visual para valores financeiros e textos sensíveis e notificações úteis.
- Onboarding vazio: a conta começa sem dados de exemplo ou preenchimento automático.

### Fora do compromisso da V1

Não ampliar o produto com funcionalidades não acordadas. O que não estiver listado como fechado deve ser tratado como ponto futuro ou decisão ainda pendente, conforme a seção 25.

## 3. Arquitetura do produto e mapa de telas

### Mapa funcional

```text
Plano de Vida
├── Início / Dashboard
│   ├── Resumo da semana
│   ├── Cards das áreas
│   ├── Próximas ações
│   ├── Objetivos em foco
│   └── Estado da revisão semanal
├── Áreas
│   ├── Leitura e estudos
│   ├── Finanças
│   ├── Carreira
│   ├── Mente e pessoal
│   └── Saúde
├── Objetivos
├── Ações
├── Revisão semanal
├── Registros especializados / módulos
│   ├── Leitura
│   ├── Finanças
│   ├── Sono
│   ├── Saúde bucal
│   ├── Projetos
│   └── Check-in
└── Configurações
    ├── Áreas personalizáveis
    ├── Preferências de aparência
    └── Conta
```

O mapa representa a navegação funcional. Não implica a necessidade de uma rota ou tela independente para cada item: a implementação pode agrupar páginas, desde que preserve os fluxos e critérios de aceite.

### Telas e responsabilidades

| Tela/área       | Responsabilidade principal                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Dashboard       | Mostrar o resumo semanal, as cinco áreas iniciais, ações próximas, objetivos em foco e estado da revisão. |
| Detalhe da área | Mostrar objetivos, metas, ações, desempenho e módulos ativados daquela área.                              |
| Objetivos       | Criar e acompanhar objetivos e seus prazos, quando definidos.                                             |
| Ações           | Consultar, criar e atualizar ações, inclusive recorrentes e vencidas.                                     |
| Revisão semanal | Conduzir o fluxo de revisão, área por área, até a conclusão e o snapshot.                                 |
| Leitura         | Gerenciar livros e registrar páginas lidas por dia.                                                       |
| Finanças        | Registrar manualmente receitas e despesas e consultar categorias e metas financeiras.                     |
| Projetos        | Organizar projetos associados à área Carreira, além de objetivos, metas e ações.                          |
| Sono            | Registrar horas de sono por dia e acompanhar metas.                                                       |
| Saúde bucal     | Registrar acompanhamento diário no tracker especializado.                                                 |
| Mente e pessoal | Registrar check-in diário, reflexão curta e aprendizados.                                                 |
| Configurações   | Personalizar áreas e acessar preferências decididas para o MVP.                                           |

## 4. Áreas iniciais e personalização

### Áreas iniciais

| Área inicial      | Observação funcional                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| Leitura e estudos | Pode usar o módulo de leitura e metas de estudo.                        |
| Finanças          | Registros manuais de entradas e saídas, categorias e metas financeiras. |
| Carreira          | Inclui a entidade Projetos, além de objetivos, metas e ações.           |
| Mente e pessoal   | Inclui check-in diário, reflexão curta, aprendizados e revisão semanal. |
| Saúde             | Contém somente os módulos Sono e Saúde Bucal. Treinos ficam fora.       |

### Personalização

As áreas são **totalmente personalizáveis**. A pessoa pode criar, editar e remover áreas, definindo nome, cor e ícone. As cinco áreas acima são a configuração inicial recomendada, não um conjunto fixo obrigatório.

**Ponto para fase futura:** a conversa não definiu regras de exclusão de área com dados associados, limites de quantidade, restauração, arquivamento ou migração de registros. Esses comportamentos devem ser especificados antes de implementar casos destrutivos.

## 5. Arquitetura híbrida: áreas e módulos especializados

O produto separa a organização pessoal da forma especializada de registrar certos dados:

- **Área** organiza objetivos, metas semanais e ações. Tem nome, cor e ícone escolhidos pela pessoa.
- **Módulo especializado** oferece campos e fluxos próprios para um domínio, como leitura, finanças, sono, saúde bucal, projetos ou check-in.
- Um módulo pode ser associado à área que fizer sentido, sem tornar as áreas fixas ou obrigar que os nomes da área correspondam ao módulo.

```text
Área
├── nome, cor e ícone
├── objetivos
├── metas semanais
├── ações
└── módulos opcionais
    ├── Leitura
    ├── Finanças
    ├── Sono
    ├── Saúde bucal
    ├── Projetos
    └── Check-in
```

Na configuração inicial, os módulos ficam associados de modo coerente às cinco áreas: Leitura e estudos → Leitura; Finanças → Finanças; Carreira → Projetos; Mente e pessoal → Check-in; Saúde → Sono e Saúde bucal. A arquitetura não deve impedir associações futuras diferentes.

## 6. Objetivos

Objetivos expressam resultados ou direções que a pessoa quer perseguir. Podem ser:

- **Mensuráveis**, com progresso representado por uma quantidade ou indicador.
- **Percentuais**, com progresso expresso de 0% a 100%.
- **Qualitativos**, descritos em texto e acompanhados sem exigir uma métrica numérica.
- **Com prazo opcional**, quando a pessoa escolher uma data-alvo.

Um objetivo pode se relacionar a uma área e, opcionalmente, a ações ou metas que apoiem sua execução. A ausência de prazo é válida.

**Ponto para fase futura:** campos adicionais, hierarquia entre objetivos, estados de arquivamento, regras para concluir objetivos qualitativos e a fórmula de progresso de objetivos mensuráveis não foram fechados.

## 7. Metas semanais e tipos suportados

Toda área precisa ter **ao menos uma meta semanal** para receber nota de desempenho. Uma meta deve informar o tipo, o alvo planejado e a forma de registrar o realizado.

| Tipo       | Uso                                              | Exemplo                               |
| ---------- | ------------------------------------------------ | ------------------------------------- |
| Quantidade | Soma uma quantidade realizada durante a semana.  | Ler 70 páginas.                       |
| Frequência | Conta ocorrências ou vezes realizadas.           | Estudar 3 vezes na semana.            |
| Média      | Compara uma média registrada com uma meta média. | Dormir em média 8 horas por noite.    |
| Conclusão  | Verifica se uma entrega/atividade foi concluída. | Fazer a revisão financeira da semana. |

Metas podem ser definidas em base semanal ou diária. Quando uma meta diária representa um compromisso para cada dia da semana, o sistema converte o planejado em total semanal e mantém o acompanhamento por dia. Exemplo: **10 páginas por dia → 70 páginas planejadas na semana**, com os registros diários preservados.

**Ponto para fase futura:** a conversa não determinou como tratar semanas incompletas, semanas com menos de sete dias disponíveis, metas criadas no meio da semana, arredondamento, unidade de medidas incompatíveis ou dias da semana explicitamente excluídos de uma meta diária.

## 8. Motor de Desempenho Semanal

### Regra-base

Para metas quantitativas, o percentual realizado deriva da relação entre valor realizado e planejado:

```text
percentual da meta = realizado ÷ planejado × 100
nota da meta (0 a 10) = mínimo(percentual da meta, 100%) × 10
```

Na apresentação, 80% corresponde a 8,0/10. Percentual realizado pode ultrapassar 100%; a nota não ultrapassa 10/10. O percentual comunica o volume efetivamente realizado; a nota é limitada ao máximo.

### Exemplos fechados

**Meta de leitura:** planejado 70 páginas, realizado 56 páginas.

```text
56 ÷ 70 = 80%
Nota: 8,0/10
```

**Meta superada:** planejado 70 páginas, realizado 100 páginas.

```text
100 ÷ 70 ≈ 143%
Percentual exibido: 143%
Nota: 10/10
```

### Resultado da área

Quando uma área tem várias metas, o desempenho agregado usa **média simples** dos percentuais das metas. Não há pesos por meta no MVP. Exemplo:

```text
Meta A: 100%
Meta B: 80%
Meta C: 60%
Média simples: (100% + 80% + 60%) ÷ 3 = 80%
Nota da área: 8,0/10
```

O percentual agregado pode aparecer como percentual de metas cumpridas conforme a convenção visual do dashboard. A área também apresenta a nota no formato `x/10` e permite abrir a composição, identificando metas e percentuais que formaram o resultado.

### Ações e dupla contagem

Uma ação pode apoiar a execução de uma meta, mas não deve gerar pontos adicionais quando o mesmo resultado já está medido quantitativamente. Exemplo: se a meta é “ler 70 páginas” e a leitura já é somada no módulo de leitura, concluir uma ação “ler hoje” não pode somar novamente páginas ou elevar o score por si só.

Se a área não tiver um indicador quantitativo para uma entrega, uma meta do tipo Conclusão pode medir sua conclusão. O critério concreto de associação entre ações e metas deve ser simples e evitar contagem duplicada.

### Pontos que precisam de decisão antes da implementação do cálculo completo

A conversa fechou os exemplos e as regras gerais, mas não especificou o mapeamento numérico exato de todas as variantes dos tipos Frequência, Média e Conclusão, nem denominadores nulos, registros ausentes, correções retrospectivas ou precisão decimal. Definir essas regras é próximo passo de produto; os exemplos acima não devem ser usados para inferir regras não acordadas.

## 9. Ações

Uma ação é uma tarefa executável que ajuda a pessoa a avançar em uma área ou objetivo.

| Campo       | Regra no MVP                                                            |
| ----------- | ----------------------------------------------------------------------- |
| Título      | Obrigatório; identifica a ação.                                         |
| Área        | Obrigatória; associa a ação a uma área.                                 |
| Objetivo    | Opcional; pode relacionar a ação a um objetivo.                         |
| Data        | Opcional.                                                               |
| Horário     | Opcional; pode existir com uma data para permitir lembrete/notificação. |
| Recorrência | Diária, semanal ou em dias específicos.                                 |
| Status      | Indica o estado da ação, incluindo conclusão e situação vencida.        |

O formulário de ação não inclui **prioridade** nem **descrição** no MVP. Ações vencidas continuam vencidas até que uma regra ou ação explícita altere seu estado; o sistema não deve apagá-las, marcá-las como concluídas ou movê-las silenciosamente.

Notificações para ações com data e horário fazem parte do MVP. A conversa não definiu regras de fuso, antecedência, repetição de alertas, permissão do navegador ou comportamento offline; esses detalhes devem ser fechados durante o desenho técnico e de interação.

## 10. Revisão semanal

A revisão é oferecida aos domingos e é **obrigatória para todas as áreas**. Se a pessoa não a concluir, permanece pendente até a conclusão; a passagem do domingo não a remove nem a marca como feita.

### Fluxo

1. Exibir um resumo automático da semana.
2. Conduzir a análise de cada área.
3. Revisar pendências.
4. Definir metas para a próxima semana.
5. Oferecer uma reflexão opcional.
6. Concluir a revisão e registrar um snapshot.

Ao concluir, o sistema salva um **snapshot imutável** do estado revisado. A revisão concluída não deve mudar retroativamente se dados atuais forem editados. A revisão seguinte inicia um novo ciclo semanal.

### Notificações

O MVP inclui notificação da revisão semanal e de pendências/vencidas. O mecanismo, horário e canal exatos ainda não foram especificados.

**Ponto para fase futura:** não foram definidos início/fim da semana, tratamento de atraso de várias semanas, edição ou reabertura de revisão concluída e escopo exato dos dados capturados no snapshot.

## 11. Dashboard

O Dashboard apresenta, em um único lugar:

- resumo semanal;
- cards das cinco áreas iniciais;
- próximas ações;
- objetivos em foco;
- estado da revisão semanal (concluída ou pendente).

Cada card de área mostra **nota `x/10`** e **percentual das metas**. Ao abrir o card ou seu detalhamento, a pessoa consegue consultar a composição do desempenho por meta.

O Dashboard deve refletir as áreas personalizadas e os dados da semana selecionada/em curso, sem depender de conteúdo de demonstração. A escolha de filtros, período histórico e ordenação ainda não foi fechada.

## 12. Leitura e estudos

O módulo de leitura deve permitir cadastrar e acompanhar livros com estes campos:

- título;
- autor;
- total de páginas;
- página atual;
- capa;
- status.

Deve permitir registrar diariamente quantas páginas foram lidas, preservando os registros por dia e apoiando metas semanais de leitura.

Está decidido considerar uma API de livros para facilitar o cadastro, **se houver uma integração apropriada**, com fallback para cadastro manual. A fonte da API, disponibilidade, cobertura, limites e política para falhas são decisões técnicas futuras. O cadastro manual deve continuar utilizável quando a API não estiver disponível.

**Ponto para fase futura:** valores permitidos para Status, busca, importação, edição de capa e validações específicas não foram fechados.

## 13. Finanças

O módulo de finanças usa **entrada manual** no MVP e permite:

- registrar receitas;
- registrar despesas;
- classificar registros por categorias;
- definir e acompanhar metas financeiras.

O acesso e os valores financeiros devem ser ocultáveis pelo botão de privacidade (seção 18). Não foi decidida integração bancária, sincronização automática ou moeda padrão.

**Ponto para fase futura:** campos de lançamento, recorrência, transferências, saldo, orçamento por categoria, exportação e regras de metas financeiras precisam ser especificados antes de serem tratados como requisitos.

## 14. Carreira e Projetos

A área Carreira inclui a entidade **Projetos**, além de objetivos, metas e ações. O MVP deve permitir que a pessoa organize seus projetos e relacione-os à área profissional.

**Ponto para fase futura:** campos, estados, datas, progresso, hierarquia, colaboração e visualizações específicas de projetos não foram fechados. Não presumir gestão avançada de projetos.

## 15. Mente e pessoal

A área Mente e pessoal inclui:

- check-in diário de humor;
- reflexão curta no check-in;
- registro de aprendizados;
- revisão semanal.

Textos sensíveis devem respeitar a opção de privacidade visual. A reflexão dentro da revisão semanal é opcional, mesmo que o processo de revisão seja obrigatório.

**Ponto para fase futura:** escala e opções de humor, extensão de textos, histórico, campos de aprendizados e retenção/exportação não foram especificados.

## 16. Saúde: Sono e Saúde Bucal

A área Saúde possui somente dois módulos no MVP: **Sono** e **Saúde Bucal**. **Treinos ficam fora do MVP** e não devem aparecer como função da área.

### Sono

Permite registro diário de horas de sono e acompanhamento de metas, inclusive metas do tipo Média.

### Saúde Bucal

Possui tracker diário próprio para não poluir a lista geral de Ações. Registros rotineiros de saúde bucal pertencem a esse módulo especializado e não precisam virar ações comuns.

**Ponto para fase futura:** detalhes dos campos, eventos, lembretes, métricas e fórmulas destes módulos ainda não foram definidos.

## 17. Mobile/PWA e registro rápido

O produto será preparado como experiência responsiva/PWA, com estes focos:

- **Desktop/iPad:** visão geral, leitura do Dashboard, acompanhamento e revisão.
- **Mobile:** registro rápido e consulta da rotina.

O botão `+` abre ações rápidas para:

1. Nova ação;
2. Registrar leitura;
3. Registrar sono;
4. Registrar saúde bucal;
5. Registrar gasto;
6. Check-in.

Os fluxos rápidos devem criar registros no módulo correto. Não exigir que o usuário primeiro encontre e navegue por várias telas especializadas para lançar esses dados.

**Ponto para fase futura:** instalação, modo offline, sincronização, requisitos de distribuição e detalhes de navegação não foram fechados.

## 18. Privacidade visual

Um botão com ícone de olho alterna a ocultação de **valores financeiros e textos sensíveis**, preservando visíveis os **nomes das áreas e os indicadores** necessários para navegar e compreender o estado geral.

A privacidade visual não substitui autenticação nem define permissões de acesso. Os elementos específicos considerados “textos sensíveis”, a duração da preferência e o estado padrão ainda devem ser definidos no desenho de interface.

## 19. Autenticação e isolamento dos dados

- Autenticação com Google por meio de Supabase Auth.
- Arquitetura preparada para múltiplos usuários desde o início.
- Entidades de dados pertencentes a uma pessoa devem incluir `user_id`.
- Row Level Security (RLS) deve restringir leitura e escrita aos dados do usuário autenticado.

As políticas de RLS devem cobrir todas as tabelas e operações pertinentes. A implementação não deve depender apenas de filtros na interface para separar dados entre usuários.

## 20. Notificações

Notificações fazem parte do MVP, limitadas às situações acordadas:

- ações que tenham horário;
- lembrete da revisão semanal;
- pendências e ações vencidas.

Não estão acordadas notificações motivacionais aleatórias, campanhas ou outros tipos de alerta. Horários, canal, consentimento, limites e regras de repetição devem ser especificados no desenho técnico e de interação.

## 21. Aparência e tema

O **dark mode é o tema inicial**. A estrutura deve permitir oferecer light mode posteriormente, sem exigir sua implementação na V1.

As cores escolhidas para áreas precisam continuar distinguíveis e legíveis no tema escuro. Regras de contraste e acessibilidade devem ser determinadas no design system mínimo.

## 22. Onboarding vazio

A conta nova inicia em estado vazio, sem objetivos, ações, transações, registros de sono ou livros de demonstração. O onboarding não deve preencher dados fictícios. A pessoa começa adicionando seus próprios dados.

As áreas iniciais podem ser apresentadas como estrutura padrão personalizável; isso não autoriza a criação automática de metas, ações ou registros em nome do usuário.

## 23. Critério de sucesso do MVP

O MVP cumpre seu propósito quando a pessoa consegue completar o ciclo abaixo de maneira utilizável:

1. Planejar a semana com metas para cada área.
2. Registrar a execução diária, incluindo os módulos especializados pertinentes.
3. Acompanhar progresso e desempenho por área e por meta.
4. Fazer a revisão no domingo e identificar pendências.
5. Definir as metas da semana seguinte.

## 24. Regras de negócio e casos-limite

1. Uma área só recebe nota se tiver pelo menos uma meta semanal.
2. O número de áreas não é fixo; nome, cor e ícone são personalizáveis.
3. Os módulos especializados não restringem a criação de áreas livres.
4. Meta diária pode ser convertida para um alvo semanal, preservando os registros diários. `10 páginas/dia = 70 páginas/semana` no exemplo de sete dias.
5. A meta pode exceder 100% de execução; a nota correspondente permanece limitada a 10/10.
6. A composição da área usa média simples das metas; metas não têm pesos no MVP.
7. Ações não pontuam de novo uma execução já contabilizada em métrica quantitativa.
8. Ações vencidas permanecem vencidas até uma alteração explícita.
9. Revisão não concluída permanece pendente; é obrigatória para todas as áreas.
10. Reflexão dentro da revisão é opcional.
11. Revisão concluída salva snapshot imutável.
12. Saúde contém somente Sono e Saúde Bucal; Treinos estão fora.
13. Rotina bucal usa tracker próprio, não a lista geral de ações.
14. O lançamento financeiro é manual na V1.
15. Cadastro manual de livro permanece disponível como fallback da API.
16. Onboarding não cria dados fictícios.
17. Dados de cada usuário devem ser isolados por `user_id` e RLS.
18. Botão de privacidade oculta valores financeiros e textos sensíveis, mas mantém nomes de áreas e indicadores.

Os itens a seguir são exemplos de cálculos confirmados:

|               Planejado |   Realizado | Percentual exibido |   Nota |
| ----------------------: | ----------: | -----------------: | -----: |
|              70 páginas |  56 páginas |                80% | 8,0/10 |
|              70 páginas | 100 páginas |               143% |  10/10 |
| Metas em 100%, 80%, 60% |           — |         Média: 80% | 8,0/10 |

Tratamentos detalhados para ausências, valores inválidos, edição retroativa e arredondamento não foram definidos; devem ser resolvidos antes de serem codificados como comportamento de produto.

## 25. Fora do MVP e pontos futuros

### Explicitamente fora do MVP

- Treinos na área Saúde.
- Prioridade e descrição em ações.
- Pesos diferentes para metas no cálculo do desempenho.
- Integração bancária: finanças são manuais.
- Tema claro como tema entregue na V1 (a estrutura fica preparada).
- Notificações motivacionais aleatórias.

### Não especificado; não presumir como requisito

- Colaboração, compartilhamento de áreas ou projetos e uso familiar/equipe.
- Sincronização offline e estratégia de conflitos.
- Importação ou exportação de dados.
- Relatórios avançados, histórico analítico e comparação entre períodos.
- Integrações além de Supabase Auth/Google e possível API de livros.
- Gamificação, pontos, streaks ou recompensas.
- Regras completas de exclusão/arquivamento e restauração.
- Fórmulas específicas para todos os casos dos tipos Frequência, Média e Conclusão.
- Todos os detalhes de agendamento e entrega de notificações.

## 26. Critérios de aceite por módulo

| Módulo             | Critérios de aceite da V1                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta e isolamento | Pessoa entra com Google via Supabase Auth; registros têm proprietário; políticas RLS impedem acesso cruzado entre usuários.                                                                                                         |
| Áreas              | Conta inicia com as cinco áreas recomendadas ou estado configurável acordado; pessoa pode personalizar nome, cor e ícone e gerenciar áreas livremente.                                                                              |
| Objetivos          | Aceitam forma mensurável, percentual ou qualitativa e prazo opcional.                                                                                                                                                               |
| Metas e desempenho | Suportam Quantidade, Frequência, Média e Conclusão; metas diárias preservam registro diário e conversão semanal; exibem percentual e nota limitada a 10; média entre metas é simples e sem pesos; detalhamento mostra a composição. |
| Ações              | Permitem título e área obrigatórios; objetivo, data e horário opcionais; recorrência diária, semanal ou em dias específicos; status; não incluem prioridade nem descrição; vencidas seguem vencidas.                                |
| Revisão semanal    | Pode ser iniciada no domingo; percorre o resumo, áreas, pendências, metas seguintes e reflexão opcional; fica pendente até concluir; ao concluir grava snapshot imutável.                                                           |
| Dashboard          | Exibe resumo semanal, áreas, próximas ações, objetivos em foco e revisão; cards mostram `x/10` e percentual e abrem a composição.                                                                                                   |
| Leitura            | Cadastra os campos definidos, mantém registro diário de páginas e permite operação manual sem API.                                                                                                                                  |
| Finanças           | Registra manualmente receita e despesa, usa categorias, permite metas financeiras e oculta valores com o botão de privacidade.                                                                                                      |
| Carreira/Projetos  | Disponibiliza entidade Projetos dentro da área Carreira junto a objetivos, metas e ações.                                                                                                                                           |
| Mente e pessoal    | Permite check-in diário com humor e reflexão curta, registro de aprendizados e acesso à revisão semanal.                                                                                                                            |
| Saúde              | Apresenta Sono e Saúde Bucal; permite registro diário de horas de sono e metas; tracker bucal é separado das Ações; não apresenta Treinos.                                                                                          |
| Mobile/PWA         | Layout se adapta a desktop/iPad e mobile; o botão `+` oferece os seis registros rápidos definidos e encaminha cada registro ao módulo correto.                                                                                      |
| Privacidade        | Botão olho oculta valores financeiros e textos sensíveis e preserva os nomes de áreas e indicadores.                                                                                                                                |
| Notificações       | Há suporte aos três casos acordados: ações com horário, revisão semanal e pendências/vencidas, conforme permissões e regras técnicas a definir.                                                                                     |
| Aparência e início | Tema escuro é o inicial; conta nova não tem dados fictícios.                                                                                                                                                                        |

## 27. Próximas fases recomendadas

1. **Modelo de dados:** definir entidades e relações para usuários, áreas, módulos, objetivos, metas, registros diários, ações, revisões/snapshots, livros, lançamentos financeiros, projetos e check-ins; detalhar RLS e retenção.
2. **Protótipo mobile:** validar o Dashboard, o botão `+`, registros rápidos e fluxo de revisão no uso em tela pequena.
3. **Design system mínimo:** especificar componentes, tipografia, cores do tema escuro, estados, feedback, contraste e comportamento responsivo; preparar tokens para light mode futuro.
4. **Implementação:** começar por autenticação e isolamento, áreas, metas e motor de desempenho; depois ações, revisão/dashboard e módulos especializados; finalizar com PWA e notificações conforme as regras técnicas aprovadas.

### Pendências de produto que devem ser fechadas antes ou durante o modelo de dados

- Definição exata de semana e período da revisão.
- Regras completas de cálculo para Frequência, Média e Conclusão, e dados ausentes.
- Política de edição retroativa e efeito em desempenho e snapshots.
- Campos e estados detalhados dos módulos ainda não especificados.
- Comportamentos ao remover áreas com dados associados.
- Regras de permissão, horário e repetição das notificações.
- Quais textos são ocultados pela privacidade e como a preferência é mantida.

Essas pendências não alteram as decisões fechadas acima; evitam que detalhes em aberto sejam confundidos com requisitos já aprovados.
