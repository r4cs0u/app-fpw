## Purpose

Apresentar, em uma única janela sempre disponível e atualizada ao vivo, o resultado da Análise e do Ajuste de cada funcionário do time, sem que uma execução apague a outra, com progresso em fração, cores de atenção e as irregularidades abertas por tipo.

## ADDED Requirements

### Requirement: Modelo único por funcionário com Análise e Ajuste coexistindo
O sistema SHALL manter um único registro de relatório por funcionário, alimentado pela Análise e pelo Ajuste. Iniciar ou concluir uma dessas execuções SHALL NOT apagar os dados que a outra produziu para os funcionários não reprocessados. O registro SHALL guardar, para cada funcionário, os dados da última Análise (folgas a movimentar, Cód 47, os dias de cada irregularidade, horas extras e saldo de compensação) e os do Ajuste (folgas movimentadas, folgas presas com data e motivo, Cód 47 convertidos e restantes e o estado final da folha). Os dias de cada irregularidade SHALL permanecer disponíveis para consumo posterior.

#### Scenario: Ajuste depois da Análise preserva a Análise
- **WHEN** uma Análise de todos os funcionários é concluída e em seguida o Ajuste é executado
- **THEN** os dados da Análise de cada funcionário SHALL continuar disponíveis
- **AND** os dados do Ajuste SHALL ser acrescentados ao registro do mesmo funcionário

#### Scenario: Análise depois do Ajuste
- **WHEN** o Ajuste foi executado para um funcionário e uma nova Análise lê a folha desse funcionário
- **THEN** os dados de Análise desse funcionário SHALL ser atualizados com a nova leitura
- **AND** os valores de folgas e Cód 47 desse funcionário SHALL voltar a ser números inteiros da Análise, substituindo a fração

#### Scenario: Execução parcial não apaga os demais funcionários
- **WHEN** uma Análise ou um Ajuste é interrompido no meio da lista
- **THEN** os funcionários já processados SHALL manter seus dados e os não processados SHALL manter o que tinham

### Requirement: Folgas e Cód 47 em fração de progresso
Após uma Análise, a coluna de folgas SHALL mostrar o número inteiro de folgas a movimentar e a coluna de Cód 47 o número inteiro de dias com código 47. Após o Ajuste de um funcionário, cada coluna SHALL mostrar uma fração e SHALL NOT mostrar porcentagem. Na coluna de folgas, o numerador SHALL ser o total de folgas movimentadas desde a última Análise do funcionário e o denominador SHALL ser esse total mais as folgas que permaneceram presas na última execução do Ajuste. Na coluna de Cód 47, o numerador SHALL ser o total de dias convertidos desde a última Análise e o denominador SHALL ser esse total mais os dias com código 47 que restaram. Executar o Ajuste mais de uma vez sobre o mesmo funcionário SHALL acumular as movimentadas e os convertidos e SHALL usar as presas e os restantes da execução mais recente. Quando o denominador for zero, a coluna SHALL mostrar `0` em vez de fração.

#### Scenario: Ajuste com folga presa
- **WHEN** a Análise indicou 5 folgas a movimentar e o Ajuste movimentou 4 e deixou 1 presa
- **THEN** a coluna de folgas desse funcionário SHALL mostrar `4/5`

#### Scenario: Ajuste sem Análise prévia
- **WHEN** o Ajuste é executado sobre um funcionário que não foi analisado e movimenta 2 folgas sem deixar presas
- **THEN** a coluna de folgas SHALL mostrar `2/2`

#### Scenario: Folga que só a fase final resolve ou prende
- **WHEN** a Análise indicou 0 folgas a movimentar e o Ajuste deixou 1 folga presa e não movimentou nenhuma
- **THEN** a coluna de folgas SHALL mostrar `0/1`

#### Scenario: Ajuste repetido sobre a mesma folha
- **WHEN** o Ajuste movimentou 4 folgas e deixou 1 presa, e uma segunda execução do Ajuste nada movimenta e mantém a mesma folga presa
- **THEN** a coluna de folgas SHALL continuar mostrando `4/5`

#### Scenario: Cód 47 convertido
- **WHEN** o Ajuste converte 3 dias de código 47 para 48 e nenhum dia com 47 permanece
- **THEN** a coluna de Cód 47 SHALL mostrar `3/3`

#### Scenario: Cód 47 não convertido
- **WHEN** havia 3 dias com código 47 e o Ajuste converte 2, restando 1
- **THEN** a coluna de Cód 47 SHALL mostrar `2/3`

#### Scenario: Nada a movimentar nem a converter
- **WHEN** o Ajuste não movimenta folgas nem converte códigos e nada ficou preso
- **THEN** as colunas SHALL mostrar `0`

