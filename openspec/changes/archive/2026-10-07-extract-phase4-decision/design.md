## Context

Hoje há dois caminhos que aplicam o mesmo critério de escopo do código 47:

- Análise: `AF.analisar.coletarDiasCod47` monta descritores `{ value, dataStr }` para todos os `input[type=text]` (com `dataStr` só quando o valor é `47`) e chama `AF.regras.selecionarDiasCod47(campos, alvo, opcoes)`, que devolve as datas em escopo na ordem do DOM.
- Ajuste: `AF.fases.processarFase4` percorre os mesmos campos, repete o filtro (`value === '47'`, data válida, mês alvo ou semana do último dia do mês), e, no mesmo laço, localiza a linha (`closest('tr')`), o select `lstNome<N>` e a opção `48`, dispara os eventos e registra o log. Se não achar a linha, o select ou a opção 48, registra um aviso e pula o campo.

A Fase 4 também chama `exigirEstrutura` no início e interrompe o laço se a execução deixar de estar ativa. A decisão de escopo é pura; o restante é DOM. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Uma única função pura decide o conjunto de campos 47 em escopo, usada pela Análise e pela Fase 4.
- Caracterizar o comportamento atual antes de mexer, para provar que a extração não o altera.
- Preparar o reaproveitamento pela pré-análise do modo Supervisionado.

**Non-Goals:**
- Não alterar eventos de DOM, `gravar`, esperas, popups nem o texto de log.
- Não mudar `exigirEstrutura` nem a interrupção por execução inativa.
- Não tocar em leitura/navegação da lista de funcionários nem no laço de `analisarTodas`.

## Decisions

**1. A função pura recebe descritores `{ value, name, dataStr }` e devolve `[{ indice, num, dataStr }]`.**
`indice` aponta para o descritor original, para o adaptador de DOM recuperar o `input`; `num` vem do nome do campo (dígitos), como hoje. Alternativa: devolver os próprios elementos; traria DOM para a regra.

**2. `selecionarDiasCod47` passa a ser `selecionarCamposCod47(...).map(c => c.dataStr)`.**
Garante equivalência por construção entre a contagem da Análise e os campos da Fase 4. A opção `somenteMesAlvo` continua sendo respeitada pela mesma função.

**3. O adaptador da Fase 4 monta os descritores exatamente como a Análise.**
Os mesmos `input[type=text]`, com `dataStr` calculado por `AF.mapa.obterDataDoInput(inp)` somente para valor `47`. Assim, o mesmo DOM produz o mesmo conjunto nos dois caminhos. Um helper compartilhado `lerCamposTexto()` evita duas montagens divergentes; se atrapalhar os testes existentes da Análise, a montagem fica duplicada com um teste de equivalência.

**4. Caracterizar primeiro, extrair depois.**
Primeiro um teste com documento simulado que roda a Fase 4 atual e fixa: quais campos mudam para 48, a ordem, os avisos para linha/select/opção ausentes, o retorno de `nsMarcados`, o evento `cod47` do log e a interrupção por execução inativa. O teste passa antes e depois da extração.

**5. A extração não muda a ordem nem o momento dos eventos.**
A função pura roda antes do laço de DOM; o laço continua verificando `execucao.isActive()` a cada campo, como hoje.

## Risks / Trade-offs

- [Divergência sutil entre o filtro antigo da Fase 4 e a função pura] → testes de caracterização, incluindo campos sem data, datas fora do escopo, semana de transição e valores com espaços.
- [Pré-calcular a lista antes do laço muda quando a data é lida em relação aos eventos disparados] → os eventos da Fase 4 não alteram o campo de data de outras linhas; a leitura prévia é equivalente e coberta no teste de caracterização.
- [Duplicação temporária se o helper compartilhado não encaixar na Análise] → aceitável com o teste de equivalência.
- [Fase 4 faz gravação indireta] → a validação de runtime é somente de observação (sem Ajustar), e qualquer divergência observada vira nova change.
