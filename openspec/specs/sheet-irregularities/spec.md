# sheet-irregularities Specification

## Purpose

Define a leitura estruturada das linhas de dia da folha de ponto e a detecção, com os dias envolvidos, das irregularidades de Sem Entrada/Saída, Interjornada, Marcação britânica e Folha não preenchida, de modo que Análise e Ajuste usem as mesmas regras.

## Requirements

### Requirement: Leitura estruturada de entrada e saída de cada dia
O sistema SHALL associar cada linha de marcação ao cabeçalho do seu próprio dia e SHALL obter, para cada dia, a entrada e a saída a partir dos campos de marcação. A entrada SHALL ser o campo da esquerda da primeira linha do dia. A saída SHALL ser o campo da direita da última linha do dia que tenha esse campo preenchido. O campo da esquerda das linhas seguintes à primeira SHALL ser ignorado para entrada e saída, pois pode repetir o limite de divisão da jornada.

Cada marcação SHALL ter sua origem identificada pelo caractere que acompanha a hora: ausência de caractere indica relógio de ponto, `M` indica aplicativo mobile, `W` indica web e `*` indica preenchimento manual. Espaços finais SHALL ser tolerados.

#### Scenario: Dia com uma linha
- **WHEN** um dia tem uma única linha com `05:49 ` e `17:49`
- **THEN** a entrada do dia SHALL ser `05:49` com origem relógio
- **AND** a saída do dia SHALL ser `17:49` com origem relógio

#### Scenario: Dia com duas linhas
- **WHEN** um dia tem a linha `05:49 ` / `17:49` e a linha seguinte `17:49` / `18:13 `
- **THEN** a entrada do dia SHALL ser `05:49`
- **AND** a saída do dia SHALL ser `18:13`
- **AND** o `17:49` repetido na segunda linha SHALL NOT ser tratado como marcação adicional

#### Scenario: Última linha é órfã, sem campo da direita
- **WHEN** um dia tem as linhas `22:36*` / `04:05`, `04:05` / `05:53 ` e `23:59*` / vazio
- **THEN** a entrada do dia SHALL ser `22:36` com origem manual
- **AND** a saída do dia SHALL ser `05:53` com origem relógio

#### Scenario: Dia com quatro linhas encadeadas
- **WHEN** um dia tem as linhas `08:06*` / `10:45`, `10:45` / `14:21`, `14:21` / `15:42` e `15:42` / `00:05 `
- **THEN** a entrada do dia SHALL ser `08:06` com origem manual
- **AND** a saída do dia SHALL ser `00:05` com origem relógio

#### Scenario: Linha final independente com as duas marcações
- **WHEN** um dia tem as linhas `00:07 ` / `05:41`, `05:41` / `08:16 ` e `23:38 ` / `23:45*`
- **THEN** a entrada do dia SHALL ser `00:07` com origem relógio
- **AND** a saída do dia SHALL ser `23:45` com origem manual

#### Scenario: Origens da marcação
- **WHEN** os valores lidos são `06:00*`, `06:00M`, `06:00W` e `06:00 `
- **THEN** as origens SHALL ser, respectivamente, manual, mobile, web e relógio

#### Scenario: Dia fora do mês alvo
- **WHEN** a folha exibe dias de outro mês na semana de transição
- **THEN** esses dias SHALL NOT entrar em nenhuma contagem ou lista de irregularidades do mês alvo

### Requirement: Detecção de Sem Entrada/Saída
O sistema SHALL contar na categoria Sem Entrada/Saída cada linha de irregularidade do mês alvo cujo texto indique marcação irregular, hora extra irregular ou ausência de marcação de entrada/saída (`s/marc de entrada/saída`), e SHALL registrar a data de cada ocorrência. Uma linha de `Ausência de Marcação` (dia sem marcações) SHALL NOT ser contada nessa categoria. Quando um mesmo dia tem mais de uma linha de irregularidade, cada uma SHALL ser contada.

