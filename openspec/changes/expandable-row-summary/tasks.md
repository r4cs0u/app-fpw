# Tasks

## 1. Modelo de Dados e Funções Puras (`27-modelo-relatorio.js`)

- [ ] 1.1 Atualizar `AF.modelo.textoIrregularidades(nome)` para não suprimir outras irregularidades quando `naoPreenchida` estiver sinalizada (incluir o aviso e em seguida todas as irregularidades presentes). Verificar em teste unitário.
- [ ] 1.2 Atualizar `AF.modelo.textoDetalheAjuste(nome)` para incluir seções de irregularidades com datas (Sem E/S, Interjornada, Marcações Britânicas) e porcentagem de não preenchimento (sem datas). Verificar em teste unitário.
- [ ] 1.3 Garantir que `AF.modelo.obterDadosFunc` exponha flag auxiliar indicando presença de detalhes (`temDetalhes`), cobrindo ajustes ou irregularidades.

## 2. Renderização no Relatório (`60-relatorios.js`)

- [ ] 2.1 Em `AF.relatorios.gerarTbodyHTML`, atualizar o botão 🔍 (`btn-detalhe-ajuste`) para habilitar quando houver ajustes OU irregularidades registradas (`temDetalhes`). Atualizar rótulo e title para "Detalhes da linha".
- [ ] 2.2 Verificar renderização da linha expandida com o conteúdo completo de ajustes e irregularidades.

## 3. Testes e Validação

- [ ] 3.1 Atualizar `tests/modelo-relatorio.test.js` e `tests/relatorios.test.js` cobrindo o novo formato do texto expandido, a não-supressão na exportação e o estado do botão 🔍.
- [ ] 3.2 Executar `node --test` e validar integridade total dos testes.
- [ ] 3.3 Validar a change com `openspec validate expandable-row-summary --strict`.
