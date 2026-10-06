## Purpose

Gerar, a partir do relatório do time, textos de irregularidades prontos para copiar e enviar, por funcionário ou para todos os que estão visíveis na tabela, listando os dias que precisam de ajuste.

## ADDED Requirements

### Requirement: Texto de irregularidades por funcionário
O sistema SHALL gerar, para um funcionário, um texto cuja primeira linha é `*` seguido do nome completo e que tem, em seguida, uma linha para cada irregularidade existente, nesta ordem: Sem Entrada/Saída, Interjornada, Marcações britânicas e Folha não preenchida. As linhas de Sem Entrada/Saída, Interjornada e Marcações britânicas SHALL listar os dias da irregularidade em `dd/mm`, em ordem cronológica e sem repetição, separados por vírgula, e terminar com ponto. A linha de Folha não preenchida SHALL conter apenas o aviso para realizar o preenchimento da folha e a porcentagem de dias sem marcação, sem listar dias. Irregularidades inexistentes SHALL NOT gerar linha. O texto SHALL usar a leitura mais recente do funcionário, seja da Análise ou do Ajuste.

Os textos das linhas SHALL ser:
- Sem Entrada/Saída: `- s/marcação de entrada ou saída nos dias, <dias>.`
- Interjornada: `- Checar se interjornada é devida nos dias, <dias>.`
- Marcações britânicas: `- Ajustar marcações britânicas, nos dias <dias>.`
- Folha não preenchida: `- Realizar o preenchimento da folha (<pct>% dos dias sem marcação).`

#### Scenario: Funcionário com as quatro irregularidades
- **WHEN** um funcionário tem Sem Entrada/Saída em 27/09, 01/09 e 03/09, interjornada em 07/09, marcações britânicas em 04/09, 05/09 e 06/09 e folha sinalizada com 73%
- **THEN** o texto SHALL ter a linha `*<nome>` e quatro linhas de irregularidade na ordem definida
- **AND** os dias de Sem Entrada/Saída SHALL aparecer como `01/09, 03/09, 27/09`
- **AND** a linha da folha SHALL mostrar `73%` e nenhum dia

#### Scenario: Irregularidade ausente não gera linha
- **WHEN** um funcionário tem apenas marcações britânicas
- **THEN** o texto SHALL conter somente a linha do nome e a linha de marcações britânicas

#### Scenario: Dias repetidos e fora de ordem
- **WHEN** a mesma data aparece mais de uma vez em uma irregularidade, por exemplo uma britânica detectada na entrada e na saída do mesmo dia
- **THEN** a data SHALL aparecer uma única vez, posicionada em ordem cronológica

#### Scenario: Datas de mais de um mês
- **WHEN** as datas de uma irregularidade incluem dias do mês alvo e da semana de transição do mês seguinte
- **THEN** a ordem SHALL ser a cronológica real e cada data SHALL aparecer em `dd/mm`

#### Scenario: Contagem sem datas disponíveis
- **WHEN** uma irregularidade tem contagem maior que zero mas o modelo não guarda as datas
- **THEN** a linha SHALL ser mantida, informando a quantidade de ocorrências e que as datas não estão disponíveis, em vez de omitir a irregularidade

### Requirement: Funcionários que não geram texto
O sistema SHALL NOT gerar texto para funcionários não processados, para funcionários cuja folha não tem marcações, nem para funcionários sem nenhuma irregularidade. Funcionários que foram apenas analisados, sem Ajuste, SHALL gerar texto normalmente a partir da leitura da Análise.

#### Scenario: Sem irregularidade
- **WHEN** um funcionário processado não tem nenhuma irregularidade
- **THEN** nenhum texto SHALL ser gerado para ele

#### Scenario: Folha sem marcações
- **WHEN** a folha de um funcionário foi registrada como sem marcações
- **THEN** nenhum texto SHALL ser gerado para ele

#### Scenario: Funcionário não processado
- **WHEN** nenhuma execução leu a folha de um funcionário
- **THEN** nenhum texto SHALL ser gerado para ele

#### Scenario: Apenas analisado
- **WHEN** um funcionário foi analisado e ainda não ajustado e tem irregularidades
- **THEN** o texto SHALL ser gerado com as irregularidades da Análise

