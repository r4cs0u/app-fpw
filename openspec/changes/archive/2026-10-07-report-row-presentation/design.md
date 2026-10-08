## Context

A janela do relatório é gerada por `60-relatorios.js`. `gerarTbodyHTML` monta cada linha; o nome vai em `td:first-child` (largura fixa de 180 px, `white-space:nowrap`, `overflow:hidden`, `text-overflow:ellipsis`), com os selos `badge-proc`, `badge-parcial` e `badge-vazia` anexados ao nome. O selo é cortado quando o nome abreviado já ocupa a célula. A classe `row-processing` já existe (fundo azul leve) e o keyframe `pulse` já existe, usado só pelo selo. Para folha sem marcações, `obterDadosFunc` devolve `vazia: true` e valores nulos; `AF.modelo.filtrar` já exclui essas linhas quando há filtro por indicador (os totais nulos não passam em `> 0`) e `ordenarPorExtremo`, o TSV e `textoIrregularidades` já as ignoram.

Ver proposal.md para a motivação e specs/team-report/spec.md para o contrato.

## Goals / Non-Goals

**Goals:**
- Indicar o funcionário em processamento só pelo pulso da linha.
- Mostrar "Sem Marcações na Folha" em uma célula mesclada.
- Garantir que o selo de parcial não seja cortado.

**Non-Goals:**
- Não mudar o modelo, as colunas, a ordenação, os filtros nem a exportação.
- Não adicionar texto de status em nenhum outro lugar da janela.
- Não mexer em como o relatório sabe qual funcionário está em processamento (`estado.atual`).

## Decisions

**1. O pulso fica na classe `row-processing`, animando o fundo da linha com um keyframe próprio.**
Reaproveita a classe existente. Animar `opacity` da linha reduziria a legibilidade; animar a cor de fundo (entre o fundo leve e um azul mais forte) mantém o texto legível. Alternativa descartada: manter um ponto pulsante dentro da célula do nome, que sofreria o mesmo corte.

**2. O pulso respeita `prefers-reduced-motion`.**
Com redução de movimento, a linha usa o fundo azul fixo já existente, sem animação, para continuar identificável.

**3. Nome em um `span` com reticências e selo de parcial fora do corte.**
A célula do nome passa a usar flex: o `span` do nome encolhe com `text-overflow:ellipsis` e o selo de parcial tem `flex-shrink:0`. Alternativa: alargar a coluna, o que desperdiça espaço nas demais colunas. O selo "s/ marcações" é removido porque a linha mesclada já diz isso.

**4. Linha sem marcações: `<td>` do nome e um `<td colspan>` com o texto, cobrindo as 9 colunas de dados e a coluna do ícone de cópia.**
O ícone de cópia dessa linha já ficava desabilitado, então a célula mesclada o inclui. O `colspan` é calculado a partir do número de colunas de `gerarTheadHTML`, não fixo, para não quebrar quando a mudança de filtros (próxima da fila) ou o detalhe por linha acrescentarem colunas.

**5. Ordenação e filtros das linhas sem marcações ficam como estão.**
Elas já se comportam como "zerado" na ordenação e saem quando há filtro por indicador; só a apresentação muda. A linha mesclada mantém `data-nome`, então clicar nela continua navegando para o funcionário.

## Risks / Trade-offs

- [Animar o fundo de várias linhas se o modelo marcar mais de uma como atual] → só `estado.atual` recebe a classe, uma linha por vez.
- [Células mescladas quebram a largura do `table-layout:fixed`] → `colspan` somado às demais colunas mantém a soma; coberto em teste de HTML.
- [Perder o texto "processando" reduz acessibilidade] → a linha em processamento recebe `aria-current="true"` e `title` na linha, sem texto visível na célula do nome.
