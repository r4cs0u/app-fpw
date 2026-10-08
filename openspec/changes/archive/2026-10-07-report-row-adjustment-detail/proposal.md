## Why

Depois de um Ajuste, a linha do relatório mostra só frações como `4/5`. Para saber quais folgas foram movimentadas, de qual dia para qual, quais ficaram presas e quais dias de código 47 foram convertidos, é preciso abrir a janela de log e procurar os eventos do funcionário. O log tem limites de memória e armazenamento e descarta eventos antigos, e o modelo do relatório guarda hoje só a contagem de movidas, as presas e as datas de código 47 da Análise. É o item G da fila de melhorias de 2026-10-07 e também fornece o texto reaproveitado depois pelo modo Supervisionado.

## What Changes

- O modelo do relatório passa a guardar, por funcionário, as ações de folga do Ajuste (dia de destino, dia de origem e resultado) e os dias de código 47 convertidos, acumulando entre Ajustes repetidos e sendo zerados por uma nova Análise, como as demais contagens do Ajuste.
- Cada linha ganha um botão que expande a própria linha com um resumo em árvore: folgas movimentadas (com resultado), folgas presas e códigos 47.
- O texto do resumo é gerado por uma função pura, testada sem DOM, no mesmo estilo do texto de irregularidades.
- O botão fica desabilitado para quem não tem Ajuste registrado, e clicar nele não navega nem seleciona a linha.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-report`: acrescenta o registro das ações do Ajuste por funcionário e o detalhe expansível por linha, sem alterar os requisitos existentes.

## Impact

- Código: `40-fases.js` (coleta das ações e dos dias de código 47 durante a folha), `27-modelo-relatorio.js` (registro, acumulação, texto do detalhe), `60-relatorios.js` (coluna e linha expansível).
- Testes: `tests/modelo-relatorio.test.js`, `tests/ajuste-log.test.js` e `tests/relatorios.test.js`.
- Dados: o registro persistido em `sessionStorage` cresce um pouco por funcionário; sem migração, pois registros antigos da sessão simplesmente não têm as ações e o detalhe os trata como ausentes.
- Docs: `README.md` e `SSD.md`; `ROADMAP.md` ao concluir.
- Sem alteração no que o Ajuste faz, na gravação ou nos popups.
