# report-summary Specification

## Purpose

Resumir o relatório do time em indicadores gerais no topo da janela e permitir filtrar a tabela pelos funcionários que compõem cada indicador, para localizar rapidamente onde agir.

## Requirements

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
O resumo SHALL mostrar, para HE 100%, HEF 100% e HEC 70%, o total, o mínimo e o máximo entre os funcionários lidos, excluindo valores zero do mínimo e do máximo. O mínimo e o máximo SHALL exibir o nome do funcionário correspondente em dica de contexto. Para HEC 70%, valores positivos e negativos SHALL ser apresentados separadamente, cada grupo com seu total, mínimo e máximo, onde o máximo do grupo negativo é o de maior magnitude. Na caixa de HEC 70%, os grupos positivo e negativo SHALL ser apresentados em dois quadrados menores e o sinal (`+` ou `−`) SHALL ser o único caractere colorido, em verde e vermelho respectivamente, mantendo o valor na cor do texto. Os indicadores SHALL ser compactos, ocupando pouca altura da janela.

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
Clicar em um indicador de folgas (a caixa Movim., que exibe também o número de pendentes), de folgas presas ou de qualquer tipo de irregularidade SHALL ligar ou desligar o filtro desse indicador, e os indicadores ligados SHALL se somar: a tabela SHALL mostrar os funcionários que compõem pelo menos um dos indicadores ativos. Clicar novamente em um indicador ativo SHALL desligar somente esse indicador; a tabela volta a mostrar todos os funcionários quando nenhum indicador está ativo. A caixa Movim. SHALL listar os funcionários que têm folgas no indicador, isto é, folgas a movimentar após a Análise, ou folgas movimentadas ou presas após o Ajuste, e a coluna de folgas dessas linhas SHALL estar preenchida; essa listagem SHALL funcionar tanto antes quanto depois do Ajuste. Os indicadores ativos SHALL ser destacados. Os valores do resumo SHALL continuar refletindo o time inteiro enquanto a tabela estiver filtrada, e os filtros SHALL permanecer quando a tabela for atualizada. Funcionários não processados e funcionários de folha sem marcações SHALL NOT aparecer enquanto houver indicador ativo.

#### Scenario: Filtrar por irregularidade
- **WHEN** o usuário clica no indicador de Marcações britânicas
- **THEN** a tabela SHALL mostrar somente os funcionários com marcação britânica maior que zero
- **AND** o indicador SHALL aparecer destacado

#### Scenario: Trocar de filtro
- **WHEN** o indicador de Sem Entrada/Saída está ativo e o usuário clica em Interjornada
- **THEN** a tabela SHALL mostrar os funcionários com Sem Entrada/Saída e também os funcionários com interjornada
- **AND** um funcionário que tem os dois SHALL aparecer uma única vez
- **AND** os dois indicadores SHALL aparecer destacados

#### Scenario: Desligar um indicador entre vários
- **WHEN** os indicadores de Sem Entrada/Saída e de Interjornada estão ativos e o usuário clica novamente em Interjornada
- **THEN** a tabela SHALL mostrar somente os funcionários com Sem Entrada/Saída

#### Scenario: Limpar o filtro
- **WHEN** o único indicador ativo é clicado novamente
- **THEN** a tabela SHALL voltar a mostrar todos os funcionários

#### Scenario: Folgas presas
- **WHEN** o usuário clica no indicador de folgas presas
- **THEN** a tabela SHALL mostrar somente os funcionários ajustados com folgas presas

#### Scenario: Movim. depois da Análise
- **WHEN** a Análise indicou folgas a movimentar para alguns funcionários e o usuário clica em Movim.
- **THEN** a tabela SHALL mostrar esses funcionários, com a coluna de folgas preenchida

#### Scenario: Movim. depois do Ajuste
- **WHEN** o Ajuste movimentou folgas de alguns funcionários e deixou folgas presas em outros, e o usuário clica em Movim.
- **THEN** a tabela SHALL mostrar os funcionários que tiveram folgas movimentadas ou presas, com a fração de folgas preenchida
- **AND** funcionários sem folgas a movimentar SHALL NOT aparecer

#### Scenario: Resumo permanece global
- **WHEN** um ou mais indicadores estão ativos
- **THEN** os valores dos indicadores SHALL continuar somando o time inteiro

#### Scenario: Filtros permanecem na atualização
- **WHEN** o modelo é atualizado enquanto indicadores estão ativos
- **THEN** os mesmos indicadores SHALL continuar ativos

