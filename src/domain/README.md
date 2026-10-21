# Domínio compartilhado

O motor puro `performance/` implementa as regras v1 de metas, áreas e semanas. Não importa React, Supabase, DOM ou formatação local. Recebe metas normalizadas por adapters e devolve estados explícitos, breakdown e frações exatas serializáveis.

Use as frações de `exact` para agregar e apresentar resultados; os números aproximados são conveniências para gráficos, nunca a entrada de outra agregação. A formatação fica em `src/lib/formatting/performance.ts`.

Fontes MANUAL estão implementadas. MODULE/ACTION têm apenas discriminação conceitual; futuros adapters consultarão seus registros canônicos, sem copiá-los para goal_records. Nenhum snapshot foi criado; a versão v1 deverá acompanhar snapshots futuros. Consulte `docs/fase-2.md`.
