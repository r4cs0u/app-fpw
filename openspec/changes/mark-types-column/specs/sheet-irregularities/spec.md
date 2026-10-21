# Spec Delta

## ADDED Requirements

### Requirement: Contagem de marcações por origem
O sistema SHALL contar, para cada folha, quantas marcações são de cada origem: biometria (relógio de ponto, sem caractere), Web (`W`), Mobile (`M`) e Manual (`*`). A contagem SHALL considerar somente os dias do mês alvo e, em cada dia, somente a entrada e a saída obtidas pela leitura estruturada de entrada e saída: a primeira entrada e a última saída. Cada dia SHALL contribuir com no máximo duas marcações, uma de entrada e uma de saída; um dia sem saída preenchida SHALL contribuir apenas com a entrada, e um dia sem marcações SHALL NOT contribuir. As marcações intermediárias do dia SHALL NOT ser contadas. A origem de cada marcação SHALL seguir a identificação já definida (ausência de caractere indica relógio de ponto, `M` mobile, `W` web e `*` manual). O resultado SHALL ser o mesmo na Análise e no Ajuste para a mesma folha, e a contagem SHALL ser somente leitura.

#### Scenario: Soma de entradas e saídas do mês
- **WHEN** a folha tem três dias do mês alvo: `08:00 ` / `17:00 `, `08:05W` / `17:02M` e `08:10*` / `17:10*`
- **THEN** a contagem SHALL ser 2 de biometria, 1 de Web, 1 de Mobile e 2 manuais

#### Scenario: Marcações intermediárias não entram
- **WHEN** um dia tem as linhas `08:06*` / `10:45*`, `10:45*` / `14:21*` e `14:21*` / `17:00 `
- **THEN** a entrada `08:06` SHALL ser contada como manual e a saída `17:00` como biometria
- **AND** as demais marcações manuais do dia SHALL NOT ser contadas

#### Scenario: Dia sem saída
- **WHEN** um dia tem somente a entrada `08:00W` e nenhuma saída preenchida
- **THEN** a contagem SHALL somar apenas 1 marcação Web desse dia

#### Scenario: Dia fora do mês alvo e dia sem marcações
- **WHEN** a folha exibe dias da semana de transição do mês seguinte e dias sem nenhuma marcação
- **THEN** esses dias SHALL NOT contribuir para nenhuma contagem

#### Scenario: Mesma folha em Análise e Ajuste
- **WHEN** a mesma folha é lida pela Análise e pelo Ajuste sem alterações entre as leituras
- **THEN** as contagens por origem SHALL ser idênticas

#### Scenario: Folha sem campos de marcação
- **WHEN** a página não expõe os campos de marcação
- **THEN** a contagem por origem SHALL ser indicada como não avaliada, e não como zero
