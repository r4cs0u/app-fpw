# Proposal

## Why

As marcações de ponto deveriam ser feitas no momento em que a pessoa chega ou sai; a marcação manual (`*`) é feita depois, normalmente no fim do mês. Hoje o relatório não mostra a origem das marcações de cada folha, então não há como destacar quem preencheu a folha manualmente. A origem já é lida pelo detector (relógio/biometria, web, mobile e manual), mas é descartada antes de chegar ao relatório.

## What Changes

- A leitura da folha passa a contar, por funcionário e somente no mês alvo, quantas marcações são de cada tipo: biometria (relógio de ponto, sem sufixo), Web (`W`), Mobile (`M`) e Manual (`*`). Por dia entram apenas a primeira entrada e a última saída, na regra já usada pelo detector. Marcações intermediárias não entram, pois são criadas pelo próprio sistema.
- Nova coluna **Marcações** na tabela do relatório, entre `% Não Preench.` e `HE 100%`, no formato compacto `30* · 20W · 10M · 5B`: manuais primeiro e em vermelho, tipos com zero omitidos, e dica de contexto com o detalhamento, o total e o percentual de manuais.
- Ordenação pela coluna Marcações sempre pela quantidade de manuais.
- Nova linha de indicadores **Marcações** (roxo), entre Irregularidades e Hora Extra, com o total do time por tipo (Manuais, Web, Mobile, Biometria). O indicador Manuais filtra a tabela pelos funcionários com pelo menos uma marcação manual e se soma aos demais filtros.
- A cópia TSV do relatório ganha as quatro colunas de contagem por tipo.
- O log de análise registra as contagens por tipo de cada folha.
- A marcação manual não é irregularidade: não entra nos totais de irregularidades, no texto de irregularidades nem na exportação do time.
- Dados anteriores à mudança (sem a contagem) aparecem como `-` até a próxima Análise ou Ajuste; nenhuma migração.

## Capabilities

### New Capabilities

### Modified Capabilities
- `sheet-irregularities`: nova contagem de marcações por origem, no mês alvo, igual na Análise e no Ajuste.
- `team-report`: coluna Marcações (exibição, dica, dados antigos), ordenação por manuais e colunas novas na cópia TSV.
- `report-summary`: linha de indicadores Marcações em quatro linhas temáticas e filtro pelo indicador Manuais.
- `activity-log`: o registro de análise inclui as contagens de marcações por tipo.

## Impact

- Código: `25-detector.js`, `50-analisar.js`, `40-fases.js`, `27-modelo-relatorio.js`, `60-relatorios.js` (e CSS embutido da janela do relatório).
- Testes: `tests/detector.test.js`, `tests/analise.test.js`, `tests/relatorios.test.js`, `tests/modelo-relatorio.test.js` e `tests/log.test.js`, conforme a cobertura de cada ponto.
- Documentação: `SSD.md` e `README.md` se citarem as colunas do relatório.
- Sem mudança em `99-main.user.js`, portanto sem reinstalar o Tampermonkey para validar.
