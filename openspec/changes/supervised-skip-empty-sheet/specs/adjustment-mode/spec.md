# Spec Delta

## MODIFIED Requirements

### Requirement: Folha sem marcações no modo Supervisionado
Se a folha atual não tiver marcações, a janela SHALL apresentar o resumo informando que não há o que ajustar, SHALL NOT oferecer a aplicação e SHALL oferecer a opção de avançar para a próxima folha, além do fechamento. Avançar SHALL NOT executar nenhuma alteração na folha vazia e SHALL registrar no log que a folha foi pulada por não ter marcações.

#### Scenario: Folha vazia
- **WHEN** o modo Supervisionado está ativo e a folha atual não tem marcações
- **THEN** a janela SHALL informar que não há o que ajustar
- **AND** a opção de aplicar SHALL NOT estar disponível
- **AND** a opção de avançar para a próxima folha SHALL estar disponível

#### Scenario: Avançar a partir de folha vazia
- **WHEN** o usuário aciona a opção de avançar em uma folha sem marcações
- **THEN** o sistema SHALL selecionar o próximo funcionário da lista sem alterar a folha vazia
- **AND** a janela SHALL mostrar a pré-análise da nova folha

#### Scenario: Próxima folha também vazia
- **WHEN** a folha seguinte também não tem marcações
- **THEN** a janela SHALL manter a aplicação indisponível e a opção de avançar disponível

#### Scenario: Fim da lista
- **WHEN** o usuário avança a partir de uma folha vazia e não há próximo funcionário
- **THEN** a janela SHALL informar o fim da lista e SHALL NOT oferecer mais avanço
