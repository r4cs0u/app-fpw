# Tasks

## 1. Dias das folgas a movimentar

- [x] 1.1 Em `37-regras-folha.js`, criar `AF.regras.listarFolgasAMovimentar(mapa, alvo)` e reescrever `contarFolgasAMovimentar` como o tamanho dessa lista, sem mudar a regra de elegibilidade. Verificar em `tests/regras-folha.test.js`: os testes de contagem existentes continuam passando sem alteração, e há casos novos para a lista (dias, ordem de leitura, semanas com ausências do mês, folgas ocultas e repetição de data).

## 2. Montagem e texto do resumo

- [x] 2.1 Criar `38-preanalise.js` com `AF.preanalise.intervalo(alvo)` e testes. Verificar em `tests/preanalise.test.js`: setembro de 2026 resulta em `01/09/2026 até 04/10/2026 (34 dias)`, mês que termina em domingo termina nesse domingo, mês que termina na segunda inclui a semana inteira.
- [x] 2.2 Implementar `AF.preanalise.montar(leitura, alvo)` e `AF.preanalise.texto(resumo)` puros, incluindo a folha sem marcações, o nome sem sufixo numérico, dias únicos e ordenados, porcentagem só quando sinalizada e o aviso final. Verificar em `tests/preanalise.test.js` com os cenários da spec, usando nomes fictícios.
- [x] 2.3 Implementar `AF.preanalise.lerFolhaAtual()` como adaptador somente leitura sobre `AF.analisar.analisarFolhaAtual`, `AF.regras.listarFolgasAMovimentar` e a decisão de códigos 47 extraída em `extract-phase4-decision`. Verificar em `tests/preanalise.test.js` com documento simulado: a leitura não dispara eventos nem altera campos, não troca o funcionário, e as quantidades coincidem com as de `analisarFolhaAtual` sobre o mesmo documento.
- [x] 2.4 Registrar `38-preanalise.js` na lista de módulos de `99-main.user.js`, na ordem após `37-regras-folha.js`. Verificar com `node --test tests/modules.test.js` que o carregamento dos módulos segue válido.

## 3. Documentação e validação

- [x] 3.1 Atualizar `SSD.md` (módulo `38-preanalise.js` e a regra de listagem de folgas) e o `ROADMAP.md`; verificar com `Select-String -Pattern 'preanalise|pré-análise' SSD.md ROADMAP.md`.
- [x] 3.2 Rodar `node --test` completo e `openspec validate supervised-preanalysis --strict`, sem falhas.
- [x] 3.3 Validação de runtime somente de leitura na branch `test`: em algumas folhas, comparar o texto da pré-análise com a leitura da Análise e com a folha exibida, sem Ajustar; registrar no `ROADMAP.md`.
