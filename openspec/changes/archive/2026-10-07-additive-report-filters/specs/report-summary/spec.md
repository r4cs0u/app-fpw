# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
