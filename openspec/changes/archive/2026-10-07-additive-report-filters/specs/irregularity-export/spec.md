# Spec Delta

## MODIFIED Requirements

### Requirement: Exportação do time pelo que está visível na tabela
O fim da tabela SHALL ter o botão "Exportar irregularidades", que abre uma janela com o texto dos funcionários visíveis na tabela naquele momento, respeitando os filtros por indicador ativos, a busca por nome e o extremo mín/máx ativos e a ordem em que a tabela está exibida. O texto SHALL começar com um título que contém o mês do relatório e, quando houver filtros por indicador ativos, a indicação de todos eles, separados por ` + `, e, quando houver busca por nome, a indicação da busca. Cada funcionário SHALL ser separado do seguinte por uma linha em branco, e cada um SHALL aparecer com todas as suas irregularidades, não apenas a do filtro. Funcionários visíveis que não geram texto SHALL ser omitidos. Sem filtro, o texto SHALL cobrir todos os funcionários com irregularidades.

#### Scenario: Exportar o time inteiro
- **WHEN** nenhum filtro está ativo e o usuário aciona Exportar irregularidades
- **THEN** a janela SHALL mostrar o título com o mês e o texto de cada funcionário com irregularidades, na ordem da tabela, separados por linha em branco

#### Scenario: Exportar apenas quem tem marcação britânica
- **WHEN** o filtro de Marc. Britânicas está ativo e o usuário aciona Exportar irregularidades
- **THEN** o texto SHALL conter somente os funcionários que a tabela exibe com marcação britânica
- **AND** o título SHALL indicar o filtro de Marc. Britânicas

#### Scenario: Exportar com vários filtros
- **WHEN** os filtros de Sem Entrada/Saída e de Interjornada estão ativos e o usuário aciona Exportar irregularidades
- **THEN** o texto SHALL conter os funcionários que a tabela exibe, com Sem Entrada/Saída ou interjornada
- **AND** o título SHALL indicar os dois filtros separados por ` + `

#### Scenario: Exportar com busca por nome
- **WHEN** há uma busca por nome ativa e o usuário aciona Exportar irregularidades
- **THEN** o texto SHALL conter somente os funcionários visíveis que casam com a busca
- **AND** o título SHALL indicar a busca

#### Scenario: Extremo ativo
- **WHEN** um extremo mín/máx ativo reduz a tabela a alguns funcionários
- **THEN** o texto SHALL conter somente esses funcionários que geram texto

#### Scenario: Nenhuma irregularidade visível
- **WHEN** nenhum funcionário visível gera texto
- **THEN** a janela SHALL informar que não há irregularidades para exportar, sem lista de funcionários
