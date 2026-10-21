# Tasks

## 1. Contagem por origem no detector

- [x] 1.1 Em `25-detector.js`, criar a função pura `contarMarcacoesPorOrigem` (relógio sem sufixo conta como `biometria`; Web, Mobile e Manual pelo sufixo) sobre a primeira entrada e a última saída de cada dia do mês alvo, e expor `tiposMarcacao = { avaliada, manual, web, mobile, biometria, total }` no resultado de `detectarFolha`, com `avaliada: false` quando não há campos de marcação. Verificar em `tests/detector.test.js`: soma de entradas e saídas de vários dias com as quatro origens; marcações intermediárias de dia encadeado não contam; dia só com entrada soma 1; dia sem marcações e dias da semana de transição não contam; campos ausentes resultam em `avaliada: false`; a mesma entrada repetida produz o mesmo resultado.
- [x] 1.2 Rodar `node --test tests/detector.test.js` e confirmar que os testes existentes de irregularidades continuam passando sem alteração de resultado.

## 2. Dados no fluxo de Análise e Ajuste, no modelo e no log

- [x] 2.1 Em `50-analisar.js`, repassar `tiposMarcacao` em `analisarFolhaAtual` (nulo na folha vazia) e incluir as quatro contagens no evento `analise-folha` de `registrarEventoAnalise`; em `40-fases.js`, repassar `tiposMarcacao` na `leitura` enviada a `registrarAjuste`. Verificar em `tests/analise.test.js`: a análise devolve `tiposMarcacao`, a folha vazia devolve nulo e o evento de log contém as contagens; em `tests/log.test.js` ou no teste de Ajuste correspondente, a leitura do Ajuste inclui `tiposMarcacao`.
- [x] 2.2 Em `27-modelo-relatorio.js`, guardar `leitura.tiposMarcacao` em `registrarAnalise` e `registrarAjuste` e expor `marcacoes` em `obterDadosFunc` (`avaliada: false` quando ausente, o que cobre dados restaurados e folha vazia). Verificar em `tests/modelo-relatorio.test.js`: Análise registra e expõe a contagem; Ajuste posterior mantém a contagem; nova Análise a substitui; estado restaurado sem o campo resulta em `avaliada: false`; folha vazia não expõe contagem.

## 3. Resumo, filtro, ordenação e cópia no modelo

- [x] 3.1 Em `27-modelo-relatorio.js`, acrescentar `marcacoes` ao `resumo()` (total e funcionários de cada origem, somando só funcionários processados, com folha e contagem avaliada), os predicados de filtro `manuais`, `web`, `mobile` e `biometria`, os respectivos rótulos em `rotulosFiltroIrregularidade`, a ordenação `marcacoes` pela quantidade de manuais (ausentes valem 0) e as colunas `Marc. manuais`, `Marc. web`, `Marc. mobile` e `Marc. biometria` em `tsv()`. Verificar em `tests/modelo-relatorio.test.js`: totais por origem com 30/2/0 manuais resultando em 32 em 2 funcionários; funcionário sem contagem e folha vazia fora dos totais e dos filtros; filtros de marcações combinados com outros indicadores por união e com a busca por interseção; ordenação decrescente por manuais e inversão no segundo clique; TSV com as quatro colunas e células vazias quando indisponível; manual não altera os totais de irregularidades nem o texto de irregularidades.

## 4. Coluna e indicadores na janela do relatório

- [x] 4.1 Em `60-relatorios.js`, incluir a coluna `marcacoes` entre `naoPreenchida` e `he` em `COLUNAS_TABELA`, renderizar a célula compacta (`30* · 20W · 10M · 5B`, manuais primeiro e em vermelho quando maiores que zero, tipos zerados omitidos, `-` quando indisponível) com a dica de detalhamento, total e percentual, e definir a largura da coluna no CSS embutido. Verificar em `tests/relatorios.test.js`: formato e destaque, omissão de zerados, dica com `46%` para 30 de 65, `-` para dados sem contagem, `colspan` das linhas vazias e de detalhe ajustado ao novo total de colunas, e valores escapados.
- [x] 4.2 Em `60-relatorios.js`, criar o grupo roxo **Marcações** (classe `.grp-purple`) entre Irregularidades e Hora Extra em `gerarCardsHTML`, com as caixas Manuais, Web, Mobile e Biometria clicáveis (`data-filtro`), com contagem de funcionários e valor de Manuais em vermelho, e garantir que o clique em qualquer uma delas liga/desliga o filtro como os demais. Verificar em `tests/relatorios.test.js`: quatro grupos na ordem Folgas, Irregularidades, Marcações e Hora Extra; todas com `data-filtro`; filtros ativos destacados; filtros de Web, Mobile e Biometria funcionam; resumo atualiza com nova leitura.

## 5. Documentação e validação

- [x] 5.1 Atualizar `SSD.md` (e `README.md`, se citar colunas ou indicadores do relatório) com a coluna Marcações e o grupo de indicadores; verificar com `Select-String -Pattern 'Marcações' SSD.md README.md` que o texto aparece onde as colunas do relatório são descritas.
- [x] 5.2 Rodar `node --test` completo e `openspec validate mark-types-column --strict`, e confirmar saída sem falhas.
- [x] 5.3 Validação manual na branch `test`, somente leitura: executar uma Análise, conferir a coluna, o grupo roxo, o filtro Manuais, a ordenação e a cópia TSV, e conferir que dados sem contagem (relatório restaurado antes da atualização) mostram `-` até nova Análise. Não executar Ajustar. Registrar o resultado.
