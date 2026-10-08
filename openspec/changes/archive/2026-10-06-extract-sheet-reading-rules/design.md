# Design

## Context

`50-analisar.js` implementa a Análise. O detector (`25-detector.js`) e o mapeamento (`20-mapa.js`) já entregam dados estruturados, mas quatro funções ainda leem a página e calculam no mesmo corpo:

- `contarFolgas` chama `AF.mapa.mapearFolhaAtual()` e `AF.utils.mesAlvoDaTabela()` e então conta folgas sobre o mapa;
- `coletarDiasCod47` percorre os campos de texto da página e filtra os de valor `47` pelo escopo de datas;
- `somarHorasExtras` percorre os selects de justificativa e os campos de horas, filtra por código e mês e soma;
- `lerSaldoHEC` lê o campo de saldo em outro frame e interpreta o texto.

Os testes atuais (`tests/analise.test.js`) substituem `contarFolgas`, `somarHorasExtras` e `lerSaldoHEC` por valores fixos e só exercitam `coletarDiasCod47` sobre um DOM simulado. Portanto a regra real de contagem de folgas, de soma de horas e de interpretação do saldo não tem cobertura.

O padrão a seguir é o de `35-planejamento.js`: um módulo puro, carregado antes de quem o usa e registrado em `99-main.user.js`. Ver `proposal.md` para a motivação e o escopo.

## Goals / Non-Goals

**Goals:**

- Isolar as quatro regras em funções que recebem dados já lidos e devolvem o resultado, testáveis sem DOM.
- Manter nomes, argumentos, resultados e tratamento de erro das funções públicas de `AF.analisar`.
- Provar a equivalência com testes de caracterização escritos antes da extração.

**Non-Goals:**

- Alterar `processarFase4` ou qualquer caminho que grave no WebPonto.
- Mudar o formato do mapa da folha, do detector ou do relatório.
- Corrigir ou alterar regras durante a extração, incluindo qualquer peculiaridade encontrada na leitura atual. Se uma peculiaridade parecer um defeito, ela é registrada para uma mudança própria.

## Decisions

**1. Módulo próprio `37-regras-folha.js`, namespace `AF.regras`.** Separa as regras de leitura da folha do planejamento de ajustes (`35`) e do mapeamento (`20`). Carrega depois de `35-planejamento.js` e antes de `20-mapa.js`, `40-fases.js` e `50-analisar.js`; usa apenas `AF.utils` (`parseDataBR`, `ehMesAlvo`, `semanaIdBR`).
Alternativa descartada: colocar as funções em `10-utils.js` ou `35-planejamento.js`. Misturaria responsabilidades diferentes, e o usuário pediu responsabilidades separadas.

**2. Entradas são dados simples, não elementos.** As funções puras recebem:
- `contarFolgasAMovimentar(mapa, alvo)`: o mapa estruturado e a data do primeiro dia do mês alvo;
- `selecionarDiasCod47(campos, alvo, opcoes)`: lista de `{ dataStr, valor }` na ordem da página e a opção `somenteMesAlvo`; devolve as `dataStr` no escopo, na mesma ordem;
- `somarHorasExtras(lancamentos, alvo)`: lista de `{ codigo, temData, dataStr, horasTexto }`; devolve `{ HE, HEF, HEmin, HEFmin }`;
- `interpretarSaldoHEC(texto)`: texto do campo; devolve `HH:MM` com sinal opcional ou `00:00`.

`temData` distingue "o lançamento não tem campo de data" (conta sem filtro por mês, como hoje) de "tem campo e a data foi lida" (só conta se for do mês alvo).
Alternativa descartada: passar o documento e deixar a função consultar. Manteria a dependência de DOM que a mudança quer remover.

**3. As funções de `AF.analisar` viram leitores finos.** Cada uma lê a página, monta a entrada e chama `AF.regras`, preservando o `try/catch` e os valores de fallback atuais (`00:00` e zeros). A leitura continua somente leitura.

**4. Caracterização antes da extração.** Primeiro escrever testes que rodam o código atual sobre DOM e mapas sintéticos, cobrindo casos-limite (semana sem ausência, folga fora do mês, folgas ocultas e fora do mês, 47 na semana de transição, horas com asterisco e segundos, saldo negativo, texto inválido, lançamento sem campo de data). Depois da extração, os mesmos testes devem passar sem alteração, mais os testes diretos de `AF.regras`.
Alternativa descartada: só testar as funções novas. Não provaria que o comportamento antigo foi preservado.

**5. Fase 4 fora, com o ponto de reuso preparado.** `selecionarDiasCod47` expõe o mesmo critério de escopo que a Fase 4 repete no seu laço. Uma mudança futura poderá fazer a Fase 4 reutilizá-lo; nesta, nenhuma linha de gravação é tocada.

**6. Versão e instalação.** `99-main.user.js` muda (lista de módulos), então a versão de teste sobe de `9.10-test` para `9.11-test` em `99-main.user.js` e `00-core.js`, e a instalação Tampermonkey de teste precisa ser atualizada pelo procedimento do `AGENT.md`, com a confirmação do usuário.

## Risks / Trade-offs

- **[Diferença sutil entre o filtro antigo e o novo]** → Os testes de caracterização rodam contra o código atual antes da extração e depois contra o novo, com os mesmos dados.
- **[Ordem de carregamento]** → O teste de ordem dos módulos passa a exigir `37` depois de `10-utils.js` e antes de `40-fases.js` e `50-analisar.js`; o teste que carrega todos os módulos na ordem listada detecta uso antecipado.
- **[Instalação Tampermonkey desatualizada]** → Sem atualizar o script de entrada, o módulo novo não é carregado e `50-analisar.js` falharia. Mitigação: a validação em runtime só ocorre depois da confirmação do usuário de que atualizou a instalação.
- **[Peculiaridades preservadas]** → Manter o comportamento atual pode manter comportamentos questionáveis. É intencional: registrar e tratar em mudança própria.

## Migration Plan

Publicar na branch `test`, atualizar a instalação experimental conforme o `AGENT.md`, aguardar a confirmação do usuário e recarregar o MyWay. Validação em runtime somente leitura: versão de teste, módulo `37-regras-folha.js` carregado e painel inicializado, sem Analisar, Ajustar, gravar nem aprovar. Reversão: reverter o commit; os módulos remotos voltam à versão anterior.
