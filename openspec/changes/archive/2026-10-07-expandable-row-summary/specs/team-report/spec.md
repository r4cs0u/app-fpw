# Spec Delta

## MODIFIED Requirements

### Requirement: Detalhe dos ajustes expansível por linha
Cada linha da tabela SHALL ter um botão que expande, abaixo dela, o detalhe dos ajustes e irregularidades do funcionário, e que recolhe o detalhe ao ser acionado de novo. O botão SHALL ficar habilitado quando o funcionário tiver ajustes registrados OU qualquer irregularidade registrada, e desabilitado quando não houver nenhum dado detalhável. Acionar o botão SHALL NOT selecionar a linha nem alterar o funcionário selecionado na página, SHALL ser somente leitura e SHALL NOT interromper nem alterar uma execução em andamento. O detalhe expandido SHALL permanecer aberto quando a tabela for atualizada, ordenada ou filtrada, enquanto o funcionário estiver visível, e SHALL refletir o modelo atualizado.

#### Scenario: Expandir o detalhe
- **WHEN** o usuário aciona o botão de detalhe da linha de um funcionário com Ajuste registrado ou irregularidades
- **THEN** uma linha de detalhe SHALL aparecer abaixo dela, com o texto dos detalhes

#### Scenario: Recolher o detalhe
- **WHEN** o usuário aciona novamente o botão de uma linha expandida
- **THEN** a linha de detalhe SHALL desaparecer

#### Scenario: Funcionário sem Ajuste
- **WHEN** a linha é de um funcionário não processado, sem marcações ou sem ajustes nem irregularidades registradas
- **THEN** o botão SHALL aparecer desabilitado e acioná-lo SHALL NOT expandir nada

#### Scenario: Botão não navega
- **WHEN** o usuário aciona o botão de detalhe de uma linha
- **THEN** o funcionário selecionado na página SHALL NOT mudar e a linha SHALL NOT ser marcada como selecionada

#### Scenario: Detalhe preservado na atualização
- **WHEN** o modelo é atualizado enquanto o detalhe de um funcionário está expandido
- **THEN** o detalhe SHALL continuar expandido e SHALL mostrar o conteúdo atualizado

### Requirement: Texto do detalhe dos ajustes
O texto do detalhe SHALL começar com o nome do funcionário sem o sufixo numérico do seletor FPW, preservando números que façam parte do restante do nome, seguido de uma árvore com as seções de ajustes e irregularidades, cada uma só quando tiver conteúdo:
- `|_Folgas movimentadas`, com uma linha `  |_ <dd/mm/aaaa> <- origem <dd/mm/aaaa> => <resultado>` por ação, na ordem em que ocorreram;
- `|_Folgas Presas`, com uma linha `  |_Dias: <dias>` com os dias das folgas presas em `dd/mm/aaaa`, em ordem cronológica e sem repetição;
- `|_Códigos 47`, com uma linha `  |_ Dias: <dias>` e/ou `  |_ Restantes: <quantidade>`;
- `|_Sem Entrada/Saída`, com uma linha `  |_ Dias: <dias>` com os dias em `dd/mm/aaaa` em ordem cronológica;
- `|_Interjornada`, com uma linha `  |_ Dias: <dias>` com os dias em `dd/mm/aaaa` em ordem cronológica;
- `|_Marcações Britânicas`, com uma linha `  |_ Dias: <dias>` com os dias em `dd/mm/aaaa` em ordem cronológica;
- `|_Folha Não Preenchida`, com uma linha `  |_ Percentual: <pct>%` (sem listar datas).
Um Ajuste interrompido na folha SHALL acrescentar a linha `|_Ajuste parcial (interrompido)` logo abaixo do nome. Quando nenhuma seção tiver conteúdo, o texto SHALL conter o nome e a linha `|_Nenhum ajuste registrado`. O texto SHALL usar somente os dados do modelo e SHALL NOT depender do log.

#### Scenario: Ajuste com folgas, presas e códigos 47
- **WHEN** um funcionário teve uma folga alterada de 07/09/2026 para 13/09/2026, outra sem alteração de 02/09/2026 para 04/09/2026, a folga de 02/09/2026 presa e os códigos 47 de 25/09/2026 e 07/09/2026 convertidos
- **THEN** o texto SHALL ser, em linhas: `MARIA SILVA`, `|_Folgas movimentadas`, `  |_ 13/09/2026 <- origem 07/09/2026 => alterado`, `  |_ 04/09/2026 <- origem 02/09/2026 => sem alteração`, `|_Folgas Presas`, `  |_Dias: 02/09/2026`, `|_Códigos 47`, `  |_ Dias: 07/09/2026, 25/09/2026`

#### Scenario: Seção sem conteúdo é omitida
- **WHEN** o funcionário só teve códigos 47 convertidos
- **THEN** o texto SHALL conter o nome e a seção de códigos 47, sem as seções de folgas

#### Scenario: Sufixo numérico do seletor
- **WHEN** o seletor FPW fornece o nome `MARIA 2 SILVA 4812`
- **THEN** a primeira linha SHALL ser `MARIA 2 SILVA`

#### Scenario: Ajuste sem nada a registrar
- **WHEN** o Ajuste foi executado e não movimentou folgas, não deixou folgas presas, não converteu códigos e não há irregularidades
- **THEN** o texto SHALL conter o nome e a linha `|_Nenhum ajuste registrado`

#### Scenario: Ajuste parcial
- **WHEN** o Ajuste foi interrompido durante a folha do funcionário depois de uma folga movimentada
- **THEN** o texto SHALL conter a linha `|_Ajuste parcial (interrompido)` e a folga movimentada

#### Scenario: Códigos 47 restantes
- **WHEN** 2 dias de código 47 foram convertidos e 1 restou
- **THEN** a seção de códigos 47 SHALL listar os 2 dias convertidos e a linha `  |_ Restantes: 1`


