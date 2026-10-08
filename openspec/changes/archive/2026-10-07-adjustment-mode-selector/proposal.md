## Why

Hoje o Ajuste percorre a lista de funcionários em sequência até o último nome, sem pausa para o usuário conferir o que será alterado. O responsável quer poder trabalhar folha a folha, vendo antes um resumo do que está previsto e confirmando explicitamente cada aplicação, e quer escolher entre esse modo e o atual na própria interface, sem que os dois convivam. É o item I2 da fila de melhorias de 2026-10-07 e reforça a supervisão humana antes de qualquer gravação, como pede a Etapa 4 do roadmap.

## What Changes

- Novo seletor no painel com os modos **Automático** (comportamento atual: percorre a lista até o último nome) e **Supervisionado**. Exatamente um modo fica ativo; o padrão é Automático; a escolha persiste na sessão e fica travada durante uma execução.
- No modo Supervisionado, Ajustar abre uma janela com a pré-análise da folha atual (produzida por `supervised-preanalysis`) e pede confirmação. Aplicar executa todas as fases do Ajuste somente nessa folha, sem avançar para outro funcionário. Cancelar, ou fechar a janela, não executa nada e volta ao estado ocioso.
- Sem folha selecionada, o aplicativo avisa para selecionar uma folha ou trocar para o modo Automático, e nada é iniciado.
- Ao aplicar, a mesma janela passa a mostrar o andamento e, ao fim, o resumo com o texto do detalhe de ajustes (de `report-row-adjustment-detail`) e o status final (concluído, parado ou interrompido).
- A confirmação revalida a folha: se o funcionário ou a estrutura da página mudaram desde a pré-análise, a aplicação é recusada.
- Novo som de atenção ao abrir a janela de confirmação; os demais sons seguem o contrato de `fix-run-sounds`.
- O modo Automático e o botão Analisar não mudam.

## Capabilities

### New Capabilities
- `adjustment-mode`: seleção excludente entre os modos Automático e Supervisionado, o fluxo de confirmação do modo Supervisionado, suas travas de segurança e o resumo final.

### Modified Capabilities

## Impact

- Código: `80-painel.js` (seletor de modo, estados, travas e texto das instruções), `40-fases.js` (`processarTodas` com escopo de uma folha, sem alterar o fluxo do modo Automático), `27-modelo-relatorio.js` (total opcional em `iniciarExecucao`), `70-sons.js` (som de atenção), novo módulo `65-supervisionado.js` (janela de confirmação, andamento e resultado), `99-main.user.js` (lista de módulos).
- Testes: `tests/panel-status.test.js`, `tests/ajuste-log.test.js` (escopo de uma folha), novo `tests/supervisionado.test.js` (janela simulada, revalidação, cancelamento) e testes de sons.
- Docs: `README.md`, `SSD.md`, `AGENT.md` (fluxo de aprovação humana) e o texto das instruções do painel; `ROADMAP.md`.
- Sensível: o fluxo grava no WebPonto depois da confirmação; a validação de runtime é controlada e segue a Etapa 4 e o `AGENT.md`.
- Dependências de ordem: `supervised-preanalysis` (resumo), `report-row-adjustment-detail` (texto do resultado) e `fix-run-sounds` (contrato de sons) devem estar aplicadas antes.
