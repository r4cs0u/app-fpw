# Proposal

## Why

A Etapa 3 do roadmap pede que as regras de negócio deixem de depender diretamente do DOM do WebPonto. Em `50-analisar.js`, quatro leituras da Análise ainda misturam a leitura da página com a regra que calcula o resultado: a contagem de folgas a movimentar, a seleção dos dias com código 47, a soma das horas extras e a leitura do saldo de compensação. Hoje os testes substituem essas funções por valores fixos, então a regra real não é exercitada por nenhum teste.

## What Changes

- Novo módulo `37-regras-folha.js` (`AF.regras`) com funções puras, sem DOM, frames, popups nem gravação:
  - contagem de folgas a movimentar a partir do mapa da folha e do mês alvo;
  - seleção dos dias com código 47 no escopo (mês alvo e, por padrão, a semana de transição) a partir de uma lista de campos já lidos;
  - soma de horas extras (código 2) e de horas extras de feriado (código 27) no mês alvo a partir de lançamentos já lidos;
  - interpretação do texto do saldo de compensação.
- As funções de `50-analisar.js` continuam existindo com os mesmos nomes, argumentos e resultados. Elas passam a só ler a página e delegar a regra a `AF.regras`.
- Testes de caracterização escritos antes da extração, rodando o código atual sobre dados sintéticos, e depois repetidos contra o código extraído para provar que o resultado não mudou.
- Registro do módulo em `99-main.user.js` antes de `40-fases.js` e `50-analisar.js`, com nova versão de teste; atualização do `SSD.md` e do `ROADMAP.md`.
- Fora do escopo: `processarFase4` e qualquer caminho que grave no WebPonto, o detector, o mapeamento da folha e o relatório. O filtro de escopo do 47 fica pronto para a Fase 4 reutilizar em uma mudança própria.

Nenhuma mudança de comportamento visível: mesmos números na tabela, mesmo log, mesmas condições de parada.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. É uma extração interna que preserva o comportamento; `skip_specs: true` está definido em `.openspec.yaml`.

## Impact

- **Código:** novo `37-regras-folha.js`; `50-analisar.js` passa a delegar; `99-main.user.js` lista o módulo e sobe a versão de teste (também em `00-core.js`).
- **Instalação:** como `99-main.user.js` muda, é preciso atualizar a instalação Tampermonkey de teste pelo procedimento do `AGENT.md`.
- **Testes:** novo teste das regras puras, testes de caracterização das funções de leitura e ajuste do teste de versão e de ordem de carregamento.
- **Documentação:** `SSD.md` (mapa de módulos) e `ROADMAP.md` (progresso da Etapa 3).
- Sem novas dependências.
