# Spec Delta

## Purpose
Define a escolha entre os modos de Ajuste Automático e Supervisionado e o fluxo de confirmação humana do modo Supervisionado, incluindo suas travas de segurança.

## ADDED Requirements

### Requirement: Seletor de modo excludente no painel
O painel SHALL ter um seletor com os modos Automático e Supervisionado, em que exatamente um está ativo em qualquer momento. O modo inicial SHALL ser Automático. A escolha SHALL persistir durante a sessão da aba, inclusive após recarregar a página, e SHALL ficar indisponível para alteração enquanto uma Análise, um Ajuste ou uma confirmação pendente estiver em andamento. O modo SHALL ser visível no painel a todo momento.

#### Scenario: Modo inicial
- **WHEN** o painel carrega pela primeira vez na sessão
- **THEN** o modo Automático SHALL estar ativo e o Supervisionado SHALL estar inativo

#### Scenario: Troca de modo
- **WHEN** o usuário seleciona o modo Supervisionado
- **THEN** o modo Supervisionado SHALL ficar ativo e o Automático SHALL ficar inativo, nunca os dois ao mesmo tempo

#### Scenario: Modo persiste
- **WHEN** o usuário seleciona o modo Supervisionado e a página é recarregada
- **THEN** o painel SHALL abrir com o modo Supervisionado ativo

#### Scenario: Trava durante a execução
- **WHEN** uma Análise, um Ajuste ou uma confirmação pendente está em andamento
- **THEN** o seletor SHALL NOT permitir trocar o modo

### Requirement: Modo Automático mantém o comportamento atual
Com o modo Automático ativo, Ajustar SHALL se comportar como antes desta mudança: percorrer a lista de funcionários, aplicando o Ajuste a cada folha, até o último nome, sem janela de confirmação. O botão Analisar SHALL se comportar da mesma forma em qualquer modo.

#### Scenario: Ajustar em modo Automático
- **WHEN** o modo Automático está ativo e o usuário aciona Ajustar
- **THEN** o Ajuste SHALL iniciar imediatamente e percorrer a lista como antes
- **AND** nenhuma janela de confirmação SHALL ser aberta

#### Scenario: Analisar em modo Supervisionado
- **WHEN** o modo Supervisionado está ativo e o usuário aciona Analisar
- **THEN** a Análise SHALL percorrer a lista como em qualquer modo

### Requirement: Confirmação com pré-análise no modo Supervisionado
Com o modo Supervisionado ativo, acionar Ajustar SHALL abrir uma janela que apresenta a pré-análise da folha atual e pede confirmação para aplicar ou cancelar, sem executar nenhuma alteração antes da confirmação. A janela SHALL identificar que o ajuste supervisionado está selecionado e orientar que, para percorrer a lista inteira, o usuário deve trocar para o modo Automático e acionar Ajustar novamente. Enquanto a confirmação estiver pendente, Analisar, Ajustar e o seletor de modo SHALL ficar indisponíveis.

#### Scenario: Abrir a confirmação
- **WHEN** o modo Supervisionado está ativo, uma folha está selecionada e o usuário aciona Ajustar
- **THEN** a janela SHALL abrir com a pré-análise da folha atual e as opções de aplicar e cancelar
- **AND** nenhum campo, popup ou gravação SHALL ter sido acionado

#### Scenario: Orientação para o modo Automático
- **WHEN** a janela de confirmação está aberta
- **THEN** ela SHALL informar que o ajuste supervisionado está selecionado e que, para rodar a lista inteira, é preciso trocar para o modo Automático e acionar Ajustar novamente

#### Scenario: Confirmação pendente trava os controles
- **WHEN** a janela de confirmação está aberta
- **THEN** Analisar, Ajustar e o seletor de modo SHALL estar indisponíveis

### Requirement: Aplicação somente na folha atual
Ao confirmar, o sistema SHALL executar todas as fases do Ajuste somente na folha do funcionário apresentado na pré-análise e SHALL encerrar sem avançar para outro funcionário. Ao cancelar ou fechar a janela sem confirmar, o sistema SHALL NOT executar nenhuma fase e SHALL voltar ao estado ocioso.

#### Scenario: Aplicar
- **WHEN** o usuário confirma a aplicação
- **THEN** as fases do Ajuste SHALL ser executadas na folha atual
- **AND** ao terminar, o funcionário selecionado na página SHALL continuar sendo o mesmo

