# Spec Delta

## REMOVED Requirements

### Requirement: Indicadores agrupados em três linhas temáticas
**Reason**: O resumo ganha o grupo Marcações e passa a ter quatro linhas; o requisito é substituído por "Indicadores agrupados em quatro linhas temáticas".
**Migration**: Usar o requisito "Indicadores agrupados em quatro linhas temáticas", que mantém os grupos Folgas, Irregularidades e Hora Extra com o mesmo conteúdo e acrescenta Marcações entre Irregularidades e Hora Extra.

## ADDED Requirements

### Requirement: Indicadores agrupados em quatro linhas temáticas
O resumo SHALL ser apresentado em quatro grupos, cada um em uma linha própria e identificado por título e cor: **Folgas** (tons de verde) na primeira linha, **Irregularidades** (tons de vermelho) na segunda, **Marcações** (tons de roxo) na terceira e **Hora Extra** (tons de azul) na quarta. Cada grupo SHALL conter caixas menores com os seus indicadores. O grupo Folgas SHALL conter **Movim.** e **Presas**. O grupo Irregularidades SHALL conter **Sem Entrada/Saída**, **Interjornada**, **Marc. Britânicas** e **Folhas não Preenchidas**. O grupo Marcações SHALL conter **Manuais**, **Web**, **Mobile** e **Biometria**. O grupo Hora Extra SHALL conter **100% (Acima das 10h)**, **100% (Feriado)** e **70% (Compensáveis)**, correspondentes a HE 100%, HEF 100% e HEC 70%.

#### Scenario: Quatro linhas na ordem esperada
- **WHEN** a janela do relatório é aberta
- **THEN** a primeira linha de indicadores SHALL ser Folgas, a segunda Irregularidades, a terceira Marcações e a quarta Hora Extra
- **AND** cada linha SHALL usar a cor do seu tema

#### Scenario: Conteúdo de cada grupo
- **WHEN** o resumo é exibido
- **THEN** Folgas SHALL ter Movim. e Presas, Irregularidades SHALL ter os quatro tipos, Marcações SHALL ter Manuais, Web, Mobile e Biometria e Hora Extra SHALL ter as três caixas com os rótulos definidos

### Requirement: Indicadores de marcações por origem
O resumo SHALL mostrar, para cada origem de marcação (Manuais, Web, Mobile e Biometria), o total de marcações do time, calculado com a leitura mais recente de cada funcionário e somando somente funcionários com folha lida e contagem por origem disponível. A caixa Manuais SHALL mostrar também o número de funcionários com pelo menos uma marcação manual e SHALL usar o vermelho para o seu valor. Funcionários não processados, de folha sem marcações ou com dados anteriores à contagem por origem SHALL NOT somar nos totais.

#### Scenario: Totais por origem
- **WHEN** três funcionários têm, respectivamente, 30, 2 e 0 marcações manuais
- **THEN** a caixa Manuais SHALL mostrar o total 32 em 2 funcionários

#### Scenario: Total de Web, Mobile e Biometria
- **WHEN** dois funcionários têm 20 e 5 marcações Web, 10 e 0 Mobile e 5 e 40 de biometria
- **THEN** as caixas SHALL mostrar 25 de Web, 10 de Mobile e 45 de Biometria

#### Scenario: Resumo atualizado durante a execução
- **WHEN** a janela está aberta e a Análise lê a folha de um funcionário com 4 marcações manuais
- **THEN** a caixa Manuais SHALL refletir essas 4 marcações sem reabrir a janela

### Requirement: Filtro da tabela pelo indicador Manuais
Clicar na caixa Manuais SHALL ligar ou desligar o filtro de marcações manuais, com o mesmo comportamento dos demais indicadores filtráveis: o indicador ativo SHALL ser destacado, os indicadores ativos SHALL se somar por união, a combinação com a busca por nome SHALL ser por interseção, os filtros SHALL permanecer quando a tabela for atualizada e os valores do resumo SHALL continuar refletindo o time inteiro. A tabela SHALL mostrar os funcionários processados, de folha com marcações e com contagem por origem disponível que tenham pelo menos uma marcação manual. As caixas Web, Mobile e Biometria SHALL NOT filtrar a tabela.

#### Scenario: Filtrar por manuais
- **WHEN** o usuário clica no indicador Manuais
- **THEN** a tabela SHALL mostrar somente os funcionários com marcação manual maior que zero
- **AND** o indicador SHALL aparecer destacado

#### Scenario: Combinar com outro indicador
- **WHEN** o indicador de Interjornada está ativo e o usuário clica em Manuais
- **THEN** a tabela SHALL mostrar os funcionários com interjornada e também os com marcação manual, cada um uma única vez

#### Scenario: Limpar o filtro
- **WHEN** o único indicador ativo é Manuais e o usuário clica nele novamente
- **THEN** a tabela SHALL voltar a mostrar todos os funcionários

#### Scenario: Ordenar o resultado do filtro
- **WHEN** o filtro Manuais está ativo e o usuário ordena pela coluna Marcações
- **THEN** a tabela SHALL mostrar os funcionários filtrados em ordem decrescente de marcações manuais

#### Scenario: Caixas informativas
- **WHEN** o usuário clica nas caixas Web, Mobile ou Biometria
- **THEN** a tabela SHALL NOT ser filtrada