### Requirement: Cores de estado na tabela
As células de folgas e de Cód 47 SHALL ser azuis quando concluídas ou pendentes de movimentação e laranja quando a fração indicar pendência após o Ajuste (folgas presas ou dias de código 47 restantes). As células de irregularidade com valor maior que zero SHALL ser vermelhas, com intensidade crescente em relação ao maior valor da coluna. Valores zero SHALL aparecer sem destaque de cor e funcionários ainda não processados SHALL mostrar `-`.

#### Scenario: Fração concluída
- **WHEN** a coluna de folgas mostra `5/5`
- **THEN** a célula SHALL aparecer em azul

#### Scenario: Fração com folgas presas
- **WHEN** a coluna de folgas mostra `4/5`
- **THEN** a célula SHALL aparecer em laranja

#### Scenario: Irregularidade presente
- **WHEN** a coluna Interjornada de um funcionário tem valor maior que zero
- **THEN** a célula SHALL aparecer em vermelho

#### Scenario: Funcionário ainda não processado
- **WHEN** nenhuma execução leu a folha de um funcionário
- **THEN** as colunas de dados SHALL mostrar `-` sem cor de destaque

### Requirement: Irregularidades abertas por tipo
A tabela SHALL mostrar uma coluna para cada tipo de irregularidade: Sem Entrada/Saída, Interjornada, Marcações britânicas e % Folha não preenchida, em vez de uma soma única. A coluna de Folha não preenchida SHALL mostrar a porcentagem de dias visíveis sem marcação somente quando a folha estiver sinalizada como não preenchida e `-` quando não estiver, e SHALL mostrar `-` quando a folha não pôde ser avaliada. Os valores SHALL refletir a leitura mais recente da folha, seja da Análise ou do Ajuste.

#### Scenario: Colunas separadas
- **WHEN** um funcionário tem 4 ocorrências de Sem Entrada/Saída, 2 interjornadas e 3 dias de marcação britânica
- **THEN** a linha SHALL mostrar 4, 2 e 3 nas colunas respectivas, sem soma única

#### Scenario: Folha sinalizada como não preenchida
- **WHEN** a leitura sinalizou a folha como não preenchida com 73% dos dias visíveis sem marcação
- **THEN** a coluna % Folha não preenchida SHALL mostrar `73%` em vermelho

#### Scenario: Leitura mais recente prevalece
- **WHEN** o Ajuste lê uma folha depois da Análise e a contagem de uma irregularidade mudou
- **THEN** a coluna SHALL mostrar o valor da leitura mais recente

### Requirement: Relatório sempre disponível e atualizado ao vivo
O botão de relatório do painel SHALL estar habilitado a qualquer momento, inclusive antes de qualquer execução e durante uma execução, e SHALL abrir a janela do relatório. A janela SHALL refletir o modelo atual e SHALL se atualizar enquanto aberta, sem exigir reabertura nem a conclusão da execução, preservando a ordenação, o filtro e a linha selecionada. A janela SHALL indicar qual funcionário está sendo processado quando houver execução em andamento. Abrir a janela e atualizá-la SHALL ser somente leitura e SHALL NOT interromper nem alterar a execução.

#### Scenario: Abrir antes de qualquer execução
- **WHEN** o usuário clica em Relatório sem ter executado Análise ou Ajuste
- **THEN** a janela SHALL abrir com todos os funcionários e sem números

#### Scenario: Preenchimento durante a execução
- **WHEN** a janela está aberta e a Análise lê a folha de um funcionário
- **THEN** a linha desse funcionário SHALL ser preenchida sem reabrir a janela
- **AND** o funcionário em processamento SHALL ser indicado

#### Scenario: Preserva visão do usuário
- **WHEN** o modelo é atualizado enquanto a tabela está ordenada, filtrada e com uma linha selecionada
- **THEN** a ordenação, o filtro e a seleção SHALL permanecer

#### Scenario: Janela já aberta
- **WHEN** o usuário clica em Relatório com a janela já aberta
- **THEN** a mesma janela SHALL receber o foco e ser atualizada

### Requirement: Lista completa de funcionários desde a abertura
A tabela SHALL listar todos os funcionários do seletor da sessão atual desde que uma execução conheça a lista, na ordem alfabética sem acentos por padrão. Antes de processados, os funcionários SHALL aparecer atenuados com `-` nas colunas de dados. Funcionários cuja folha não tem marcações SHALL ser indicados como sem marcações. Funcionários cuja folha foi interrompida no meio do Ajuste SHALL ser indicados como parciais, com os valores confirmados até então. A lista SHALL vir somente do seletor da sessão e nunca de valores fixos.

#### Scenario: Lista cheia com números pendentes
- **WHEN** a Análise inicia com 40 funcionários no seletor
- **THEN** a tabela SHALL mostrar 40 linhas atenuadas
- **AND** cada linha SHALL ser preenchida quando a folha correspondente for lida

#### Scenario: Folha sem marcações
- **WHEN** a página de um funcionário informa que não há marcações
- **THEN** a linha SHALL indicar sem marcações e SHALL NOT contar como pendência

