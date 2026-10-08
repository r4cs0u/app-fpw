# Spec Delta

## Purpose
Define o resumo prévio de um Ajuste para a folha atual: o que ele contém, de onde vêm os valores e a garantia de que produzi-lo apenas lê a folha.

## ADDED Requirements

### Requirement: Pré-análise somente leitura da folha atual
O sistema SHALL poder produzir, para a folha do funcionário atualmente selecionado, um resumo prévio do Ajuste lendo apenas a página já carregada. Produzir o resumo SHALL NOT gravar dados, SHALL NOT abrir popups, SHALL NOT alterar campos, SHALL NOT mudar o funcionário selecionado nem navegar entre páginas, e SHALL NOT iniciar uma execução de Análise ou de Ajuste. Os valores do resumo SHALL coincidir com os que a Análise produz para a mesma folha no mesmo estado.

#### Scenario: Leitura sem efeitos
- **WHEN** o resumo é produzido para a folha atual
- **THEN** nenhum campo, popup, seleção de funcionário ou gravação SHALL ser alterado ou acionado

#### Scenario: Coerência com a Análise
- **WHEN** a Análise e o resumo são produzidos sobre a mesma folha sem alteração entre eles
- **THEN** as quantidades de folgas a movimentar, de códigos 47, de irregularidades e as horas do resumo SHALL ser iguais às da Análise

### Requirement: Intervalo analisado
O resumo SHALL informar o intervalo analisado, que vai do primeiro dia do mês alvo até o último dia da semana, de segunda a domingo, que contém o último dia desse mês, e o número de dias do intervalo, com as datas em `dd/mm/aaaa`.

#### Scenario: Mês que termina no meio da semana
- **WHEN** o mês alvo é setembro de 2026, cujo último dia é uma quarta-feira
- **THEN** o intervalo SHALL ser `01/09/2026 até 04/10/2026 (34 dias)`

#### Scenario: Mês que termina em domingo
- **WHEN** o último dia do mês alvo é um domingo
- **THEN** o intervalo SHALL terminar nesse domingo

### Requirement: Folgas a movimentar com dias
O resumo SHALL informar a quantidade de folgas a movimentar da folha atual e os dias dessas folgas em `dd/mm/aaaa`, em ordem cronológica e sem repetição. A quantidade SHALL ser a mesma que a Análise conta. Quando não houver folgas a movimentar, o resumo SHALL informar quantidade zero e nenhum dia.

#### Scenario: Folgas a movimentar
- **WHEN** a folha tem 3 folgas a movimentar nos dias 25/09/2026, 02/09/2026 e 07/09/2026
- **THEN** o resumo SHALL informar quantidade 3 e os dias `02/09/2026, 07/09/2026, 25/09/2026`

#### Scenario: Sem folgas a movimentar
- **WHEN** nenhuma folga precisa ser movimentada
- **THEN** o resumo SHALL informar quantidade 0 e nenhum dia

### Requirement: Códigos 47 a ajustar com dias
O resumo SHALL informar a quantidade de dias com código 47 que o Ajuste converteria para 48 e os dias, em `dd/mm/aaaa`, em ordem cronológica e sem repetição. O conjunto SHALL ser o mesmo que a Fase 4 do Ajuste converte e que a Análise conta, ou seja, o mês alvo e a semana de transição do último dia do mês.

#### Scenario: Códigos 47 no escopo
- **WHEN** a folha tem código 47 em dois dias do mês alvo e em um dia da semana de transição do mês seguinte
- **THEN** o resumo SHALL informar quantidade 3 e listar os três dias

#### Scenario: Código 47 fora do escopo
- **WHEN** há código 47 em um dia de outro mês fora da semana de transição
- **THEN** esse dia SHALL NOT constar no resumo

### Requirement: Resumo de irregularidades
O resumo SHALL informar a quantidade de ocorrências de Sem Entrada/Saída, de Interjornada e de Marcações britânicas e, para Folha não preenchida, a porcentagem de dias visíveis sem marcação quando a folha estiver sinalizada, ou a indicação de que não está sinalizada quando não estiver.

#### Scenario: Irregularidades presentes
- **WHEN** a folha tem 2 ocorrências de Sem Entrada/Saída, 1 de Interjornada, 3 de Marcações britânicas e Folha não preenchida sinalizada com 73%
- **THEN** o resumo SHALL informar 2, 1, 3 e 73%

#### Scenario: Folha não sinalizada
- **WHEN** a folha não está sinalizada como não preenchida
- **THEN** o resumo SHALL indicar que Folha não preenchida não está sinalizada, sem porcentagem

### Requirement: Resumo de horas
O resumo SHALL informar as horas de 100% (acima das 10h), de 100% (feriado) e o saldo de 70% (compensável), no formato `HH:MM`, com sinal negativo quando o saldo for negativo.

#### Scenario: Horas com saldo negativo
- **WHEN** a folha tem 07:19 acima das 10h, 00:00 em feriado e saldo compensável de -08:13
- **THEN** o resumo SHALL informar `07:19`, `00:00` e `-08:13` nos campos correspondentes

### Requirement: Aviso de valores provisórios
O resumo SHALL terminar com o aviso de que, após os ajustes, os valores acima podem mudar.

#### Scenario: Aviso presente
- **WHEN** o resumo é apresentado como texto
- **THEN** a última linha SHALL ser `*Após os ajustes, todos os valores acima podem mudar.`

### Requirement: Folha sem marcações na pré-análise
Quando a folha atual não tem marcações, o resumo SHALL identificar o funcionário, SHALL informar que a folha não tem marcações e que não há o que ajustar, e SHALL NOT listar folgas, códigos 47, irregularidades nem horas.

#### Scenario: Folha vazia
- **WHEN** a página informa que não há marcações
- **THEN** o resumo SHALL conter o nome e a informação de que não há o que ajustar
- **AND** nenhuma seção de folgas, códigos 47, irregularidades ou horas SHALL aparecer

### Requirement: Texto do resumo
O resumo em texto SHALL ter as linhas e seções, nesta ordem: `Nome: <nome sem o sufixo numérico do seletor FPW>`, `Range da análise: <intervalo>`, a seção `Ajustes previstos na folha atual` com as linhas de folgas a movimentar e de códigos 47, a seção `Resumo das irregularidades`, a seção `Resumo de horas` e o aviso final.

#### Scenario: Texto completo
- **WHEN** o resumo de uma folha com folgas, códigos 47, irregularidades e horas é formatado em texto
- **THEN** o texto SHALL conter as seções na ordem definida, com `Folgas a movimentar: <quantidade> (dias: <dias>)` e `Códigos 47 a ajustar: <quantidade> (dias: <dias>)` na seção de ajustes previstos

#### Scenario: Sufixo numérico do seletor
- **WHEN** o seletor FPW fornece o nome `MARIA 2 SILVA 4812`
- **THEN** a linha SHALL ser `Nome: MARIA 2 SILVA`
