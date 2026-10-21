# Decisões complementares aprovadas após a Fase 0

Estas decisões atualizam os pontos em aberto do Contrato Funcional V1 sem alterar silenciosamente o documento original.

1. Semana de segunda 00:00 até o fim de domingo no fuso do usuário. A implementação consulta o intervalo semiaberto [segunda 00:00, próxima segunda 00:00), incluindo também frações do último segundo do domingo.
2. Fuso inicial America/Sao_Paulo, editável.
3. Snapshot captura exatamente o momento da conclusão da revisão.
4. Revisões atrasadas não bloqueiam a revisão atual.
5. Meta criada no meio da semana usa o alvo informado, sem prorrateamento automático.
6. Frequência define sua unidade de ocorrência.
7. Média usa registros existentes e mostra cobertura; ausência não vira zero.
8. Conclusão binária: 0% ou 100%.
9. Percentual individual pode superar 100%, mas sua contribuição para a média da área é limitada a 100%. Ex.: 200% e 0% resultam em 50% na área. Esta decisão substitui a leitura literal anterior da média sem teto individual.
10. Semana agrega por média simples das áreas calculáveis.
11. Área sem meta: “Sem meta semanal”, sem nota zero.
12. Sem arredondamento intermediário; nota exibida com uma casa decimal.
13. Correções operacionais nunca modificam snapshots concluídos.
14. Sem gravação offline no MVP.
15. Um estado global de privacidade.

A Fundação foi preservada. A Fase 2 implementa planejamento e desempenho; revisão e snapshots continuam reservados. Veja `fase-2.md` para decisões de implementação e limites.

- O contexto de fuso de uma semana persistida permanece estável; editar o perfil afeta semanas novas.
- Média manual aceita uma observação por dia, cobertura esperada configurável de 1 a 7.
- Frequência explicita contagem por ocorrências ou por dias distintos.
- Tipo, unidade, base e modo de frequência ficam protegidos depois do primeiro registro. Título, alvo e vínculo opcional ao objetivo continuam editáveis.
- Objetivos têm progresso manual independente das metas semanais.
- Metas podem ser retiradas do cálculo, registros removidos logicamente e vínculos históricos usam RESTRICT.

## Detalhamento da vertical Leitura — Fase 3

- Associações de módulo por ID da área, com bibliotecas separadas por associação.
- Página atual derivada; página inicial é contexto, não execução semanal.
- Excesso do total conhecido é rejeitado; conclusão é explícita.
- Logs corrigíveis e removidos logicamente, protegidos por idempotência e controle transacional por livro.
- Fonte MODULE/READING/PAGES_READ exclusiva, com escopo explícito. Não há cópia para goal_records.
- MANUAL com histórico não é convertida silenciosamente. Depois de vinculada a MODULE, a fonte é protegida.
- Open Library é conveniência desacoplada, com metadados revisáveis, capas opcionais por URL e fallback manual.
- Sem releitura ou posição física independente nesta vertical.

Modelo e justificativas completos em `fase-3.md`.
