# Domínio compartilhado

O motor puro `performance/` implementa as regras v1 de metas, áreas e semanas. Não importa React, Supabase, DOM ou formatação local. Recebe metas normalizadas por adapters e devolve estados explícitos, breakdown e frações exatas serializáveis.

Use as frações de `exact` para agregar e apresentar resultados; os números aproximados são conveniências para gráficos, nunca a entrada de outra agregação. A formatação fica em `src/lib/formatting/performance.ts`.

Fontes MANUAL e MODULE estão implementadas; os adapters de Leitura e Estudos consultam seus registros canônicos, sem copiá-los para goal_records. ACTION permanece reservado no motor: concluir uma ação compartilhada não cria medição de domínio. Nenhum snapshot foi criado; a versão v1 deverá acompanhar snapshots futuros. Consulte `docs/fase-2.md`.

A Fase 3 adiciona apenas `reading/progress.ts` e um adapter em `features/reading/performance-adapter.ts`. Os arquivos do engine v1 permanecem idênticos. Os dados especializados não são copiados para goal_records. Consulte `docs/fase-3.md`.

As quatro áreas restantes adicionam `studies/`, `finances/`, `career/` e `health/`, cada qual com cálculos próprios. Estudos usa minutos e fontes compartilhadas; Finanças soma centavos em BigInt; Carreira deriva progresso de marcos datados; Saúde usa instantes/fusos e agendas de rotina. São funções puras, testáveis sem React ou Supabase. DTOs são contratos de entrada; não há acesso ao banco nestes módulos. O engine de desempenho v1 continua preservado. Contrato e resultados em `docs/areas-v1-entrega.md`.
