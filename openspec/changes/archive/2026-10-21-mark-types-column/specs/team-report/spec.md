# Spec Delta

## MODIFIED Requirements

### Requirement: Navegação, ordenação e cópia do relatório
Clicar em uma linha SHALL selecionar o funcionário correspondente no seletor da página, como já ocorre, exceto enquanto uma Análise ou um Ajuste estiver em andamento: nesse caso o clique SHALL NOT alterar o funcionário selecionado e a janela SHALL indicar que a navegação está indisponível durante a execução. Clicar no cabeçalho de uma coluna SHALL ordenar a tabela por ela, alternando o sentido em novo clique. As colunas de fração SHALL ordenar pelo que ainda está pendente e a coluna Marcações SHALL ordenar pela quantidade de marcações manuais. Uma ação de cópia SHALL gerar, a partir do modelo atual, um texto em colunas separadas por tabulação com nome, folgas, presas, Cód 47, as quatro irregularidades, as contagens de marcações manuais, Web, Mobile e biometria, HE 100%, HEF 100% e HEC 70%. Frações SHALL ser escritas de forma que a planilha as trate como texto e não como data.

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

#### Scenario: Ordenar por marcações
- **WHEN** o usuário clica no cabeçalho da coluna Marcações
- **THEN** as linhas SHALL ser ordenadas pela quantidade de marcações manuais, das maiores para as menores, e um novo clique SHALL inverter o sentido

#### Scenario: Copiar o relatório
- **WHEN** o usuário aciona a cópia
- **THEN** o texto copiado SHALL conter uma linha por funcionário processado com todas as colunas, inclusive as quatro contagens de marcações por origem
- **AND** frações como `4/5` SHALL ser escritas de modo que a planilha não as converta em data

## ADDED Requirements

### Requirement: Coluna de marcações por origem
A tabela do relatório SHALL ter a coluna **Marcações**, posicionada entre `% Não Preench.` e `HE 100%`, que mostra para cada funcionário a quantidade de marcações por origem no mês alvo, no formato compacto `<n>* · <n>W · <n>M · <n>B`: manuais (`*`) primeiro, depois Web (`W`), Mobile (`M`) e biometria (`B`). Tipos com quantidade zero SHALL ser omitidos. A quantidade de manuais SHALL ser destacada em vermelho sempre que for maior que zero. Ao passar o cursor, a dica SHALL listar os quatro tipos por extenso (Manual, Web, Mobile e Biometria), o total de marcações e o percentual de manuais sobre o total, arredondado para inteiro. A marcação manual SHALL NOT ser tratada como irregularidade: ela SHALL NOT alterar os totais de irregularidades, o texto de irregularidades do funcionário nem a disponibilidade da ação de cópia de irregularidades.

#### Scenario: Formato compacto
- **WHEN** a leitura de um funcionário tem 30 manuais, 20 Web, 10 Mobile e 5 de biometria
- **THEN** a célula SHALL mostrar `30* · 20W · 10M · 5B`, com `30*` em vermelho
- **AND** a dica SHALL mostrar Manual 30, Web 20, Mobile 10, Biometria 5, total 65 e 46% de manuais

#### Scenario: Tipos zerados omitidos
- **WHEN** um funcionário tem 0 manuais, 0 Web, 0 Mobile e 40 de biometria
- **THEN** a célula SHALL mostrar `40B` sem destaque vermelho

#### Scenario: Folha sem marcações
- **WHEN** a folha do funcionário não tem marcações
- **THEN** a linha SHALL continuar mostrando "Sem Marcações na Folha" e a coluna SHALL NOT mostrar contagens

#### Scenario: Dados anteriores à coluna
- **WHEN** o modelo restaurado da sessão tem funcionários lidos antes da existência da contagem por origem
- **THEN** a célula Marcações desses funcionários SHALL mostrar `-`
- **AND** esses funcionários SHALL NOT somar nos indicadores de marcações e SHALL NOT aparecer no filtro de Manuais
- **AND** uma nova Análise ou Ajuste SHALL substituir o `-` pelas contagens

#### Scenario: Atualização por nova leitura
- **WHEN** a Análise é executada novamente para um funcionário já lido
- **THEN** a célula Marcações SHALL refletir a nova leitura

#### Scenario: Manual não é irregularidade
- **WHEN** um funcionário tem marcações manuais e nenhuma irregularidade
- **THEN** os indicadores de irregularidades SHALL NOT contá-lo
- **AND** o texto de irregularidades dele SHALL NOT ser gerado por causa das marcações manuais