#### Scenario: Entrada sem saída
- **WHEN** a linha de um dia do mês alvo tem irregularidade `s/marc de entrada/saída`
- **THEN** a categoria Sem Entrada/Saída SHALL contar 1 ocorrência e registrar a data desse dia

#### Scenario: Hora extra irregular em linha órfã
- **WHEN** um dia tem uma linha com irregularidade `Hora Extra Irregular`
- **THEN** a categoria Sem Entrada/Saída SHALL contar 1 ocorrência para esse dia

#### Scenario: Duas irregularidades no mesmo dia
- **WHEN** duas linhas do mesmo dia têm irregularidades que pertencem à categoria
- **THEN** a categoria SHALL contar 2 ocorrências

#### Scenario: Dia de folga sem marcações
- **WHEN** a linha do dia tem irregularidade `Ausência de Marcação`
- **THEN** essa linha SHALL NOT ser contada em Sem Entrada/Saída

### Requirement: Detecção de Interjornada
O sistema SHALL contar como Interjornada cada dia do mês alvo cujo **cabeçalho** contenha a marca `[Interjornada]` e SHALL registrar a data de cada ocorrência. O texto das linhas de marcação (inclusive os textos das opções das listas de justificativa, que podem conter a palavra interjornada) SHALL NOT ser usado para essa detecção. Um dia SHALL ser contado no máximo uma vez nessa categoria.

#### Scenario: Dia com interjornada no mês alvo
- **WHEN** o cabeçalho de um dia do mês alvo contém a marca `[Interjornada]`
- **THEN** a categoria Interjornada SHALL contar 1 ocorrência e registrar a data do dia

#### Scenario: Palavra interjornada apenas nas opções de justificativa
- **WHEN** o cabeçalho do dia não tem a marca, mas a lista de justificativas de uma linha contém uma opção com a palavra interjornada
- **THEN** o dia SHALL NOT ser contado

#### Scenario: Dia com interjornada e várias linhas
- **WHEN** o cabeçalho de um dia com 4 linhas de marcação contém a marca
- **THEN** o dia SHALL ser contado uma única vez

#### Scenario: Interjornada fora do mês alvo
- **WHEN** a marca está no cabeçalho de um dia fora do mês alvo
- **THEN** ela SHALL NOT ser contada

### Requirement: Detecção de marcação britânica
O sistema SHALL identificar marcação britânica considerando somente marcações de origem manual (`*`) do mês alvo, em ordem cronológica, tratando entradas e saídas em sequências separadas. Dias sem marcação manual naquele campo e marcações de outras origens SHALL NOT interromper nem integrar a sequência. Uma sequência SHALL ser formada por marcações manuais consecutivas, nessa ordem, com os mesmos minutos (independentemente da hora); uma marcação manual com minutos diferentes SHALL encerrar a sequência. Uma sequência com 3 ou mais marcações SHALL caracterizar marcação britânica. O valor contado SHALL ser o número de dias das sequências caracterizadas, somadas as de entrada e as de saída, e SHALL ser registrada a data de cada dia envolvido.

#### Scenario: Três saídas manuais com os mesmos minutos
- **WHEN** as saídas manuais do mês, em ordem, têm minutos 15, 15, 15, 12, 15, 15, 02 e 15, nos dias 02, 10, 15, 23, 25, 26, 27 e 30
- **THEN** SHALL haver uma sequência de 3 dias (02, 10 e 15)
- **AND** o valor contado SHALL ser 3
- **AND** as demais marcações SHALL NOT caracterizar marcação britânica

#### Scenario: Entrada e saída são independentes
- **WHEN** há 2 entradas manuais seguidas com os mesmos minutos e 2 saídas manuais seguidas com os mesmos minutos
- **THEN** nenhuma sequência SHALL ser caracterizada, mesmo que somadas totalizem 4 marcações

#### Scenario: Marcação sem asterisco não interrompe a sequência
- **WHEN** entre duas saídas manuais com minutos `15` existe um dia cuja saída é do relógio com minutos diferentes
- **THEN** esse dia SHALL NOT interromper a sequência das saídas manuais

