## Context

O estado da visão da janela (`estadoVisao` em `60-relatorios.js`) guarda `filtro` como um único id. Os cards têm `data-filtro`; o clique alterna o id. `AF.modelo.filtrar(filtro)` em `27-modelo-relatorio.js` filtra `estado.ordem` por um id: `semES`, `interj`, `britanica`, `naoPreenchida`, `presas` ou `pendentes`, e descarta quem não está processado. O filtro `pendentes` exige `folgas.estado === 'pendente' && folgas.den > 0`; esse estado só existe entre a Análise e o Ajuste (depois do Ajuste vira `concluida` ou `atencao`), o que explica Movim. não retornar nada. `obterNomesVisiveis` aplica filtro e depois extremo ou ordenação, e é usado pela tabela e pela exportação. O título da exportação usa `rotulosFiltroIrregularidade[filtro]`. O rodapé mostra "Filtro ativo: <id>".

Ver proposal.md e as specs `report-summary` e `irregularity-export` desta change.

## Goals / Non-Goals

**Goals:**
- Filtros por indicador somados (união) e busca por nome combinada por interseção.
- Corrigir Movim. para funcionar antes e depois do Ajuste.
- Manter a lógica de filtro em funções puras testadas sem DOM.

**Non-Goals:**
- Não mudar a regra de mín/máx (continua um extremo único, combinável com os filtros).
- Não persistir filtros e busca entre recarregamentos (hoje o filtro também não persiste).
- Não filtrar por intervalo de valores nem por outras colunas.

## Decisions

**1. `AF.modelo.filtrar(filtros, busca)` aceita uma lista de ids, ou um id único (compatibilidade), e opcionalmente o texto da busca.**
Sem ids e sem busca devolve todos. Com ids, mantém quem atende a pelo menos um (união) e está processado e não é de folha sem marcações; depois aplica a busca por interseção. Sem ids e com busca, aplica só a busca sobre todos. Alternativa descartada: função separada para busca chamada pela UI; duplicaria a regra de composição que a exportação também usa.

**2. Cada indicador vira um predicado numa tabela de predicados em `27-modelo-relatorio.js`.**
Facilita testar cada id e acrescentar indicadores. O predicado de Movim. passa a ser `folgas.den > 0`, sem olhar o estado. Após a Análise `den` é o número de folgas a movimentar; após o Ajuste, movidas mais presas. Alternativa: manter o estado `pendente` e acrescentar `concluida`/`atencao`; equivale a `den > 0` com mais código.

**3. Busca por tokens normalizados.**
O texto é normalizado (NFD sem diacríticos, minúsculas, espaços colapsados) e dividido em palavras; o nome, sem o sufixo numérico, precisa conter todas. Reaproveita a normalização já usada na ordenação.

**4. `estadoVisao.filtros` (lista) e `estadoVisao.busca` (texto).**
O clique no card liga ou desliga o id na lista. O campo de busca atualiza `busca` a cada digitação com um pequeno atraso para não redesenhar a tabela a cada tecla, e redesenha forçando a atualização da janela como os demais controles. O campo fica fora de `innerHTML` da tabela para não perder o foco ao atualizar.

**5. Exportação recebe a lista de filtros e a busca.**
`textoIrregularidadesTime(nomes, filtros, busca)` monta o título: `*Irregularidades – <mês> – <rótulo1> + <rótulo2> – Busca: "<texto>"`, omitindo as partes sem valor. Mantém o formato antigo quando há zero ou um filtro e nenhuma busca, para não mudar a saída existente.

**6. Rodapé e card com indicador ativo.**
O rodapé passa a listar os rótulos dos filtros ativos (não os ids) e a busca.

## Risks / Trade-offs

- [Mudar a assinatura de `filtrar` e `textoIrregularidadesTime` quebra quem passa um id] → aceitam id único ou lista; testes existentes continuam passando.
- [União de indicadores dá uma tabela maior do que o usuário espera de um "filtro"] → decisão do responsável em 2026-10-07; os cards ativos ficam destacados e o rodapé lista os filtros.
- [Redesenho a cada tecla pode piscar ou tirar o foco] → o campo de busca é montado uma vez no esqueleto da janela, e só a tabela é reconstruída.
- [Movim. incluir quem só tem folgas presas, que já aparecem em Presas] → é intencional: o indicador mostra quem tem folgas no processo; Presas continua disponível para o recorte específico.
