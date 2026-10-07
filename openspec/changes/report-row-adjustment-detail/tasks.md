# Tasks

## 1. Registro das ações no modelo

- [x] 1.1 Em `27-modelo-relatorio.js`, estender `registrarAjuste` e `registrarAjusteParcial` para receber `acoes` e `cod47Dias`, acumulando em `f.ajuste.acoes` e `f.ajuste.cod47Dias` (sem repetir dias) e mantendo o descarte feito por `registrarAnalise`. Verificar em `tests/modelo-relatorio.test.js`: acúmulo em dois Ajustes, descarte pela Análise, parcial sem dias de código 47 e restauração de um registro antigo sem os campos.
- [x] 1.2 Criar `AF.modelo.textoDetalheAjuste(nome)` conforme a spec (nome sem sufixo, seções omitidas quando vazias, datas ordenadas e sem repetição, parcial, restantes, "Nenhum ajuste registrado"). Verificar em `tests/modelo-relatorio.test.js` com os cenários da spec, usando nomes fictícios.

## 2. Coleta durante o Ajuste

- [x] 2.1 Em `40-fases.js`, zerar `AF.estado.acoesFolhaAtual` e `AF.estado.cod47DiasFolhaAtual` no início de `processarFolhaAtual`, acrescentar cada ação em `registrarAcaoFolga` (destino, origem, resultado) e cada data de 47 convertido em `processarFase4`, e passar as listas a `registrarAjuste` e `registrarAjusteParcial`. Verificar em `tests/ajuste-log.test.js`: ações das fases 1 a 3 chegam ao modelo na ordem, a folha seguinte começa com listas vazias, e uma folha interrompida registra as ações sem dias de código 47.

## 3. Interface do relatório

- [x] 3.1 Em `60-relatorios.js`, adicionar a coluna de detalhe (cabeçalho e botão por linha, desabilitado sem Ajuste), o estado `estadoVisao.expandidos`, a linha `detail-row` com `<pre>` escapado e o tratamento do clique sem propagar à linha. Verificar em `tests/relatorios.test.js`: expandir e recolher, botão desabilitado para analisado e sem marcações, clique sem navegar nem selecionar, e detalhe preservado após nova renderização.
- [x] 3.2 Conferir que a célula mesclada de folha sem marcações e o `colspan` continuam corretos com a coluna nova. Verificar em `tests/relatorios.test.js` que o `colspan` da linha vazia acompanha o número de colunas do cabeçalho.

## 4. Documentação e validação

- [x] 4.1 Atualizar `README.md` e `SSD.md` (detalhe por linha, dados guardados no modelo); verificar com `Select-String -Pattern 'detalhe' README.md SSD.md`.
- [x] 4.2 Rodar `node --test` completo e `openspec validate report-row-adjustment-detail --strict`, sem falhas.
- [ ] 4.3 Validação de runtime na branch `test`: executar o Ajuste controlado em poucas folhas, conferir o detalhe contra o log e contra a folha, e registrar no `ROADMAP.md`. Conforme a Etapa 4, qualquer divergência vira nova change.