#### Scenario: Sequência de cinco dias
- **WHEN** 5 entradas manuais consecutivas têm os mesmos minutos
- **THEN** o valor contado SHALL ser 5 e os 5 dias SHALL ser registrados

#### Scenario: Duas sequências de três dias
- **WHEN** existem duas sequências distintas de 3 marcações manuais com os mesmos minutos
- **THEN** o valor contado SHALL ser 6

#### Scenario: Minutos diferentes encerram a sequência
- **WHEN** as marcações manuais em ordem têm minutos 01, 01, 06, 01
- **THEN** nenhuma sequência SHALL ser caracterizada

### Requirement: Detecção de folha não preenchida
O sistema SHALL considerar como dias visíveis os dias do mês alvo que aparecem na folha, e como dias preenchidos aqueles que têm ao menos uma marcação de entrada ou saída. Justificativas SHALL NOT tornar um dia preenchido. A folha SHALL ser classificada como não preenchida quando o número de dias preenchidos for menor ou igual a um quarto (arredondado para baixo) dos dias visíveis, ou quando existir uma sequência de dias visíveis consecutivos não preenchidos que cubra 7 ou mais dias corridos, do primeiro ao último dia da sequência. Um dia visível preenchido SHALL interromper a sequência. Uma folha sem dias visíveis (sem marcações na página) SHALL NOT ser classificada por esta regra. Quando classificada, o sistema SHALL informar a porcentagem de dias visíveis não preenchidos e qual critério foi atendido.

#### Scenario: Poucos dias preenchidos
- **WHEN** a folha tem 28 dias visíveis no mês alvo e 7 ou menos deles têm marcação
- **THEN** a folha SHALL ser classificada como não preenchida
- **AND** a porcentagem informada SHALL corresponder aos dias visíveis sem marcação

#### Scenario: Folha com poucas ausências de marcação
- **WHEN** 5 de 16 dias visíveis são `Ausência de Marcação` e os demais têm marcação
- **THEN** a folha SHALL NOT ser classificada como não preenchida

#### Scenario: Semana sem marcação em folha majoritariamente preenchida
- **WHEN** os dias visíveis 05/09, 07/09, 09/09 e 12/09 são consecutivos entre os visíveis, não têm marcação e cobrem 8 dias corridos, e os demais dias visíveis têm marcação
- **THEN** a folha SHALL ser classificada como não preenchida pelo critério da sequência

#### Scenario: Sequência interrompida por dia preenchido
- **WHEN** há dias visíveis sem marcação que cobririam 8 dias corridos, mas um dia visível com marcação existe entre eles
- **THEN** a sequência SHALL ser interrompida e cada trecho SHALL ser avaliado separadamente

#### Scenario: Ausências curtas
- **WHEN** os dias não preenchidos consecutivos cobrem menos de 7 dias corridos e a proporção de dias preenchidos é maior que um quarto
- **THEN** a folha SHALL NOT ser classificada como não preenchida

#### Scenario: Folha sem dias visíveis
- **WHEN** a página informa que não há marcações
- **THEN** a folha SHALL NOT ser classificada como não preenchida por esta regra

### Requirement: Contagens derivadas dos dias e iguais em Análise e Ajuste
O sistema SHALL derivar as contagens de cada categoria a partir das ocorrências detectadas e SHALL usar as mesmas regras de detecção na Análise e no Ajuste, de modo que a mesma folha produza as mesmas contagens nos dois fluxos. A detecção SHALL ser somente leitura e SHALL NOT alterar a página, selecionar linhas ou disparar gravação.

#### Scenario: Mesma folha em Análise e Ajuste
- **WHEN** a mesma folha é lida pela Análise e pelo Ajuste sem alterações entre as leituras
- **THEN** as contagens de Sem Entrada/Saída, Interjornada, Marcação britânica e Folha não preenchida SHALL ser idênticas

#### Scenario: Detecção não altera a página
- **WHEN** a detecção é executada em uma folha
- **THEN** nenhum campo, seleção ou controle da página SHALL ter seu valor ou estado alterado
