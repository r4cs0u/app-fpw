# Tasks

## 1. Seletor de modo no painel

- [x] 1.1 Em `80-painel.js`, acrescentar o controle segmentado Automático/Supervisionado entre os botões e a barra de status, com padrão Automático, persistência em `sessionStorage` (`fpw.modoAjuste`) tolerante a falhas, indicação visível do modo e travas quando `AF.estado.rodando` ou `AF.estado.confirmacaoPendente` for verdadeiro; manter o painel dentro de `max-height`. Verificar em `tests/panel-status.test.js`: padrão Automático, troca exclusiva, persistência após recarregar o painel, valor inválido no armazenamento cai em Automático, seletor desabilitado durante execução e confirmação pendente.
- [x] 1.2 Atualizar o texto das instruções do painel (passo do Ajuste) para citar os dois modos e a orientação sobre popups. Verificar em `tests/panel-status.test.js` que o texto contém as duas opções.

## 2. Ajuste de uma folha com revalidação

- [x] 2.1 Em `27-modelo-relatorio.js`, aceitar `opcoes.total` em `iniciarExecucao` sem alterar o comportamento sem opções. Verificar em `tests/modelo-relatorio.test.js`: com `total: 1` a execução mostra 1 de 1 e a lista completa de nomes é registrada; sem opções, o total segue o número de nomes.
- [x] 2.2 Em `40-fases.js`, adicionar `opcoes` a `processarTodas` (`somenteFolhaAtual`, `nomeEsperado`): estrutura sem aceitar seleção vazia, recusa se o funcionário mudou (`stage` de revalidação, antes de registrar a execução no modelo), som de início só depois da revalidação, processamento da folha atual e saída sem `avancarFuncionario`. Verificar em `tests/ajuste-log.test.js`: sem opções o fluxo atual não muda; com `somenteFolhaAtual` só uma folha é processada e `avancarFuncionario` não é chamado; funcionário diferente do esperado resulta em falha sem nenhuma alteração; seleção vazia é recusada.

## 3. Janela de confirmação, andamento e resultado

- [x] 3.1 Criar `65-supervisionado.js` com a máquina de estados (ocioso, confirmando, aplicando, concluído, parado, interrompido) e a abertura da janela no gesto do clique, com a pré-análise, a orientação para o modo Automático, os botões Aplicar e Cancelar, o fechamento como cancelamento e a recusa em popup bloqueado. Verificar em `tests/supervisionado.test.js` com janela e documento simulados: abrir mostra a pré-análise e a orientação; cancelar e fechar voltam ao ocioso sem chamar o Ajuste; popup bloqueado avisa e não inicia; Aplicar duplo só dispara uma vez.
- [x] 3.2 Implementar o aviso de nenhuma folha selecionada e a folha sem marcações (sem opção de aplicar). Verificar em `tests/supervisionado.test.js`: seleção vazia mostra o aviso e não abre janela nem inicia execução; folha vazia informa que não há o que ajustar e não oferece Aplicar.
- [x] 3.3 Implementar a aplicação: ao confirmar, chamar `processarTodas({ somenteFolhaAtual: true, nomeEsperado })`, mostrar o andamento e, ao fim, o status (concluído, parado ou interrompido com motivo) e o texto de `AF.modelo.textoDetalheAjuste`. Verificar em `tests/supervisionado.test.js` com `processarTodas` simulado: cada desfecho mostra o status e o detalhe esperados e o funcionário selecionado não muda.
- [x] 3.4 Ligar o botão Ajustar do painel: modo Automático chama `processarTodas()` como hoje; modo Supervisionado chama o módulo. Registrar `65-supervisionado.js` em `99-main.user.js` após `60-relatorios.js`. Verificar em `tests/panel-status.test.js` e `tests/modules.test.js`: Automático não abre janela; Supervisionado abre; a lista de módulos carrega.

## 4. Sons

- [x] 4.1 Em `70-sons.js`, adicionar o som `atencao` e tocá-lo ao abrir a janela de confirmação, sem som de desfecho no cancelamento. Verificar em `tests/sons.test.js` e `tests/supervisionado.test.js`: `atencao` toca uma vez ao abrir; cancelar não toca nada; aplicar toca `inicio` após a revalidação e `fim` ao concluir.

## 5. Documentação e validação

- [x] 5.1 Atualizar `README.md`, `SSD.md` e `AGENT.md` (modos, confirmação humana antes da gravação, popups); verificar com `Select-String -Pattern 'Supervisionado' README.md SSD.md AGENT.md`.
- [x] 5.2 Rodar `node --test` completo e `openspec validate adjustment-mode-selector --strict`, sem falhas.
- [x] 5.3 Validação de runtime controlada na branch `test`, com o responsável: (a) em modo Supervisionado, abrir e cancelar a confirmação e fechar a janela, confirmando nenhuma alteração; (b) seleção vazia e folha sem marcações; (c) aplicar em uma folha de teste e conferir resultado, relatório, detalhe por linha e log; (d) trocar de funcionário com a janela aberta e confirmar a recusa. Registrar no `ROADMAP.md`; qualquer divergência vira nova change.
