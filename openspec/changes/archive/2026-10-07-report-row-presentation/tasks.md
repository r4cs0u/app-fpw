# Tasks

## 1. Pulso da linha em processamento

- [x] 1.1 Em `60-relatorios.js`, remover o selo `badge-proc` de `gerarTbodyHTML`, trocar o keyframe do pulso para animar o fundo de `tr.row-processing`, acrescentar `aria-current="true"` à linha e respeitar `prefers-reduced-motion`. Verificar em `tests/relatorios.test.js`: a linha do funcionário atual tem a classe `row-processing`, o HTML não contém "processando" e as demais linhas não têm a classe.
- [x] 1.2 Reestruturar a célula do nome com um `span` truncável e o selo de parcial sem corte. Verificar em `tests/relatorios.test.js`: a linha parcial contém o selo e o nome dentro de um contêiner próprio, e o CSS do esqueleto contém a regra de reticências do nome.

## 2. Linha mesclada para folha sem marcações

- [x] 2.1 Em `gerarTbodyHTML`, renderizar para `d.vazia` o nome seguido de um `<td colspan>` com "Sem Marcações na Folha", com `colspan` derivado do número de colunas do cabeçalho, e remover o selo "s/ marcações". Verificar em `tests/relatorios.test.js`: a linha vazia tem exatamente duas células, a segunda com `colspan` igual ao total de colunas menos um e o texto esperado, sem `-` por coluna nem selo.
- [x] 2.2 Cobrir a convivência com filtros, ordenação e exportação. Verificar em `tests/relatorios.test.js` e `tests/modelo-relatorio.test.js`: com filtro por indicador ativo a linha vazia não aparece; sem filtro aparece; o TSV e `textoIrregularidades` continuam ignorando a linha vazia.

## 3. Documentação e validação

- [x] 3.1 Atualizar `SSD.md` e `README.md` onde descreverem selos ou linha sem marcações; verificar com `Select-String -Pattern 'processando|s/ marca' README.md SSD.md` que não restam descrições antigas.
- [x] 3.2 Rodar `node --test` completo e `openspec validate report-row-presentation --strict`, sem falhas.
- [ ] 3.3 Validação manual na branch `test`, somente leitura: abrir o relatório durante uma Análise e conferir o pulso e a ausência de texto; conferir um funcionário sem marcações; registrar no `ROADMAP.md`.
