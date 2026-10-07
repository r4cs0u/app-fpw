## Context

A Análise já lê tudo o que o resumo precisa: `AF.analisar.analisarFolhaAtual()` devolve folgas (contagem), `cod47Dias`, contagens e dias de irregularidades, `naoPreenchida`, `HE`, `HEF` e `HEC`, e devolve `vazia: true` para folha sem marcações. O que falta é: (a) os dias de cada folga a movimentar, pois `AF.regras.contarFolgasAMovimentar(mapa, alvo)` em `37-regras-folha.js` só devolve a soma; (b) o intervalo analisado; (c) a montagem e o texto do resumo. O mês alvo vem de `AF.utils.mesAlvoDaTabela()` e a semana de transição de `AF.utils.semanaIdBR`/`inicioSemanaBR` (semana começa na segunda). O módulo de regras de folha é puro e os módulos novos de lógica seguem o mesmo padrão (`27`, `35`, `37`).

A change `extract-phase4-decision` (anterior na fila) extrai a decisão de quais campos 47 viram 48 para uma função pura; este resumo a reutiliza.

Ver proposal.md e a spec `adjustment-preanalysis`.

## Goals / Non-Goals

**Goals:**
- Resumo confiável, somente leitura e igual ao que a Análise produz.
- Montagem e texto puros, testados sem DOM.
- Listar os dias de folga sem mudar a contagem existente.

**Non-Goals:**
- Não prever o plano completo de movimentação (origem e destino de cada folga): o planejamento das Fases 1 a 3 é por rodada e refeito após cada popup, então não é determinável sem executar.
- Não implementar janela, confirmação nem seletor de modo (ficam em `adjustment-mode-selector`).
- Não alterar a Análise, o Ajuste ou o relatório.

## Decisions

**1. `AF.regras.listarFolgasAMovimentar(mapa, alvo)` devolve a lista de dias, e `contarFolgasAMovimentar` passa a ser o tamanho dessa lista.**
O laço atual incrementa o total uma vez por folga elegível; cada incremento passa a empilhar a data da folga. A mesma regra, sem tocar nos números. Os testes de caracterização existentes de `contarFolgasAMovimentar` garantem a equivalência. Alternativa: uma função paralela só para listar; duplicaria a regra de elegibilidade.

**2. Novo módulo puro `38-preanalise.js` com `intervalo(alvo)`, `montar(leitura, alvo)` e `texto(resumo)`; a leitura da página é um adaptador fino.**
`montar` recebe o resultado de leitura (nome, folgas com dias, `cod47Dias`, contagens de irregularidades, `naoPreenchida`, horas e `vazia`) e devolve o objeto do resumo. `lerFolhaAtual()` usa `AF.analisar.*`, `AF.regras.listarFolgasAMovimentar` e `AF.mapa.mapearFolhaAtual()` e só lê. Alternativa: pôr tudo em `50-analisar.js`; mistura leitura e apresentação e engorda um módulo que já tem o laço de Análise.

**3. Códigos 47 com a mesma decisão da Fase 4.**
Usa a função extraída em `extract-phase4-decision` (e, por construção, a mesma que a Análise usa). Se a ordem de aplicação mudar, `coletarDiasCod47` já tem o mesmo critério e serve como ponte.

**4. Intervalo: do dia 1 do mês alvo ao domingo da semana do último dia do mês.**
`fim = inicioSemanaBR(último dia) + 6 dias`; `dias = (fim - início)/1 dia + 1`. Cobre o exemplo de 01/09 a 04/10 (34 dias). As datas aparecem em `dd/mm/aaaa`, como no detalhe por linha.

**5. Interpretação de "Códigos 47 a ajustar (códigos aparentes + quantidade de folgas a movimentar)".**
O pedido original cita os códigos aparentes e a quantidade de folgas a movimentar na mesma linha. Interpretado como: a seção de ajustes previstos lista as folgas a movimentar (quantidade e dias) e os códigos 47 aparentes que a Fase 4 converteria (quantidade e dias), em duas linhas. Se a intenção era outra relação entre as duas contagens, ajustar o texto é uma mudança localizada em `texto(resumo)`.

**6. `% Não preenchida` só com porcentagem quando sinalizada.**
Alinhado ao relatório e ao texto de irregularidades: sem sinalização, o texto diz "não sinalizada".

**7. Horas no formato `HH:MM` que a Análise já produz.**
Sem reformatar; sinal negativo preservado.

## Risks / Trade-offs

- [A lista de dias de folga divergir da contagem por datas repetidas na mesma semana] → a quantidade é o tamanho da lista de elegíveis; os dias exibidos são únicos e ordenados; teste com repetição.
- [Ler a folha para o resumo demorar ou ler no momento errado] → só lê o que está carregado; a prontidão da página é verificada pelo chamador (change seguinte) com `validarEstrutura` antes de ler.
- [Divergência entre o resumo e o que o Ajuste de fato fizer] → o aviso final e o objetivo declarado (valores iniciais, não plano completo); o resultado final aparece no detalhe por linha.
- [Dependência da extração da Fase 4] → documentada na ordem da fila; sem ela, `coletarDiasCod47` serve como fonte equivalente.
