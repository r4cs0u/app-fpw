# Tasks

## 1. Supervisionado: avançar em folha vazia

- [x] 1.1 Em `65-supervisionado.js`, criar uma função única que define a visibilidade de "Aplicar nesta folha" e "Próxima folha" conforme `resumo.vazia`, chamá-la na abertura da janela e após cada avanço, e registrar no log (`AF.core.log`) a folha vazia pulada ao avançar. Verificar em `tests/supervisionado.test.js`: folha vazia na abertura mostra Próxima e oculta/desabilita Aplicar; avançar de folha vazia chama `avancarFuncionario` e carrega a nova pré-análise; próxima folha vazia mantém Próxima disponível; próxima com marcações volta a mostrar Aplicar; fim da lista oculta Próxima.
- [x] 1.2 Rodar `node --test tests/supervisionado.test.js` e confirmar que os testes existentes continuam passando.

## 2. Escopo de irregularidades: teste de regressão

- [x] 2.1 Em `tests/detector.test.js`, cobrir que linhas da semana de transição (mês seguinte) com dias sem marcação, Sem E/S, Interjornada e britânicas não alteram contagens, datas, `visiveis`, `preenchidos` nem `pctNaoPreenchida` do mês alvo. Verificar com `node --test tests/detector.test.js`.

## 3. Validação

- [x] 3.1 Rodar `node --test` completo e `openspec validate supervised-skip-empty-sheet --strict`.
- [ ] 3.2 Validação manual na branch `test`, sem gravação: abrir o Ajuste supervisionado em uma folha sem marcações e confirmar que "Próxima folha" aparece e avança.
