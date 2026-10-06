# Proposal

## Why

Análise e Ajuste contam irregularidades por caminhos diferentes (`50-analisar.js` e `40-fases.js` usam textos de busca distintos), guardam só números e não registram os dias envolvidos. O log não tem horário, estado antes/depois nem decisões, é apagado a cada execução e o agrupamento por funcionário só funciona para o Ajuste. Isso impede tanto o diagnóstico de falhas quanto os relatórios planejados (colunas abertas, exportação de dias por pessoa, big numbers), que dependem de dados estruturados e confiáveis.

Esta é a fundação (change A) de uma entrega maior; o relatório unificado (B) e a exportação de irregularidades (C) consomem o que for criado aqui.

## What Changes

- Novo **detector de folha**: leitura da página em linhas estruturadas (dia, cabeçalho, `Marc1`/`Marc2`, `Irre`, `CodJust`) e função pura que devolve, por funcionário, os **dias** de cada irregularidade; as contagens passam a ser derivadas desses dias.
- Categorias detectadas:
  - **Sem Entrada/Saída**: consolida `marcação irregular`, `hora extra irregular` e `s/marc de entrada/saída`, contando cada linha de irregularidade.
  - **Interjornada**.
  - **Marcação britânica** (nova): só marcações manuais (`*`), entradas e saídas separadas, sequências de 3 ou mais com o mesmo minuto; o valor contado é o número de dias envolvidos.
  - **Folha não preenchida** (nova): ≤ 1/4 dos dias visíveis do mês com marcação, **ou** uma sequência não preenchida de 7 ou mais dias corridos; informa a porcentagem não preenchida.
- Análise e Ajuste passam a usar o mesmo detector; os números hoje exibidos continuam disponíveis, mas com a definição unificada de "Sem Entrada/Saída" e de Interjornada.
- Novo **log estruturado de atividades**: eventos com horário, execução (análise ou ajuste), funcionário, fase e dados; snapshots **antes e depois** por folha (dias-alvo, folgas, ausências, cod 47, irregularidades) e ações executadas (origem/destino, 47→48, motivo de folga presa, falhas e etapas); acumulado entre execuções e persistido em `sessionStorage`, sobrevivendo a recarregamentos da página e descartado ao fechar a aba.
- Novo botão **Log** no painel que abre uma janela com o texto completo do log, legível e copiável.
- Ajuste faz uma **pré-análise** da folha antes de qualquer alteração e registra a divergência em relação à análise anterior, sem interromper o ajuste.
- `PAGE_STRUCTURE.md` documenta o formato das marcações e das linhas de dia observado na página; `AGENT.md` registra as orientações de inspeção via MCP somente leitura e a proibição de detectar irregularidades pelo `innerText` das linhas.

Sem mudanças de comportamento nas operações que alteram dados (movimentação de folgas, 47→48, gravação). O relatório atual continua funcionando com os mesmos botões; sua reformulação fica no change B.

## Capabilities

### New Capabilities
- `sheet-irregularities`: leitura estruturada das linhas da folha e detecção, com dias associados, de Sem Entrada/Saída, Interjornada, Marcação britânica e Folha não preenchida.
- `activity-log`: log estruturado, acumulado e persistente das execuções de análise e ajuste, com estado antes/depois e janela de consulta/cópia.

### Modified Capabilities
- `fpw-automation`: o fluxo de ajuste passa a executar a pré-análise e a registrar eventos estruturados sem alterar suas condições de parada; o contrato de estrutura da página passa a descrever as marcações.

## Impact

- **Código novo:** módulo do detector (leitura + regras puras) e módulo do log estruturado/janela de log; registrados em `99-main.user.js` (muda a lista de módulos, exigindo atualizar a instalação Tampermonkey conforme `AGENT.md`).
- **Código alterado:** `00-core.js` (`AF.core.log`, estado), `40-fases.js` (análise da folha, pré-análise, eventos de ação), `50-analisar.js` (contagens via detector), `60-relatorios.js` (consome o log estruturado em vez da regex de separadores; tabela inalterada), `80-painel.js` (botão Log; deixa de limpar o log a cada execução).
- **Testes:** novos testes em `tests/` para leitura de marcações, britânica, folha não preenchida, consolidação e log; ajustes nos testes existentes se tocarem nas funções alteradas.
- **Documentação:** `PAGE_STRUCTURE.md`, `AGENT.md`, `SSD.md` e `ROADMAP.md`.
- **Sem dependências externas.**