#### Scenario: Cancelar
- **WHEN** o usuário aciona cancelar na janela de confirmação
- **THEN** nenhuma fase do Ajuste SHALL ser executada
- **AND** os controles do painel SHALL voltar ao estado ocioso

#### Scenario: Fechar a janela sem decidir
- **WHEN** o usuário fecha a janela de confirmação sem aplicar
- **THEN** o resultado SHALL ser o mesmo do cancelamento

#### Scenario: Parar durante a aplicação
- **WHEN** o usuário aciona Parar durante a aplicação
- **THEN** o Ajuste SHALL parar como em qualquer execução e a janela SHALL mostrar o status parado

### Requirement: Revalidação antes de aplicar
Antes de executar qualquer alteração depois da confirmação, o sistema SHALL verificar que o funcionário selecionado e a estrutura da página são os da pré-análise. Se o funcionário mudou ou a estrutura deixou de atender às pré-condições do Ajuste, o sistema SHALL recusar a aplicação, SHALL informar o motivo e SHALL NOT executar nenhuma alteração.

#### Scenario: Funcionário trocado depois da pré-análise
- **WHEN** o funcionário selecionado na página mudou entre a pré-análise e a confirmação
- **THEN** a aplicação SHALL ser recusada com a indicação de que a folha mudou
- **AND** nenhuma alteração SHALL ser executada

#### Scenario: Estrutura da página inválida
- **WHEN** a estrutura da página não atende às pré-condições do Ajuste no momento da confirmação
- **THEN** a aplicação SHALL ser recusada com o diagnóstico
- **AND** nenhuma alteração SHALL ser executada

### Requirement: Aviso quando não há folha selecionada
No modo Supervisionado, se nenhuma folha estiver selecionada, acionar Ajustar SHALL mostrar um aviso para selecionar uma folha ou trocar para o modo Automático e SHALL NOT abrir a pré-análise nem iniciar nenhuma execução.

#### Scenario: Seleção de funcionário vazia
- **WHEN** o modo Supervisionado está ativo, nenhum funcionário está selecionado e o usuário aciona Ajustar
- **THEN** o painel SHALL avisar para selecionar uma folha ou trocar de modo
- **AND** nenhuma janela de confirmação nem execução SHALL ser iniciada

### Requirement: Folha sem marcações no modo Supervisionado
Se a folha atual não tiver marcações, a janela SHALL apresentar o resumo informando que não há o que ajustar e SHALL NOT oferecer a aplicação, apenas o fechamento.

#### Scenario: Folha vazia
- **WHEN** o modo Supervisionado está ativo e a folha atual não tem marcações
- **THEN** a janela SHALL informar que não há o que ajustar
- **AND** a opção de aplicar SHALL NOT estar disponível

### Requirement: Resumo final e status na mesma janela
Durante e depois da aplicação, a mesma janela SHALL mostrar o andamento e, ao fim, o resultado, composto pelo status final (concluído, parado ou interrompido, com o motivo quando houver) e pelo texto do detalhe de ajustes do funcionário, o mesmo do detalhe expansível do relatório. O relatório SHALL refletir o Ajuste como em qualquer execução.

#### Scenario: Aplicação concluída
- **WHEN** a aplicação termina sem parada nem falha
- **THEN** a janela SHALL mostrar o status concluído e o texto do detalhe de ajustes do funcionário

#### Scenario: Aplicação interrompida
- **WHEN** a aplicação é interrompida por falha
- **THEN** a janela SHALL mostrar o status interrompido com o motivo e o detalhe dos ajustes realizados até então

### Requirement: Som de atenção na confirmação
O sistema SHALL tocar um som de atenção uma vez quando a janela de confirmação abrir, distinto dos sons de início, conclusão, parada e falha. O som de início SHALL tocar somente depois que a revalidação passar e a aplicação começar. Cancelar SHALL NOT tocar som de desfecho. Os demais sons SHALL seguir o contrato de sons das execuções.

#### Scenario: Abrir a confirmação
- **WHEN** a janela de confirmação abre
- **THEN** o som de atenção SHALL tocar uma vez

#### Scenario: Cancelar
- **WHEN** o usuário cancela a confirmação
- **THEN** nenhum som de início, conclusão, parada ou falha SHALL tocar

#### Scenario: Aplicação aceita
- **WHEN** o usuário confirma e a revalidação passa
- **THEN** o som de início SHALL tocar uma vez
- **AND** ao concluir, o som de conclusão SHALL tocar uma vez
