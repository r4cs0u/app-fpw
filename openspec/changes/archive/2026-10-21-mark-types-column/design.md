# Design

## Context

O detector (`25-detector.js`) já identifica a origem de cada marcação (`parseMarcacao`: relógio, mobile, web, manual) e calcula, por dia do mês alvo, a primeira entrada e a última saída (`entradaSaidaDoDia`). Hoje só a marcação manual sobrevive em `entradasSaidas` (como `*`) e nenhuma contagem por origem chega ao relatório.

O caminho dos dados até a tabela é: `detectarFolha` -> `AF.analisar.analisarFolhaAtual` (Análise) e `AF.fases.capturarEstadoFolha` (Ajuste) -> `AF.modelo.registrarAnalise` / `registrarAjuste` (campo `leitura` do funcionário) -> `AF.modelo.obterDadosFunc` -> `60-relatorios.js`. Filtros são ids em `predicadosFiltro` acionados por cards com `data-filtro`; a ordenação é por `data-col` em `AF.modelo.ordenar`; o resumo vem de `AF.modelo.resumo`; a cópia TSV é `AF.modelo.tsv`. Ver `proposal.md` para a motivação e as specs para o comportamento.

## Goals / Non-Goals

**Goals:**
- Contar marcações por origem na leitura única do detector, com o mesmo resultado na Análise e no Ajuste.
- Expor a contagem no modelo, na tabela, no resumo, no filtro, na ordenação, na cópia TSV e no log de análise, reaproveitando os mecanismos existentes.

**Non-Goals:**
- Tratar marcação manual como irregularidade, gerar texto de irregularidade por ela ou mudar a exportação do time.
- Contar marcações intermediárias do dia (criadas pelo sistema) ou dias fora do mês alvo.
- Mostrar a contagem na pré-análise do modo Supervisionado.
- Filtrar por Web, Mobile ou Biometria.
- Mudar `99-main.user.js` ou a versão do estado persistido.

## Decisions

### 1. Contagem pura dentro de `detectarFolha`
Uma função pura `contarMarcacoesPorOrigem(dias, camposMarcacaoPresentes)` roda sobre os dias já ordenados e com `entrada`/`saida` calculadas, e o resultado entra em `detectarFolha` como `tiposMarcacao = { avaliada, manual, web, mobile, biometria, total }`. Relógio de ponto (sem sufixo) é contado como `biometria`. Segue o padrão de `naoPreenchida`: `avaliada: false` quando os campos de marcação não existem, para não confundir com zero.
- Alternativa descartada: calcular no relatório a partir de `entradasSaidas`. Esse campo perdeu a origem das marcações não manuais, e o detector já é o ponto único de leitura somente leitura compartilhado por Análise e Ajuste.

### 2. Reuso do caminho de dados existente
`analisarFolhaAtual` e `capturarEstadoFolha` repassam `tiposMarcacao`; `registrarAnalise` e `registrarAjuste` o guardam em `leitura.tiposMarcacao`; `obterDadosFunc` o expõe como `marcacoes` (com `avaliada: false` quando ausente, o que cobre dados restaurados da sessão sem migração e sem mudar `v: 1`). O Ajuste regrava `leitura` ao concluir a folha, e como ele não altera marcações o valor coincide com o da Análise.

### 3. Coluna compacta com dica
Coluna `marcacoes` entre `naoPreenchida` e `he` em `COLUNAS_TABELA` (o `colspan` de linhas vazias e de detalhe deriva de `COLUNAS_TABELA.length`). Texto `30* · 20W · 10M · 5B`: manuais primeiro (vermelho quando > 0), tipos zerados omitidos, tudo escapado. Dica: `Manual 30 (46%) | Web 20 | Mobile 10 | Biometria 5 | Total 65`, com percentual arredondado. Largura fixa moderada para a coluna, pois a tabela usa `table-layout: fixed`; o texto longo é truncado com reticências e a dica traz o detalhe.
- Alternativa descartada: célula em duas linhas, que aumenta a altura de todas as linhas de uma tabela já densa.
- Ordem com manuais primeiro foi escolhida para o destaque; é só apresentação e fácil de inverter.

### 4. Ordenação e filtros de marcações
`AF.modelo.ordenar` ganha `col === 'marcacoes'` pela quantidade de manuais (ausentes valem 0), no mesmo estilo das colunas de irregularidade. `predicadosFiltro` ganha `manuais`, `web`, `mobile` e `biometria`, retornando verdadeiro quando `marcacoes.avaliada && marcacoes[tipo] > 0`; os rótulos entram em `rotulosFiltroIrregularidade` para o título do filtro ativo. Com os filtros de marcações ativos, a exportação de irregularidades do time pode resultar em "Nenhuma irregularidade para exportar", o que é coerente: marcação não é irregularidade.

### 5. Quarta linha de indicadores, em roxo
`AF.modelo.resumo` devolve `marcacoes: { manual, web, mobile, biometria }`, cada um com `total` e `funcs`, somando apenas funcionários processados, de folha com marcações e com contagem avaliada. `gerarCardsHTML` ganha o grupo `purple` (nova classe `.grp-purple`) entre Irregularidades e Hora Extra. As quatro caixas são clicáveis e filtram a tabela (`data-filtro`), com valor de Manuais em vermelho e contagem de funcionários afetados em cada uma.
- Observação de layout: `.cards-grid` tem `max-height: 40vh` com rolagem; com a quarta linha a área de cards ocupa mais altura, mas continua rolável e sem mudar a tabela.

### 6. Cópia TSV e log
`AF.modelo.tsv` ganha `Marc. manuais`, `Marc. web`, `Marc. mobile` e `Marc. biometria` logo após `% Folha não preenchida`, como números em colunas separadas (mais úteis em planilha do que o texto compacto); células vazias quando a contagem não está disponível. O evento `analise-folha` do log ganha as quatro contagens.

## Risks / Trade-offs

- [Qualquer sufixo diferente de `*`, `M` e `W` é contado como biometria] -> Combinado com o usuário: o sistema só produz esses três sufixos mais o caso sem sufixo; sem balde extra de "desconhecidos".
- [Marcação manual intermediária do dia não é contada] -> É a regra pedida (primeira entrada e última saída); documentada na spec.
- [Coluna a mais deixa a tabela mais apertada] -> Texto compacto, largura própria e dica com o detalhe; validar visualmente na janela do relatório.
- [Quarta linha de cards reduz o espaço da tabela] -> Mantida a rolagem de `.cards-grid` e a altura máxima existente.
- [Dados da sessão anterior ficam com `-`] -> Aceito: a próxima Análise ou Ajuste preenche a coluna; sem migração.