### Requirement: Cópia direta do texto de um funcionário
Cada linha da tabela do relatório SHALL ter um ícone que copia para a área de transferência o texto de irregularidades daquele funcionário e confirma visualmente a cópia por tempo curto. O ícone SHALL aparecer desabilitado, com indicação de que não há irregularidades, quando o funcionário não gerar texto. Clicar no ícone SHALL NOT selecionar a linha nem alterar o funcionário selecionado na página. Se a cópia falhar, o sistema SHALL avisar o usuário e SHALL NOT interromper nenhuma execução.

#### Scenario: Copiar a pessoa
- **WHEN** o usuário clica no ícone da linha de um funcionário com irregularidades
- **THEN** a área de transferência SHALL receber o texto desse funcionário
- **AND** o ícone SHALL indicar que a cópia foi feita

#### Scenario: Linha sem irregularidades
- **WHEN** a linha é de um funcionário sem irregularidades, sem marcações ou não processado
- **THEN** o ícone SHALL aparecer desabilitado e clicar nele SHALL NOT copiar nada

#### Scenario: Ícone não navega
- **WHEN** o usuário clica no ícone de uma linha
- **THEN** o funcionário selecionado na página SHALL NOT mudar e a linha SHALL NOT ser marcada como selecionada

#### Scenario: Falha ao copiar
- **WHEN** a área de transferência não está disponível
- **THEN** o usuário SHALL ser avisado e a janela do relatório SHALL continuar utilizável

### Requirement: Exportação do time pelo que está visível na tabela
O fim da tabela SHALL ter o botão "Exportar irregularidades", que abre uma janela com o texto dos funcionários visíveis na tabela naquele momento, respeitando o filtro por indicador e o extremo mín/máx ativos e a ordem em que a tabela está exibida. O texto SHALL começar com um título que contém o mês do relatório e, quando um filtro por indicador estiver ativo, a indicação desse filtro. Cada funcionário SHALL ser separado do seguinte por uma linha em branco, e cada um SHALL aparecer com todas as suas irregularidades, não apenas a do filtro. Funcionários visíveis que não geram texto SHALL ser omitidos. Sem filtro, o texto SHALL cobrir todos os funcionários com irregularidades.

#### Scenario: Exportar o time inteiro
- **WHEN** nenhum filtro está ativo e o usuário aciona Exportar irregularidades
- **THEN** a janela SHALL mostrar o título com o mês e o texto de cada funcionário com irregularidades, na ordem da tabela, separados por linha em branco

#### Scenario: Exportar apenas quem tem marcação britânica
- **WHEN** o filtro de Marc. Britânicas está ativo e o usuário aciona Exportar irregularidades
- **THEN** o texto SHALL conter somente os funcionários que a tabela exibe com marcação britânica
- **AND** o título SHALL indicar o filtro de Marc. Britânicas

#### Scenario: Extremo ativo
- **WHEN** um extremo mín/máx ativo reduz a tabela a alguns funcionários
- **THEN** o texto SHALL conter somente esses funcionários que geram texto

#### Scenario: Nenhuma irregularidade visível
- **WHEN** nenhum funcionário visível gera texto
- **THEN** a janela SHALL informar que não há irregularidades para exportar, sem lista de funcionários

### Requirement: Janela de exportação somente leitura
A janela de exportação SHALL exibir o texto selecionável, ter botão Copiar tudo com confirmação visual e indicar o horário em que o texto foi gerado. Acionar o botão novamente com a janela já aberta SHALL reutilizar a mesma janela e regenerar o texto com a visão atual da tabela. Abrir, atualizar e copiar SHALL ser somente leitura e SHALL NOT interromper nem alterar uma Análise ou Ajuste em andamento. O texto SHALL ser um retrato do momento da abertura e SHALL NOT mudar sozinho quando o relatório for atualizado.

#### Scenario: Copiar tudo
- **WHEN** o usuário clica em Copiar tudo na janela de exportação
- **THEN** a área de transferência SHALL receber exatamente o texto exibido, sem o horário de geração
- **AND** o botão SHALL indicar que a cópia foi feita

#### Scenario: Reabrir com a visão atual
- **WHEN** a janela de exportação está aberta e o usuário muda o filtro da tabela e aciona Exportar irregularidades novamente
- **THEN** a mesma janela SHALL receber o foco e mostrar o texto da nova visão

#### Scenario: Exportar durante uma execução
- **WHEN** o usuário exporta enquanto a Análise ou o Ajuste está em andamento
- **THEN** a execução SHALL continuar sem alteração
- **AND** o texto SHALL conter apenas os funcionários já processados naquele momento
