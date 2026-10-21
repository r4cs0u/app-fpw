# Proposal

## Why

No modo Supervisionado, quando a folha atual não tem marcações, a janela de confirmação desabilita "Aplicar nesta folha" e mantém "Próxima folha" oculta (ela só aparece depois de um ajuste concluído). O usuário fica sem ação além de fechar, e a janela de fechar interrompe o fluxo da lista. O requisito atual de `adjustment-mode` ("apenas o fechamento") produz esse beco sem saída.

## What Changes

- Em folha sem marcações (na abertura da janela e depois de avançar para a próxima folha), a janela passa a oferecer "Próxima folha" e a ocultar "Aplicar nesta folha", mantendo "Cancelar/Fechar".
- Avançar a partir de uma folha vazia usa o mesmo avanço da lista que já existe após um ajuste concluído, registra no log que a folha foi pulada e registra a folha como sem marcações no relatório, como o modo Automático faz.
- Nenhuma alteração é executada na folha vazia.
- Verificação (sem mudança de código): a contagem de irregularidades e do "% da folha não preenchida" já considera somente o mês alvo; somente folgas (e o código 47 que as acompanha) usam mês + semana de transição. Um teste de regressão passa a travar essa regra.

## Capabilities

### New Capabilities

### Modified Capabilities
- `adjustment-mode`: o requisito "Folha sem marcações no modo Supervisionado" passa a exigir a opção de avançar para a próxima folha.

## Impact

- Código: `65-supervisionado.js`.
- Testes: `tests/supervisionado.test.js`, `tests/detector.test.js`.
- Documentação: `SSD.md` apenas se citar o comportamento do botão.
