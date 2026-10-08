# Spec Delta

## MODIFIED Requirements

### Requirement: Texto de irregularidades por funcionário
O sistema SHALL gerar, para um funcionário, um texto cuja primeira linha é `*` seguido do nome da pessoa sem o sufixo numérico do seletor FPW (espaço seguido de um ou mais dígitos), preservando números que façam parte do restante do nome. Quando Folha não preenchida estiver sinalizada, o texto SHALL conter o aviso de preenchimento da folha E TAMBÉM as linhas de todas as outras irregularidades existentes. As linhas de irregularidades presentes SHALL aparecer na seguinte ordem: aviso de Folha não preenchida (se sinalizada), Sem Entrada/Saída, Interjornada e Marcações britânicas. As linhas de Sem Entrada/Saída, Interjornada e Marcações britânicas SHALL listar os dias da irregularidade em `dd/mm`, em ordem cronológica e sem repetição, separados por vírgula, e terminar com ponto. A linha de Folha não preenchida SHALL conter o aviso para realizar o preenchimento da folha e a porcentagem de dias sem marcação, sem listar dias. Irregularidades inexistentes SHALL NOT gerar linha. O texto SHALL usar a leitura mais recente do funcionário, seja da Análise ou do Ajuste.

Os textos das linhas SHALL ser:
- Sem Entrada/Saída: `- s/marcação de entrada ou saída nos dias, <dias>.`
- Interjornada: `- Checar se interjornada é devida nos dias, <dias>.`
- Marcações britânicas: `- Ajustar marcações britânicas, nos dias <dias>.`
- Folha não preenchida: `- Realizar o preenchimento da folha (<pct>% dos dias sem marcação).`

#### Scenario: Funcionário com as três irregularidades por dia
- **WHEN** um funcionário tem Sem Entrada/Saída em 27/09, 01/09 e 03/09, interjornada em 07/09 e marcações britânicas em 04/09, 05/09 e 06/09, sem Folha não preenchida sinalizada
- **THEN** o texto SHALL ter a linha `*<nome>` e três linhas de irregularidade na ordem definida
- **AND** os dias de Sem Entrada/Saída SHALL aparecer como `01/09, 03/09, 27/09`

#### Scenario: Folha não preenchida suprime as outras irregularidades
- **WHEN** um funcionário tem Sem Entrada/Saída, Interjornada e Marcações britânicas, e Folha não preenchida está sinalizada com 79%
- **THEN** o texto SHALL conter `*<nome>`, a linha `- Realizar o preenchimento da folha (79% dos dias sem marcação).` e as linhas correspondentes de Sem Entrada/Saída, Interjornada e Marcações britânicas com suas respectivas datas

#### Scenario: Irregularidade ausente não gera linha
- **WHEN** um funcionário tem apenas marcações britânicas
- **THEN** o texto SHALL conter somente a linha do nome e a linha de marcações britânicas

#### Scenario: Sufixo numérico do seletor não aparece no nome
- **WHEN** o seletor FPW fornece o nome `MARIA 2 SILVA 4812`
- **THEN** a primeira linha SHALL ser `*MARIA 2 SILVA`
- **AND** o número interno `2` SHALL ser preservado

#### Scenario: Dias repetidos e fora de ordem
- **WHEN** a mesma data aparece mais de uma vez em uma irregularidade, por exemplo uma britânica detectada na entrada e na saída do mesmo dia
- **THEN** a data SHALL aparecer uma única vez, posicionada em ordem cronológica

#### Scenario: Datas de mais de um mês
- **WHEN** as datas de uma irregularidade incluem dias do mês alvo e da semana de transição do mês seguinte
- **THEN** a ordem SHALL ser a cronológica real e cada data SHALL aparecer em `dd/mm`

#### Scenario: Contagem sem datas disponíveis
- **WHEN** uma irregularidade tem contagem maior que zero mas o modelo não guarda as datas
- **THEN** a linha SHALL ser mantida, informando a quantidade de ocorrências e que as datas não estão disponíveis, em vez de omitir a irregularidade


