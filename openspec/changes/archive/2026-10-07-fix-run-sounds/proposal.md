## Why

Os sons de início, fim e parada foram pensados quando o relatório era gerado só ao final da execução. Hoje o relatório é vivo e os sons ficaram desalinhados: tocam um som de cópia sem utilidade ao abrir o relatório, o fim espera 900 ms por esse som, o Ajuste anuncia "início" antes de validar as pré-condições, uma interrupção por erro não tem som, e Parar toca mesmo sem execução. É a primeira melhoria da fila de 2026-10-07 e fecha o comportamento sonoro antes de novas funções que dependem dele (modo Supervisionado).

## What Changes

- Remover o som de "cópia" ao abrir o Relatório; o som deixa de existir.
- O som de conclusão passa a tocar sem atraso fixo.
- O Ajuste só toca o som de início depois de passar as pré-condições estruturais da página; se elas falharem, toca o som de falha e nunca o de início.
- Nova interrupção por erro (falha) de Ajuste ou Análise toca um som de falha próprio, distinto do de parada.
- Parar só toca o som de parada quando há uma execução em andamento.
- Cada execução toca exatamente um som de desfecho: conclusão, parada pelo usuário ou falha.
- Testes automatizados verificam quando cada som é, ou não é, acionado.

## Capabilities

### New Capabilities
- `run-sounds`: quais sons existem e quando são acionados no início, conclusão, parada e falha das execuções de Análise e Ajuste.

### Modified Capabilities

## Impact

- Código: `70-sons.js` (catálogo), `80-painel.js` (botões Relatório e Parar), `40-fases.js` e `50-analisar.js` (momento de início e conclusão), `00-core.js` (`pararExecucaoAjuste`, ponto único das interrupções por erro do Ajuste).
- Testes: `panel-status.test.js`, `ajuste-log.test.js`, `analise.test.js`, `structure.test.js` e `popup-waits.test.js` hoje usam `sons` como stub vazio; passam a registrar chamadas onde o comportamento é verificado.
- Docs: `SSD.md` (linhas sobre `70-sons.js` e o atraso de 900 ms); `ROADMAP.md`.
- Sem alteração de gravação, seleção de funcionário, popups ou leitura da folha; nenhum efeito sobre dados do WebPonto.
