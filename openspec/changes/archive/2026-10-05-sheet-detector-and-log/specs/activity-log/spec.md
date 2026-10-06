## Purpose

Registrar de forma estruturada, acumulada e persistente o que a Análise e o Ajuste fazem em cada folha, com estado antes e depois, para permitir diagnóstico, ajuste de regras e suporte a troubleshooting, com uma janela de consulta e cópia do texto completo.

## ADDED Requirements

### Requirement: Eventos estruturados de atividade
O sistema SHALL registrar cada ocorrência relevante de Análise e Ajuste como um evento com horário, identificação da execução e seu tipo (análise ou ajuste), funcionário quando aplicável, fase, tipo de evento e texto legível. O agrupamento por funcionário SHALL derivar dos dados do evento e não de formatação do texto.

#### Scenario: Evento durante a análise
- **WHEN** a Análise processa a folha de um funcionário
- **THEN** o log SHALL conter um evento com horário, execução de tipo análise, o nome do funcionário e as contagens e dias de cada categoria detectada

#### Scenario: Eventos de uma folha podem ser agrupados
- **WHEN** o log contém eventos de vários funcionários e execuções
- **THEN** SHALL ser possível obter todos os eventos de um funcionário em uma execução sem depender de linhas separadoras no texto

### Requirement: Estado antes e depois de cada folha no Ajuste
Para cada folha processada no Ajuste, o sistema SHALL registrar o estado **antes** de qualquer alteração e o estado **depois** da última ação concluída, incluindo ao menos as folgas e dias-alvo (ausências, feriados e domingos ocultos considerados), os dias com código 47 e os dias de cada categoria de irregularidade. O estado antes SHALL ser lido de forma somente leitura. Se a folha for interrompida, o estado depois SHALL indicar que não foi coletado ou que é parcial.

#### Scenario: Folha ajustada com sucesso
- **WHEN** o Ajuste conclui uma folha
- **THEN** o log SHALL conter o estado antes e o estado depois dessa folha
- **AND** ambos SHALL listar as datas das folgas, dos dias-alvo, dos dias com código 47 e das irregularidades por categoria

#### Scenario: Folha interrompida
- **WHEN** o Ajuste é interrompido durante a folha
- **THEN** o log SHALL conter o estado antes
- **AND** o estado depois SHALL ser marcado como não coletado ou parcial

### Requirement: Registro de cada ação e decisão do Ajuste
O sistema SHALL registrar, para cada ação do Ajuste, a fase, a data de origem e de destino quando houver, o resultado, e para cada alteração de código 47 para 48 a data do dia. Para cada folga que permanece presa SHALL registrar o motivo. Para cada falha, interrupção ou resultado não confirmado SHALL registrar a etapa, o motivo e se o resultado ficou não confirmado.

#### Scenario: Folga movimentada
- **WHEN** o Ajuste move uma folga de uma data para outra
- **THEN** o log SHALL registrar a fase, a data de origem, a data de destino e o resultado

#### Scenario: Código 47 alterado
- **WHEN** o Ajuste altera um dia de código 47 para 48
- **THEN** o log SHALL registrar a data do dia e a alteração

#### Scenario: Folga permanece presa
- **WHEN** nenhuma alternativa elegível existe para uma folga
- **THEN** o log SHALL registrar a data da folga e o motivo de ela permanecer presa

#### Scenario: Falha ou resultado não confirmado
- **WHEN** o Ajuste para por falha, timeout ou cancelamento
- **THEN** o log SHALL registrar a etapa e o motivo
- **AND** SHALL indicar quando o resultado de uma gravação não foi confirmado

### Requirement: Registro de análise por funcionário
Para cada folha lida pela Análise o sistema SHALL registrar as contagens e as datas de Sem Entrada/Saída, Interjornada, Marcação britânica e Folha não preenchida (com a porcentagem e o critério), as folgas a movimentar, os dias com código 47 e as horas extras e saldo de compensação.

#### Scenario: Funcionário sem irregularidades
- **WHEN** a Análise lê uma folha sem irregularidades
- **THEN** o log SHALL registrar essa folha como sem ocorrências, ainda com as contagens de folgas, código 47 e horas

### Requirement: Acúmulo e persistência do log durante a sessão
O log SHALL ser acumulado entre execuções, e iniciar uma nova Análise ou Ajuste SHALL NOT apagar eventos anteriores. Cada execução SHALL ser demarcada no log com identificação, tipo e horário de início. O log SHALL sobreviver ao recarregamento da página e SHALL ser descartado quando a aba for fechada. Uma falha de persistência SHALL NOT interromper a execução e SHALL ser registrada. Quando o limite de armazenamento for atingido, os eventos mais antigos SHALL ser descartados e o log SHALL indicar que houve truncamento.

#### Scenario: Nova execução preserva o log
- **WHEN** o usuário inicia o Ajuste depois de uma Análise
- **THEN** os eventos da Análise SHALL continuar disponíveis no log
- **AND** os eventos do Ajuste SHALL ser adicionados sob uma nova identificação de execução

#### Scenario: Página recarregada
- **WHEN** a página é recarregada na mesma aba
- **THEN** o log acumulado SHALL continuar disponível

#### Scenario: Aba fechada
- **WHEN** a aba é fechada e uma nova é aberta
- **THEN** o log anterior SHALL NOT estar disponível

#### Scenario: Recarregamento durante uma execução
- **WHEN** a página é recarregada enquanto uma execução estava em andamento
- **THEN** o log SHALL manter os eventos já registrados
- **AND** a execução SHALL constar como interrompida

#### Scenario: Armazenamento cheio ou indisponível
- **WHEN** o armazenamento persistente falha ou atinge o limite
- **THEN** a execução SHALL continuar
- **AND** o log SHALL registrar a falha ou o truncamento dos eventos mais antigos

### Requirement: Janela de consulta e cópia do log
O painel SHALL oferecer um botão **Log**, disponível a qualquer momento (inclusive vazio e durante uma execução), que abra uma janela com o texto completo do log, legível e copiável. A janela SHALL oferecer uma ação para copiar todo o texto para a área de transferência. O texto SHALL ser puro, sem depender de cores, e SHALL conter horário, execução, funcionário, fase e dados de cada evento.

#### Scenario: Abrir o log durante uma execução
- **WHEN** o usuário clica em Log durante uma execução
- **THEN** a janela SHALL abrir com os eventos registrados até o momento
- **AND** a execução SHALL NOT ser interrompida

#### Scenario: Log vazio
- **WHEN** nenhuma execução ocorreu
- **THEN** a janela SHALL abrir e indicar que não há eventos

#### Scenario: Copiar o log
- **WHEN** o usuário aciona a cópia na janela
- **THEN** o texto completo SHALL ser copiado para a área de transferência

### Requirement: Log não registra dados de autenticação
O log SHALL NOT registrar cookies, tokens ou URLs com credenciais. SHALL registrar apenas dados da folha (nomes de funcionários, datas, horários, códigos e contagens), da execução e da automação.

#### Scenario: Registro de falha de rede ou de página
- **WHEN** uma falha envolve uma requisição ou URL
- **THEN** o log SHALL registrar a etapa e o motivo sem incluir cookies, tokens ou parâmetros de autenticação
