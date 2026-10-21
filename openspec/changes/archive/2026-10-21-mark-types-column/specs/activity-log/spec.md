# Spec Delta

## MODIFIED Requirements

### Requirement: Registro de análise por funcionário
Para cada folha lida pela Análise o sistema SHALL registrar as contagens e as datas de Sem Entrada/Saída, Interjornada, Marcação britânica e Folha não preenchida (com a porcentagem e o critério), as folgas a movimentar, os dias com código 47, as horas extras e saldo de compensação e as contagens de marcações por origem (biometria, Web, Mobile e Manual).

#### Scenario: Funcionário sem irregularidades
- **WHEN** a Análise lê uma folha sem irregularidades
- **THEN** o log SHALL registrar essa folha como sem ocorrências, ainda com as contagens de folgas, código 47, horas e marcações por origem

#### Scenario: Marcações por origem no registro
- **WHEN** a Análise lê uma folha com 30 marcações manuais, 20 Web, 10 Mobile e 5 de biometria
- **THEN** o registro da folha SHALL conter essas quatro contagens