#### Scenario: Ajuste interrompido
- **WHEN** o Ajuste é interrompido durante a folha de um funcionário
- **THEN** a linha SHALL ser indicada como parcial e mostrar apenas os valores confirmados

### Requirement: Navegação, ordenação e cópia do relatório
Clicar em uma linha SHALL selecionar o funcionário correspondente no seletor da página, como já ocorre, exceto enquanto uma Análise ou um Ajuste estiver em andamento: nesse caso o clique SHALL NOT alterar o funcionário selecionado e a janela SHALL indicar que a navegação está indisponível durante a execução. Clicar no cabeçalho de uma coluna SHALL ordenar a tabela por ela, alternando o sentido em novo clique. As colunas de fração SHALL ordenar pelo que ainda está pendente. Uma ação de cópia SHALL gerar, a partir do modelo atual, um texto em colunas separadas por tabulação com nome, folgas, presas, Cód 47, as quatro irregularidades, HE 100%, HEF 100% e HEC 70%. Frações SHALL ser escritas de forma que a planilha as trate como texto e não como data.

#### Scenario: Selecionar funcionário pela linha
- **WHEN** o usuário clica na linha de um funcionário e nenhuma execução está em andamento
- **THEN** o seletor da página SHALL passar a esse funcionário

#### Scenario: Clique durante uma execução
- **WHEN** o usuário clica na linha de um funcionário enquanto a Análise ou o Ajuste está em andamento
- **THEN** o funcionário selecionado na página SHALL NOT mudar
- **AND** a janela SHALL indicar que a navegação só está disponível após a execução

#### Scenario: Ordenar por coluna
- **WHEN** o usuário clica no cabeçalho de uma coluna de irregularidade
- **THEN** as linhas SHALL ser ordenadas por essa coluna e um novo clique SHALL inverter o sentido

#### Scenario: Copiar o relatório
- **WHEN** o usuário aciona a cópia
- **THEN** o texto copiado SHALL conter uma linha por funcionário processado com todas as colunas
- **AND** frações como `4/5` SHALL ser escritas de modo que a planilha não as converta em data

### Requirement: Detalhe das ocorrências em dica de contexto
Ao passar o cursor sobre uma célula, a janela SHALL mostrar o detalhe do valor: nas células de irregularidade, as datas das ocorrências; na célula de folgas, a data e o motivo de cada folga presa; na célula de Cód 47, as datas dos dias convertidos e dos restantes quando conhecidas; na célula de Folha não preenchida, o critério atendido e a contagem de dias visíveis e preenchidos.

#### Scenario: Datas de uma irregularidade
- **WHEN** o cursor está sobre a célula de Marcações britânicas de um funcionário com 3 dias detectados
- **THEN** a dica SHALL listar as 3 datas

#### Scenario: Motivo de folga presa
- **WHEN** o cursor está sobre a célula de folgas de um funcionário com uma folga presa
- **THEN** a dica SHALL mostrar a data da folga presa e o motivo registrado

### Requirement: Modelo persistente durante a sessão
O modelo do relatório SHALL sobreviver ao recarregamento da página na mesma aba e SHALL ser descartado quando a aba for fechada. Uma falha de persistência SHALL NOT interromper a execução. Se a página for recarregada durante uma execução, os dados já registrados SHALL permanecer e a execução SHALL constar como interrompida.

#### Scenario: Página recarregada
- **WHEN** a página é recarregada depois de uma Análise e de um Ajuste
- **THEN** a janela do relatório, ao ser aberta, SHALL mostrar os dados anteriores

#### Scenario: Aba fechada
- **WHEN** a aba é fechada e uma nova é aberta
- **THEN** o relatório anterior SHALL NOT estar disponível

#### Scenario: Armazenamento indisponível
- **WHEN** a persistência falha
- **THEN** a execução SHALL continuar com o modelo em memória

### Requirement: Acesso ao log a partir do relatório
A janela do relatório SHALL ter um botão Log que abra a janela de log já existente com todos os eventos. A janela do relatório SHALL NOT incorporar um painel de log próprio.

#### Scenario: Abrir o log do relatório
- **WHEN** o usuário clica em Log na janela do relatório
- **THEN** a janela de log SHALL abrir com os eventos registrados até o momento

### Requirement: Cód 47 contado no mesmo escopo na Análise e no Ajuste
A Análise SHALL contar os dias com código 47 no mesmo escopo que o Ajuste converte: o mês alvo e a semana de transição do último dia do mês. A pré-análise do Ajuste SHALL NOT registrar divergência por diferença de escopo na contagem de Cód 47.

#### Scenario: Cód 47 na semana de transição
- **WHEN** um dia com código 47 está na semana que contém o último dia do mês alvo mas pertence ao mês seguinte
- **THEN** a Análise SHALL contá-lo, como o Ajuste o converte

#### Scenario: Pré-análise coerente com a Análise
- **WHEN** a folha não mudou entre a Análise e o início do Ajuste
- **THEN** a pré-análise SHALL NOT registrar divergência na contagem de Cód 47
