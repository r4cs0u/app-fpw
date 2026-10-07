## Why

O modo Supervisionado (change `adjustment-mode-selector`) vai mostrar ao usuário, antes de qualquer alteração, um resumo do que o Ajuste pretende fazer na folha atual e pedir confirmação. Esse resumo precisa existir como leitura confiável, somente leitura e testada, antes de a interface depender dele. Hoje o sistema conta folgas a movimentar e dias de código 47, mas não lista os dias de cada folga, e não há um resumo único com intervalo analisado, irregularidades e horas. É o item I1 da fila de melhorias de 2026-10-07.

## What Changes

- Nova leitura da folha atual, somente leitura, que produz o resumo da pré-análise: nome, intervalo analisado (mês alvo mais a semana do último dia do mês), folgas a movimentar (quantidade e dias), códigos 47 a ajustar (quantidade e dias), resumo de irregularidades (Sem E/S, Interjornada, Britânicas e % não preenchida) e resumo de horas (HE 100%, HEF 100% e HEC 70%), com o aviso de que os valores podem mudar após o ajuste.
- Função pura que monta o resumo a partir da leitura e do mês alvo, e outra que o formata como texto, ambas testadas sem DOM.
- A regra de folgas a movimentar passa a poder listar os dias, e a contagem passa a ser o tamanho dessa lista, sem mudar o número que a Análise já produz.
- Folha sem marcações gera um resumo que informa que não há o que ajustar.
- Não há mudança visível ao usuário nesta change: a janela de confirmação e o seletor de modo ficam em `adjustment-mode-selector`.

## Capabilities

### New Capabilities
- `adjustment-preanalysis`: o que o resumo prévio de um Ajuste contém, de onde vêm seus valores e as garantias de leitura somente.

### Modified Capabilities

## Impact

- Código: `37-regras-folha.js` (listagem dos dias de folga e contagem derivada), novo módulo `38-preanalise.js` (montagem, texto e leitura da folha atual), `99-main.user.js` (lista de módulos baixados).
- Testes: `tests/regras-folha.test.js` e um novo `tests/preanalise.test.js`.
- Docs: `SSD.md` (novo módulo) e `ROADMAP.md`.
- Dependência de ordem: usa a decisão extraída em `extract-phase4-decision` para os dias de código 47 que a Fase 4 converte; deve ser aplicada depois dela.
- Sem escrita no WebPonto, sem popups e sem troca de funcionário.
