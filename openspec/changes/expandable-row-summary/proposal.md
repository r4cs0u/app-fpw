## Why

Atualmente, o botão da lupa (🔍) no relatório expande a linha exibindo exclusivamente os detalhes de ajustes efetuados (folgas movimentadas, presas e códigos 47). No entanto, o usuário deseja utilizar essa mesma visualização detalhada para auditar de forma rápida e consolidada não apenas os ajustes, mas todos os detalhes das colunas do relatório: folgas movimentadas, folgas presas, dias sem entrada/saída, dias de interjornada, dias com marcação britânica e porcentagem da folha não preenchida. Além disso, a regra atual de exportação de irregularidades omite as demais ocorrências quando a folha é sinalizada como não preenchida; o usuário solicitou desfazer essa supressão para que todas as irregularidades sejam sempre listadas.

## What Changes

- Expandir o conteúdo renderizado na linha detalhe (lupa 🔍): além dos ajustes já existentes (folgas movimentadas, presas, códigos 47), incluir seções para:
  - Dias Sem Entrada/Saída
  - Dias de Interjornada
  - Dias com Marcação Britânica
  - % da folha não preenchida (exibindo apenas o percentual, sem dias)
- O botão da lupa 🔍 deve estar habilitado para qualquer funcionário processado que possua dados relevantes (ajustes ou irregularidades).
- Alterar `AF.modelo.textoIrregularidades`: quando a folha possuir % de não preenchimento, exibir o aviso de preenchimento E TAMBÉM listar as demais irregularidades existentes (sem E/S, interjornada, britânicas), em vez de suprimi-las.

## Capabilities

### Modified Capabilities
- `team-report`: o detalhe expansível da linha passa a conter tanto o resumo de ajustes quanto as datas e detalhes das irregularidades.
- `irregularity-export`: a exportação de texto passa a incluir sempre todas as irregularidades mesmo quando a folha estiver com pendência de preenchimento.

## Impact

- `27-modelo-relatorio.js`: atualização de `AF.modelo.textoIrregularidades` (remover exclusão mútua de folha não preenchida) e `AF.modelo.textoDetalheAjuste` / novo gerador de detalhe completo consolidado.
- `60-relatorios.js`: condição de habilitação do botão 🔍 para contemplar irregularidades e ajustes; títulos e rótulos da visualização expandida.
- Testes: atualização de `tests/modelo-relatorio.test.js` e `tests/relatorios.test.js`.
