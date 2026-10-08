# Spec Delta

## Purpose
Define os sons que sinalizam o ciclo de vida das execuções de Análise e de Ajuste (início, conclusão, parada pelo usuário e falha) e quando cada um deve, ou não deve, ser tocado.

## ADDED Requirements

### Requirement: Som de início somente depois das verificações iniciais
O sistema SHALL tocar o som de início de uma execução apenas depois que ela passou pelas verificações iniciais que a permitem prosseguir. No Ajuste, isso significa depois de validada a estrutura da página; na Análise, depois de localizada a lista de funcionários. Uma execução recusada nessas verificações SHALL NOT tocar o som de início.

#### Scenario: Ajuste com a página em estado válido
- **WHEN** o usuário aciona Ajustar e a estrutura da página passa nas pré-condições
- **THEN** o som de início SHALL tocar uma vez, depois dessa validação e antes do processamento da primeira folha

#### Scenario: Ajuste com pré-condição inválida
- **WHEN** o usuário aciona Ajustar e a estrutura da página falha nas pré-condições
- **THEN** o som de início SHALL NOT tocar
- **AND** o som de falha SHALL tocar uma vez

#### Scenario: Análise sem lista de funcionários
- **WHEN** o usuário aciona Analisar e a lista de funcionários não é encontrada
- **THEN** o som de início SHALL NOT tocar
- **AND** o som de falha SHALL tocar uma vez

### Requirement: Som de conclusão imediato e somente em conclusão normal
O sistema SHALL tocar o som de conclusão assim que uma execução de Análise ou de Ajuste termina sem parada e sem falha, sem espera artificial prévia. O som de conclusão SHALL NOT tocar quando a execução foi parada pelo usuário ou interrompida por falha.

#### Scenario: Execução concluída
- **WHEN** a Análise ou o Ajuste percorre a lista até o fim sem parada nem falha
- **THEN** o som de conclusão SHALL tocar uma vez, sem atraso fixo adicionado antes dele

#### Scenario: Execução parada
- **WHEN** o usuário para a execução antes do fim
- **THEN** o som de conclusão SHALL NOT tocar

#### Scenario: Execução interrompida por falha
- **WHEN** a execução é interrompida por erro
- **THEN** o som de conclusão SHALL NOT tocar

### Requirement: Som de falha distinto para interrupção por erro
O sistema SHALL tocar um som de falha, diferente dos sons de início, conclusão e parada, uma única vez quando uma execução de Análise ou de Ajuste é interrompida por erro, incluindo pré-condição inválida, falha de espera, falha de gravação e erro inesperado. A parada pedida pelo usuário SHALL NOT tocar o som de falha.

#### Scenario: Falha durante o Ajuste
- **WHEN** o Ajuste é interrompido por erro depois de iniciado
- **THEN** o som de falha SHALL tocar uma vez
- **AND** nenhum som de conclusão SHALL tocar

#### Scenario: Parada pelo usuário não é falha
- **WHEN** o usuário aciona Parar durante uma execução
- **THEN** o som de falha SHALL NOT tocar

### Requirement: Som de parada somente com execução em andamento
O sistema SHALL tocar o som de parada uma única vez quando o usuário aciona Parar e há uma Análise ou um Ajuste em andamento. Acionar Parar sem execução em andamento SHALL NOT tocar som.

#### Scenario: Parar durante a execução
- **WHEN** há uma execução em andamento e o usuário aciona Parar
- **THEN** o som de parada SHALL tocar uma vez

#### Scenario: Parar sem execução
- **WHEN** não há execução em andamento e Parar é acionado
- **THEN** nenhum som SHALL tocar

### Requirement: Um único som de desfecho por execução
O sistema SHALL tocar, ao longo de cada execução de Análise ou de Ajuste, no máximo um som de desfecho, que é conclusão, parada ou falha. Uma interrupção por erro que ocorra depois de uma parada pelo usuário na mesma execução SHALL NOT acrescentar um segundo som.

#### Scenario: Falha depois de parada
- **WHEN** o usuário para a execução e, em seguida, um erro é registrado na mesma execução
- **THEN** somente o som de parada SHALL ter tocado nessa execução

#### Scenario: Execução concluída
- **WHEN** uma execução termina normalmente
- **THEN** somente o som de conclusão SHALL ter tocado como desfecho dessa execução

### Requirement: Abrir o Relatório não toca som
O sistema SHALL NOT tocar som ao abrir a janela do Relatório, antes, durante ou depois de uma execução, porque o relatório é atualizado ao vivo. O som de cópia SHALL deixar de existir.

#### Scenario: Abrir o Relatório
- **WHEN** o usuário aciona o botão Relatório
- **THEN** a janela do Relatório SHALL abrir
- **AND** nenhum som SHALL tocar

#### Scenario: Conclusão com o Relatório aberto
- **WHEN** uma execução conclui com a janela do Relatório aberta
- **THEN** apenas o som de conclusão SHALL tocar, sem som adicional de relatório
