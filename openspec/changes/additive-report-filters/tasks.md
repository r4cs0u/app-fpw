# Tasks

## 1. Regras puras de filtro e busca

- [x] 1.1 Em `27-modelo-relatorio.js`, criar a tabela de predicados por indicador (Movim. como `folgas.den > 0`) e reescrever `AF.modelo.filtrar(filtros, busca)` para aceitar lista ou id único, união entre indicadores, exclusão de não processados e de folha sem marcações quando há indicador, e interseção com a busca normalizada por palavras. Verificar em `tests/modelo-relatorio.test.js`: união sem duplicados, Movim. após Análise e após Ajuste (com presas e sem folgas), busca com acento e maiúscula, busca com várias palavras, busca sem indicador incluindo não processados, e id único continuando a funcionar.
- [x] 1.2 Atualizar `textoIrregularidadesTime(nomes, filtros, busca)` e os rótulos para montar o título com vários filtros e a busca, preservando a saída atual com zero ou um filtro. Verificar em `tests/modelo-relatorio.test.js`: títulos com nenhum, um, dois filtros e com busca.

## 2. Interface do relatório

- [x] 2.1 Em `60-relatorios.js`, trocar `estadoVisao.filtro` por `estadoVisao.filtros`, ligar e desligar cada indicador no clique, destacar todos os ativos e fazer `obterNomesVisiveis` e a exportação usarem lista e busca. Verificar em `tests/relatorios.test.js`: clique em dois cards deixa os dois destacados e a tabela com a união; novo clique desliga só um; o rodapé lista os rótulos.
- [x] 2.2 Acrescentar o campo de busca ao esqueleto da janela, montado uma vez, com atraso curto, botão para limpar e preservação durante as atualizações ao vivo. Verificar em `tests/relatorios.test.js`: digitar filtra a tabela, limpar restaura, o campo mantém o valor após uma atualização do modelo, e a exportação reflete a busca no título.

## 3. Documentação e validação

- [x] 3.1 Atualizar `README.md` e `SSD.md` (filtros somados, Movim., busca, título da exportação); verificar com `Select-String -Pattern 'filtro' README.md SSD.md` que nada descreve o filtro como único.
- [x] 3.2 Rodar `node --test` completo e `openspec validate additive-report-filters --strict`, sem falhas.
- [ ] 3.3 Validação manual na branch `test`, somente leitura: após uma Análise e após um Ajuste, conferir Movim., soma de indicadores, busca e exportação; registrar no `ROADMAP.md`.
