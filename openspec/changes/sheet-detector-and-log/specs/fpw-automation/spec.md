## ADDED Requirements

### Requirement: Pré-análise da folha antes do Ajuste
Antes de qualquer alteração em uma folha, o Ajuste SHALL ler a própria folha com a mesma detecção usada pela Análise, registrar esse estado inicial no log e usá-lo como referência da execução. Se o estado lido divergir de uma Análise anterior do mesmo funcionário, a divergência SHALL ser registrada no log e SHALL NOT interromper o Ajuste. A pré-análise SHALL ser somente leitura e SHALL NOT alterar as condições de parada, o fluxo de gravação nem a ordem das fases existentes.

#### Scenario: Ajuste sem Análise prévia
- **WHEN** o Ajuste inicia em uma folha que não foi analisada
- **THEN** o estado inicial SHALL ser lido e registrado antes da primeira alteração
- **AND** o Ajuste SHALL prosseguir normalmente

#### Scenario: Estado diverge da Análise anterior
- **WHEN** a pré-análise encontra contagens diferentes das da Análise anterior do mesmo funcionário
- **THEN** o log SHALL registrar as duas contagens e a divergência
- **AND** o Ajuste SHALL prosseguir usando o estado recém-lido

#### Scenario: Pré-análise respeita as condições de parada
- **WHEN** a página não está em um contexto suportado no início do Ajuste
- **THEN** o Ajuste SHALL interromper antes de qualquer ação, como já ocorre, sem que a pré-análise tente contornar a verificação

### Requirement: Contrato da página descreve linhas de dia e marcações
A documentação da estrutura da página SHALL descrever as linhas de dia da folha: o cabeçalho do dia, as linhas de marcação com campos de entrada e saída, o campo de irregularidade e o de justificativa, o significado dos sufixos de origem da marcação (relógio, mobile, web e manual) e a regra de obtenção de entrada e saída quando um dia tem mais de uma linha.

#### Scenario: Documentação de marcações
- **WHEN** um contribuidor consulta a estrutura da página
- **THEN** encontra o formato observado das marcações, o significado de `*`, `M` e `W` e a regra de entrada e saída por dia
- **AND** encontra a localização da marca de interjornada no cabeçalho do dia e o aviso de que o texto das linhas não é evidência de irregularidade
- **AND** a documentação indica que contagens de linhas e funcionários não devem ser usadas como seletor ou pressuposto

#### Scenario: Orientação para agentes sobre inspeção e detecção
- **WHEN** um agente consulta as regras operacionais
- **THEN** encontra a orientação de inspecionar a folha via MCP somente em leitura e sem reter dados de funcionários
- **AND** a proibição de detectar irregularidades pelo `innerText` das linhas de marcação