### Requirement: Resumo atualizado ao vivo
Os indicadores SHALL se atualizar enquanto a janela do relatório estiver aberta e a execução avança, usando os dados já registrados, sem esperar a conclusão.

#### Scenario: Indicador cresce com a execução
- **WHEN** a janela está aberta e a Análise lê a folha de um funcionário com 2 interjornadas
- **THEN** o indicador de Interjornada SHALL refletir essas 2 ocorrências sem reabrir a janela

### Requirement: Mínimo e máximo ordenam a tabela
Clicar no mínimo ou no máximo de HE 100%, HEF 100% ou HEC 70% SHALL ordenar a tabela pela coluna correspondente, do menor para o maior (mínimo) ou do maior para o menor (máximo), e SHALL excluir da tabela os funcionários com valor zero nessa coluna, os não processados e os de folha sem marcações. Nos quadrados de HEC 70%, o extremo positivo SHALL considerar somente saldos positivos e o negativo somente saldos negativos, sendo o máximo negativo o de maior magnitude. O extremo ativo SHALL ser destacado e a janela SHALL indicar a ordenação ativa. Clicar novamente no mesmo extremo SHALL limpá-lo; clicar no cabeçalho de uma coluna SHALL cancelá-lo e voltar à ordenação por coluna. Um extremo SHALL poder ser combinado com um filtro por indicador. Extremos sem valor (`-`) SHALL aparecer desativados e não clicáveis.

#### Scenario: Máximo de HE 100%
- **WHEN** os valores de HE 100% são 07:19, 00:09, 05:46 e 00:00 e o usuário clica no máximo
- **THEN** a tabela SHALL mostrar os funcionários com 07:19, 05:46 e 00:09, nessa ordem
- **AND** o funcionário com 00:00 SHALL ser excluído

#### Scenario: Mínimo inverte a ordem
- **WHEN** o usuário clica no mínimo do mesmo indicador
- **THEN** a ordem SHALL ser 00:09, 05:46 e 07:19

#### Scenario: Extremo negativo de HEC
- **WHEN** os saldos de HEC 70% são +11:00, +00:19, -35:00 e -08:13 e o usuário clica no máximo do quadrado negativo
- **THEN** a tabela SHALL mostrar somente os funcionários com -35:00 e -08:13, nessa ordem

#### Scenario: Limpar o extremo
- **WHEN** o usuário clica novamente no extremo ativo ou no cabeçalho de uma coluna
- **THEN** a tabela SHALL voltar a mostrar os funcionários sem a exclusão dos zerados

### Requirement: Busca por nome na tabela
A janela do relatório SHALL ter um campo de busca por nome. A busca SHALL ignorar acentos, maiúsculas e minúsculas e o sufixo numérico do seletor FPW, e um funcionário SHALL aparecer quando todas as palavras digitadas estiverem contidas no nome. A busca SHALL se combinar por interseção com os indicadores ativos: com indicadores ativos, a tabela SHALL mostrar apenas os funcionários que atendem a pelo menos um dos indicadores e que também casam com a busca. Sem indicador ativo, a busca SHALL valer para todos os funcionários da lista, inclusive os não processados e os de folha sem marcações. A busca SHALL poder ser limpa, SHALL permanecer quando a tabela for atualizada e SHALL NOT alterar os valores dos indicadores do resumo.

#### Scenario: Buscar por parte do nome
- **WHEN** o usuário digita "silva" no campo de busca e nenhum indicador está ativo
- **THEN** a tabela SHALL mostrar somente os funcionários cujo nome contém "silva", sem diferenciar acentos nem maiúsculas

#### Scenario: Busca com várias palavras
- **WHEN** o usuário digita "maria sou"
- **THEN** a tabela SHALL mostrar os funcionários cujo nome contém as duas palavras, em qualquer ordem

#### Scenario: Busca combinada com indicador
- **WHEN** o indicador de Interjornada está ativo e o usuário digita "silva"
- **THEN** a tabela SHALL mostrar somente os funcionários com interjornada cujo nome contém "silva"

#### Scenario: Busca sem indicador ativo inclui não processados
- **WHEN** nenhum indicador está ativo e a busca casa com um funcionário ainda não processado
- **THEN** esse funcionário SHALL aparecer na tabela

#### Scenario: Limpar a busca
- **WHEN** o usuário apaga o texto da busca
- **THEN** a tabela SHALL voltar a mostrar os funcionários dos indicadores ativos, ou todos se não houver indicador ativo
