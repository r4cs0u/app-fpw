## Why

O filtro do relatório aceita um indicador por vez: clicar em outro substitui o anterior, então não dá para ver, por exemplo, quem tem Sem Entrada/Saída e também Interjornada. O filtro Movim. não retorna ninguém depois que o Ajuste roda, porque exige o estado "pendente", que só existe entre a Análise e o Ajuste. E não há como procurar um funcionário pelo nome. É o item F da fila de melhorias de 2026-10-07.

## What Changes

- Os indicadores passam a se somar: com Sem Entrada/Saída ativo, clicar em Interjornada acrescenta à tabela quem tem interjornada. Vale para todos os indicadores filtráveis; cada clique liga ou desliga só o indicador clicado.
- O filtro Movim. passa a listar os funcionários que têm folgas no indicador (a movimentar, movidas ou presas), com a coluna de folgas preenchida, antes e depois do Ajuste.
- Novo campo de busca por nome no relatório, sem diferenciar acentos nem maiúsculas, combinado por interseção com os indicadores ativos.
- A exportação de irregularidades passa a indicar no título todos os filtros ativos e a busca.
- Indicadores continuam refletindo o time inteiro, e o filtro por mínimo/máximo continua combinável com os demais.

## Capabilities

### New Capabilities

### Modified Capabilities
- `report-summary`: o requisito de filtro da tabela por indicador passa a permitir vários indicadores somados, define o que o filtro Movim. lista e acrescenta a busca por nome.
- `irregularity-export`: o título da exportação do time passa a indicar todos os filtros ativos e a busca.

## Impact

- Código: `27-modelo-relatorio.js` (`filtrar`, rótulos e `textoIrregularidadesTime`), `60-relatorios.js` (estado da visão, clique nos indicadores, campo de busca, rodapé, exportação).
- Testes: `tests/modelo-relatorio.test.js` e `tests/relatorios.test.js`, com casos de união, interseção com busca, Movim. após Análise e após Ajuste, busca com acentos e título da exportação.
- Docs: `README.md` e `SSD.md`; `ROADMAP.md` ao concluir.
- Sem alteração de leitura de folha, Ajuste ou gravação.
