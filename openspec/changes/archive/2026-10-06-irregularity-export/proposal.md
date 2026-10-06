# Proposal

## Why

O relatório unificado já mostra, por funcionário, quantas irregularidades existem e o modelo guarda os dias de cada uma, mas hoje essas datas só aparecem em dicas de contexto. Quem precisa cobrar ajustes de cada pessoa tem de montar o texto à mão, olhando célula por célula. Agora que o modelo da mudança anterior (`unified-live-report`) mantém os dias disponíveis, falta apenas formatá-los em um texto pronto para copiar e colar em mensagens.

Esta é a mudança C de três (A: detector e log; B: relatório unificado; ambas arquivadas).

## What Changes

- **Texto de irregularidades por funcionário**, no formato:
  ```
  *Nome do Funcionário
  - s/marcação de entrada ou saída nos dias, 01/09, 03/09.
  - Checar se interjornada é devida nos dias, 07/09.
  - Ajustar marcações britânicas, nos dias 04/09, 05/09, 06/09.
  - Realizar o preenchimento da folha (73% dos dias sem marcação).
  ```
  Cada linha só aparece quando aquela irregularidade existe. As datas saem em `dd/mm`, em ordem cronológica e sem repetição.
- **Ícone por linha da tabela** que copia direto para a área de transferência o texto daquele funcionário, com confirmação visual. Fica desabilitado quando a pessoa não tem irregularidades e não aciona a navegação da linha.
- **Botão "Exportar irregularidades" no fim da tabela**, que abre uma janela com o texto de todos os funcionários **visíveis na tabela** (respeita o filtro por indicador e o extremo mín/máx), com título contendo o mês e, quando houver filtro, a indicação dele. A janela tem botão Copiar, segue o padrão da janela de log e é somente leitura.
- Ficam de fora do texto os funcionários não processados, os de folha sem marcações e os sem nenhuma irregularidade. Funcionários só analisados (sem Ajuste) são exportados normalmente.

Sem mudança no fluxo que altera dados, nas fases, nas esperas, na gravação nem nas condições de parada. Não há novo módulo nem mudança na ordem de carregamento.

## Capabilities

### New Capabilities
- `irregularity-export`: formato do texto de irregularidades por funcionário e do time, regras de inclusão e exclusão, cópia direta por linha e janela de exportação do time respeitando filtros.

### Modified Capabilities

## Impact

- **Código alterado:** `27-modelo-relatorio.js` (funções puras que montam o texto a partir do modelo), `60-relatorios.js` (coluna do ícone, botão no rodapé da tabela e janela de exportação).
- **Testes:** novos casos para o texto por pessoa, o texto do time com filtro, a ordenação e remoção de datas repetidas, as exclusões e a interação do ícone sem navegar.
- **Documentação:** `SSD.md` (janela de exportação e seus temporizadores), `README.md` e `ROADMAP.md` (C concluída).
- **Sem dependências externas.** Sem novo módulo, portanto sem exigir atualização da instalação Tampermonkey.
