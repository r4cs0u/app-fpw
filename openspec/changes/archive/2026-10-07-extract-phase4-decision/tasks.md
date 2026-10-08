# Tasks

## 1. Caracterização do comportamento atual

- [x] 1.1 Criar `tests/fase4.test.js` com um documento simulado (campos de texto, linhas, selects `lstNome<N>`, opção 48, `radConfirma`) e testes que fixam o comportamento atual de `processarFase4`: quais campos viram 48 e em que ordem, retorno `nsMarcados`, aviso quando faltam linha, select ou opção 48, evento `cod47` no log, escopo do mês alvo e da semana de transição, e interrupção quando a execução fica inativa. Verificar com `node --test tests/fase4.test.js` passando sobre o código atual, antes de qualquer alteração.
- [x] 1.2 Acrescentar em `tests/regras-folha.test.js` e `tests/fase4.test.js` um teste de que, sobre o mesmo documento simulado, as datas de `AF.analisar.coletarDiasCod47` e as datas dos campos que a Fase 4 altera são o mesmo conjunto, na mesma ordem. Verificar passando sobre o código atual.

## 2. Extração da decisão

- [x] 2.1 Em `37-regras-folha.js`, criar `AF.regras.selecionarCamposCod47(campos, alvo, opcoes)` e reescrever `selecionarDiasCod47` sobre ela. Verificar em `tests/regras-folha.test.js`: os testes existentes de `selecionarDiasCod47` continuam passando e há casos novos para `indice`, `num`, valores com espaços, datas ausentes ou inválidas e `somenteMesAlvo`.
- [x] 2.2 Em `40-fases.js`, fazer `processarFase4` montar os descritores e consumir a lista da função pura, mantendo `exigirEstrutura`, a verificação de execução ativa, os eventos de DOM, os avisos e o log idênticos. Se couber, compartilhar a montagem de descritores com `AF.analisar.coletarDiasCod47`. Verificar com `node --test`: os testes de caracterização de 1.1 e 1.2 passam sem alteração.

## 3. Documentação e validação

- [x] 3.1 Atualizar `SSD.md` (responsabilidade de `37-regras-folha.js` e fronteira da Fase 4) e a Etapa 3 do `ROADMAP.md`; verificar com `Select-String -Pattern 'Fase 4' SSD.md ROADMAP.md` que o texto descreve a extração feita e remove o "próximo passo".
- [x] 3.2 Rodar `node --test` completo e `openspec validate extract-phase4-decision --strict`, sem falhas.
- [x] 3.3 Validação de runtime somente de observação na branch `test` (sem Ajustar e sem gravar): comparar, em folhas reais, a contagem de Cód 47 da Análise com os campos que a decisão extraída selecionaria, lendo a página; registrar o resultado no `ROADMAP.md` antes de arquivar.
