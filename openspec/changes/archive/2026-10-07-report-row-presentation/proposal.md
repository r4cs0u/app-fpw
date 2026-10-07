## Why

Na janela do relatório, o selo "processando" fica dentro da célula do nome, que tem largura fixa e corta o conteúdo, então o status nem sempre aparece. Funcionários sem marcações aparecem como uma linha de "-" em todas as colunas, o que não diz por que a linha está vazia. Os dois pontos são de apresentação da mesma linha da tabela e são os itens D e E da fila de melhorias de 2026-10-07.

## What Changes

- A linha do funcionário em processamento passa a pulsar, sem texto de status ao lado do nome; o pulso termina quando a execução termina, é parada ou falha.
- O selo "processando" é removido. Os selos "parcial" e "s/ marcações" deixam de ser cortados pela largura da coluna do nome.
- A linha de um funcionário sem marcações mostra, depois do nome, uma única célula mesclada com o texto "Sem Marcações na Folha", no lugar dos "-" por coluna. O selo "s/ marcações" deixa de ser necessário.
- Linhas sem marcações continuam fora dos indicadores, dos filtros por indicador, do texto copiado e da exportação de irregularidades.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-report`: muda como a janela indica o funcionário em processamento (pulso da linha, sem texto) e como a linha de folha sem marcações é apresentada (célula mesclada em vez de `-` por coluna).

## Impact

- Código: `60-relatorios.js` (`gerarTbodyHTML`, CSS do esqueleto da janela).
- Testes: `tests/relatorios.test.js`, com casos para a linha em processamento, a linha mesclada e a ausência de selo de texto.
- Docs: `SSD.md` e `README.md`, se descreverem os selos; `ROADMAP.md` ao concluir.
- Sem alteração do modelo, da leitura da folha, do Ajuste ou da exportação; nenhuma escrita no WebPonto.
