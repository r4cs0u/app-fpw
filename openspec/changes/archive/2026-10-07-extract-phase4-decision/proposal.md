## Why

A Fase 4 do Ajuste decide quais campos de código 47 passam a 48 dentro de `processarFase4`, misturando a regra de escopo (mês alvo mais a semana de transição) com os eventos de DOM que alteram os campos. A Análise conta os mesmos dias com outra implementação (`selecionarDiasCod47`, em `37-regras-folha.js`), e a consistência entre as duas só é garantida por duplicação do critério. Essa extração foi acordada na Etapa 3 do roadmap (2026-10-06) como próximo passo de separação das regras da página, e a pré-análise do modo Supervisionado precisa usar exatamente a mesma decisão que a gravação.

## What Changes

- Extrair a decisão "quais campos 47 passam a 48" para uma função pura em `37-regras-folha.js`, que recebe descritores de campos e o mês alvo e devolve, na ordem do DOM, os campos escolhidos com número e data. `selecionarDiasCod47` passa a ser derivada dessa função, de modo que a Análise e a Fase 4 usam o mesmo critério por construção.
- `processarFase4` passa a consumir essa lista e a manter apenas a parte de DOM: localizar a linha, o select e a opção 48, disparar os eventos e registrar o log.
- Escrever, antes da extração, testes de caracterização do comportamento atual da Fase 4, e um teste de que a Análise e a Fase 4 enxergam o mesmo conjunto de dias.
- Nenhuma mudança de comportamento: a mesma folha continua gerando os mesmos campos alterados, o mesmo log e a mesma gravação.

## Capabilities

### New Capabilities

### Modified Capabilities

Nenhuma. É uma extração sem mudança de comportamento observável; por isso a change declara `skip_specs: true`. O requisito vigente de que a Análise conta o código 47 no mesmo escopo do Ajuste (`team-report`) continua válido e passa a ser garantido por teste.

## Impact

- Código: `37-regras-folha.js` (nova função pura e `selecionarDiasCod47` derivada), `40-fases.js` (`processarFase4`) e `50-analisar.js` (`coletarDiasCod47`, se precisar adaptar os descritores).
- Testes: `tests/regras-folha.test.js` (função pura e equivalência com a Análise) e um novo teste de caracterização da Fase 4 com documento simulado.
- Docs: `SSD.md` (responsabilidade de `37-regras-folha.js` e fronteira da Fase 4); `ROADMAP.md` (Etapa 3, ao concluir).
- Validação: somente observação em runtime antes de arquivar, sem executar gravação, conforme o acordo de 2026-10-06.
- Fora do escopo: envio dos eventos, `gravar` e demais interações de gravação; leitura e navegação da lista de funcionários em `processarTodas`; laço de `analisarTodas`.
