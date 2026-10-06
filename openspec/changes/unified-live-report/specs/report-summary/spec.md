## Purpose

Resumir o relatório do time em indicadores gerais no topo da janela e permitir filtrar a tabela pelos funcionários que compõem cada indicador, para localizar rapidamente onde agir.

## ADDED Requirements

### Requirement: Indicadores agrupados em três linhas temáticas
O resumo SHALL ser apresentado em três grupos, cada um em uma linha própria e identificado por título e cor: **Folgas** (tons de verde) na primeira linha, **Irregularidades** (tons de vermelho) na segunda e **Hora Extra** (tons de azul) na terceira. Cada grupo SHALL conter caixas menores com os seus indicadores. O grupo Folgas SHALL conter **Movim.** e **Presas**. O grupo Irregularidades SHALL conter **Sem Entrada/Saída**, **Interjornada**, **Marc. Britânicas** e **Folhas não Preenchidas**. O grupo Hora Extra SHALL conter **100% (Acima das 10h)**, **100% (Feriado)** e **70% (Compensáveis)**, correspondentes a HE 100%, HEF 100% e HEC 70%.

#### Scenario: Três linhas na ordem esperada
- **WHEN** a janela do relatório é aberta
- **THEN** a primeira linha de indicadores SHALL ser Folgas, a segunda Irregularidades e a terceira Hora Extra
- **AND** cada linha SHALL usar a cor do seu tema

#### Scenario: Conteúdo de cada grupo
- **WHEN** o resumo é exibido
- **THEN** Folgas SHALL ter Movim. e Presas, Irregularidades SHALL ter os quatro tipos e Hora Extra SHALL ter as três caixas com os rótulos definidos

### Requirement: Indicador de folgas movimentadas, pendentes e presas
O resumo SHALL mostrar o total de folgas movimentadas sobre o total de folgas considerado, em fração, o número de folgas ainda pendentes de movimentação (de funcionários apenas analisados) e o número de folgas presas. O total considerado SHALL ser a soma das movimentadas, das pendentes e das presas. As folgas movimentadas SHALL somar o numerador de cada funcionário ajustado, as presas SHALL somar as presas dos funcionários ajustados e as pendentes SHALL somar as folgas a movimentar dos funcionários analisados e ainda não ajustados.

#### Scenario: Time com Ajuste concluído e presas
- **WHEN** os funcionários ajustados somam 12 folgas movimentadas e 3 presas e não há funcionários apenas analisados com folgas
- **THEN** o indicador SHALL mostrar `12/15` movimentadas, 0 pendentes e 3 presas

#### Scenario: Time apenas analisado
- **WHEN** nenhum Ajuste foi executado e a Análise somou 8 folgas a movimentar
- **THEN** o indicador SHALL mostrar `0/8` movimentadas e 8 pendentes

#### Scenario: Time sem execução
- **WHEN** nenhuma Análise nem Ajuste foi executado
- **THEN** o indicador SHALL mostrar zero e sem fração enganosa

### Requirement: Indicadores de irregularidades por tipo
O resumo SHALL mostrar, para cada tipo de irregularidade (Sem Entrada/Saída, Interjornada, Marcações britânicas e Folha não preenchida), o total de ocorrências do time e o número de funcionários afetados. Para Folha não preenchida, o total SHALL ser o número de folhas sinalizadas. Os valores SHALL ser calculados com a leitura mais recente de cada funcionário.

#### Scenario: Totais por tipo
- **WHEN** três funcionários têm 4, 1 e 0 ocorrências de Sem Entrada/Saída
- **THEN** o indicador SHALL mostrar 5 ocorrências em 2 funcionários

#### Scenario: Folhas sinalizadas
- **WHEN** duas folhas estão sinalizadas como não preenchidas
- **THEN** o indicador de Folha não preenchida SHALL mostrar 2

### Requirement: Indicadores de horas extras e compensação
O resumo SHALL mostrar, para HE 100%, HEF 100% e HEC 70%, o total, o mínimo e o máximo entre os funcionários lidos, excluindo valores zero do mínimo e do máximo. O mínimo e o máximo SHALL exibir o nome do funcionário correspondente em dica de contexto. Para HEC 70%, valores positivos e negativos SHALL ser apresentados separadamente, cada grupo com seu total, mínimo e máximo, onde o máximo do grupo negativo é o de maior magnitude.

#### Scenario: Mínimo e máximo sem zeros
- **WHEN** os valores de HE 100% dos funcionários lidos são 00:00, 00:09, 05:46 e 07:19
- **THEN** o mínimo SHALL ser 00:09 e o máximo 07:19, com o nome de cada funcionário na dica
- **AND** o total SHALL somar todos os valores

#### Scenario: HEC com positivos e negativos
- **WHEN** os saldos de HEC 70% são +11:00, +00:19, -35:00 e -08:13
- **THEN** o grupo positivo SHALL ter total +11:19, mínimo +00:19 e máximo +11:00
- **AND** o grupo negativo SHALL ter total -43:13, mínimo -08:13 e máximo -35:00

#### Scenario: Sem valores diferentes de zero
- **WHEN** todos os valores lidos de um indicador são zero
- **THEN** o total SHALL ser 00:00 e o mínimo e o máximo SHALL aparecer como `-`

### Requirement: Filtro da tabela por indicador
Clicar em um indicador de folgas pendentes (a caixa Movim., que exibe também o número de pendentes), de folgas presas ou de qualquer tipo de irregularidade SHALL filtrar a tabela, mostrando somente os funcionários que compõem aquele indicador. Clicar novamente no mesmo indicador SHALL limpar o filtro, e clicar em outro indicador SHALL substituir o filtro ativo. O indicador ativo SHALL ser destacado. Os valores do resumo SHALL continuar refletindo o time inteiro enquanto a tabela estiver filtrada, e o filtro SHALL permanecer quando a tabela for atualizada.

#### Scenario: Filtrar por irregularidade
- **WHEN** o usuário clica no indicador de Marcações britânicas
- **THEN** a tabela SHALL mostrar somente os funcionários com marcação britânica maior que zero
- **AND** o indicador SHALL aparecer destacado

#### Scenario: Limpar o filtro
- **WHEN** o usuário clica novamente no indicador ativo
- **THEN** a tabela SHALL voltar a mostrar todos os funcionários

#### Scenario: Trocar de filtro
- **WHEN** um filtro está ativo e o usuário clica em outro indicador
- **THEN** o novo filtro SHALL substituir o anterior

#### Scenario: Folgas presas
- **WHEN** o usuário clica no indicador de folgas presas
- **THEN** a tabela SHALL mostrar somente os funcionários ajustados com folgas presas

#### Scenario: Resumo permanece global
- **WHEN** um filtro está ativo
- **THEN** os valores dos indicadores SHALL continuar somando o time inteiro

### Requirement: Resumo atualizado ao vivo
Os indicadores SHALL se atualizar enquanto a janela do relatório estiver aberta e a execução avança, usando os dados já registrados, sem esperar a conclusão.

#### Scenario: Indicador cresce com a execução
- **WHEN** a janela está aberta e a Análise lê a folha de um funcionário com 2 interjornadas
- **THEN** o indicador de Interjornada SHALL refletir essas 2 ocorrências sem reabrir a janela
