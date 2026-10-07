# Tasks

## 1. Catálogo de sons

- [x] 1.1 Em `70-sons.js`, remover o som `copia`, remover o atraso de 900 ms de `fim` e o comentário que o justifica, e adicionar o som `falha` (duas notas descendentes graves, forma `square`, claramente distinto de `parada`); atualizar o comentário da API pública. Verificar com `node --test tests/sons.test.js`: com `AudioContext` simulado, `tocar('copia')` não agenda nada, `tocar('falha')` agenda notas e `tocar('fim')` agenda a primeira nota sem deslocamento inicial.
- [x] 1.2 Criar `tests/sons.test.js` com o carregador de módulo no padrão dos demais testes e os casos do item 1.1; verificar que a suíte inteira (`node --test`) continua passando.

## 2. Painel: Relatório e Parar

- [x] 2.1 Em `80-painel.js`, remover a chamada `AF.sons.tocar('copia')` do botão Relatório e fazer o botão Parar tocar `parada` somente quando `AF.estado.rodando` for verdadeiro. Verificar em `tests/panel-status.test.js`, com um `AF.sons.tocar` que registra chamadas: clicar em Relatório abre a janela sem nenhum som; Parar com `rodando: true` toca `parada` uma vez; Parar com `rodando: false` não toca som.

## 3. Ajuste: início e falha

- [x] 3.1 Em `40-fases.js` (`processarTodas`), mover `AF.sons.tocar('inicio')` para logo depois de `exigirEstrutura('inicio do ajuste', ...)` bem-sucedido. Verificar em `tests/ajuste-log.test.js` (ou `structure.test.js`, onde já se simulam pré-condições): estrutura inválida resulta em nenhuma chamada de `inicio` e uma de `falha`; estrutura válida toca `inicio` antes do processamento da primeira folha.
- [x] 3.2 Em `00-core.js` (`pararExecucaoAjuste`), tocar `falha` uma vez quando `outcome.status !== 'cancelled'` e a execução ainda estava ativa na entrada da função; não tocar nesse caso quando `status === 'cancelled'` (parada do usuário) nem quando a execução já estava inativa. Verificar em `tests/popup-waits.test.js` ou `tests/structure.test.js`: erro durante a execução toca `falha` uma vez e nenhum `fim`; segundo erro após cancelamento não toca; `cancelled` com `user-stop` não toca `falha`.
- [x] 3.3 Conferir que `fim` continua tocando apenas em conclusão sem cancelamento no final de `processarTodas` e sem espera prévia; cobrir em `tests/ajuste-log.test.js`: execução concluída registra a sequência `inicio`, `fim`; execução parada registra `inicio` e nenhum `fim`.

## 4. Análise: início e falha

- [x] 4.1 Em `50-analisar.js` (`analisarTodas`), mover `AF.sons.tocar('inicio')` para depois de localizada a lista de funcionários e tocar `falha` no ramo em que ela não é encontrada. Verificar em `tests/analise.test.js`: sem lista toca só `falha`; com lista toca `inicio` e, ao concluir, `fim`; análise cancelada não toca `fim`.

## 5. Documentação e validação

- [x] 5.1 Atualizar `SSD.md` (linha de `70-sons.js` e a linha da tabela de esperas que cita o atraso de 900 ms, que deixa de existir) e o `README.md` se citar sons; verificar com `Select-String -Pattern '900|copia' SSD.md README.md` que não restam referências ao atraso nem ao som de cópia.
- [ ] 5.2 Atualizar `ROADMAP.md` marcando `fix-run-sounds` como concluída apenas depois da validação manual; verificar o texto do roadmap.
- [x] 5.3 Rodar `node --test` completo e `openspec validate fix-run-sounds --strict`, e confirmar saída sem falhas.
- [ ] 5.4 Validação manual na branch `test`, sem gravação: ouvir `inicio`, `fim`, `parada` e `falha` em Análise e Ajuste (a falha com o Ajuste fora da estrutura esperada) e confirmar que abrir o Relatório não toca nada. Registrar o resultado em `ROADMAP.md`.
