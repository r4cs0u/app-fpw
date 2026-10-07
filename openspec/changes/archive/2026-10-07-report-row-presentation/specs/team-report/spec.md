# Spec Delta

## MODIFIED Requirements

### Requirement: Relatório sempre disponível e atualizado ao vivo
O botão de relatório do painel SHALL estar habilitado a qualquer momento, inclusive antes de qualquer execução e durante uma execução, e SHALL abrir a janela do relatório. A janela SHALL refletir o modelo atual e SHALL se atualizar enquanto aberta, sem exigir reabertura nem a conclusão da execução, preservando a ordenação, o filtro e a linha selecionada. Quando houver execução em andamento, a janela SHALL indicar qual funcionário está sendo processado fazendo a linha dele pulsar, sem acrescentar texto de status ao nome. O pulso SHALL cessar quando a execução terminar, for parada ou falhar. Abrir a janela e atualizá-la SHALL ser somente leitura e SHALL NOT interromper nem alterar a execução.

#### Scenario: Abrir antes de qualquer execução
- **WHEN** o usuário clica em Relatório sem ter executado Análise ou Ajuste
- **THEN** a janela SHALL abrir com todos os funcionários e sem números

#### Scenario: Preenchimento durante a execução
- **WHEN** a janela está aberta e a Análise lê a folha de um funcionário
- **THEN** a linha desse funcionário SHALL ser preenchida sem reabrir a janela
- **AND** a linha do funcionário em processamento SHALL pulsar

#### Scenario: Indicação sem texto
- **WHEN** um funcionário está sendo processado
- **THEN** a célula do nome SHALL conter apenas o nome, sem texto como "processando"

#### Scenario: Fim do pulso
- **WHEN** a execução termina, é parada pelo usuário ou é interrompida por falha
- **THEN** nenhuma linha SHALL continuar pulsando

#### Scenario: Preserva visão do usuário
- **WHEN** o modelo é atualizado enquanto a tabela está ordenada, filtrada e com uma linha selecionada
- **THEN** a ordenação, o filtro e a seleção SHALL permanecer

#### Scenario: Janela já aberta
- **WHEN** o usuário clica em Relatório com a janela já aberta
- **THEN** a mesma janela SHALL receber o foco e ser atualizada

### Requirement: Lista completa de funcionários desde a abertura
A tabela SHALL listar todos os funcionários do seletor da sessão atual desde que uma execução conheça a lista, na ordem alfabética sem acentos por padrão. Antes de processados, os funcionários SHALL aparecer atenuados com `-` nas colunas de dados. Funcionários cuja folha não tem marcações SHALL ser apresentados com o nome seguido de uma única célula que ocupa todas as demais colunas da linha, com o texto "Sem Marcações na Folha". Funcionários cuja folha foi interrompida no meio do Ajuste SHALL ser indicados como parciais, com os valores confirmados até então, e a indicação SHALL permanecer visível mesmo com nomes longos. A lista SHALL vir somente do seletor da sessão e nunca de valores fixos.

#### Scenario: Lista cheia com números pendentes
- **WHEN** a Análise inicia com 40 funcionários no seletor
- **THEN** a tabela SHALL mostrar 40 linhas atenuadas
- **AND** cada linha SHALL ser preenchida quando a folha correspondente for lida

#### Scenario: Folha sem marcações
- **WHEN** a página de um funcionário informa que não há marcações
- **THEN** a linha SHALL mostrar o nome e uma única célula mesclada com "Sem Marcações na Folha", e SHALL NOT mostrar valores por coluna, nem `0`, nem `-` por coluna
- **AND** a linha SHALL NOT contar como pendência
- **AND** a linha SHALL NOT entrar nos indicadores, nos filtros por indicador nem no texto copiado
- **AND** o mesmo SHALL valer na Análise e no Ajuste

#### Scenario: Linha sem marcações com filtro por indicador ativo
- **WHEN** um filtro por indicador está ativo
- **THEN** a linha de um funcionário sem marcações SHALL NOT aparecer na tabela

#### Scenario: Ajuste interrompido
- **WHEN** o Ajuste é interrompido durante a folha de um funcionário
- **THEN** a linha SHALL ser indicada como parcial e mostrar apenas os valores confirmados

#### Scenario: Nome longo com indicação de parcial
- **WHEN** o funcionário tem nome longo e a folha está parcial
- **THEN** o nome SHALL ser abreviado ou truncado antes da indicação de parcial, que SHALL continuar visível
