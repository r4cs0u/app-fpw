# Roadmap do app-fpw

## Propósito

Este documento registra o estado atual do projeto e a ordem recomendada para melhorar sua estrutura antes de ampliar o conjunto de funcionalidades. Ele acompanha a direção de médio e longo prazo; tarefas detalhadas de cada mudança ficam no OpenSpec.

## Estado atual

O `app-fpw` é um userscript Tampermonkey para apoiar a análise e os ajustes de folhas de ponto no WebPonto/MyWay. A branch `main` é a referência estável de produção; a branch `test` deste mesmo repositório é o ambiente de experimentação. Não está planejado um repositório separado `app-fpw-teste`.

A base já tem módulos JavaScript para estado e acesso aos frames, utilitários de datas, mapeamento da folha, popups, análise, ajustes, relatórios, painel e identificação do ambiente. A documentação também já está dividida por propósito:

- [README.md](README.md): visão geral e uso do aplicativo.
- [AGENT.md](AGENT.md): regras operacionais, limites e procedimentos para agentes e contribuidores.
- [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md): estrutura observada do WebPonto, frames, formulários e restrições de interação.
- [SSD.md](SSD.md): arquitetura implementada, responsabilidades dos módulos e evidências técnicas.
- Este roadmap: estado do projeto, prioridades e etapas futuras.

Os requisitos duráveis das capacidades conhecidas estão em [openspec/specs/](openspec/specs/). O OpenSpec também guarda o plano e o histórico de cada mudança em `openspec/changes/` e `openspec/changes/archive/`; esses arquivos não substituem os guias acima.

## Direção

Evoluir primeiro a previsibilidade, a capacidade de testar e a segurança operacional. Fazer mudanças incrementais na branch `test`, preservando `main` como referência estável e sem mudar o comportamento funcional inadvertidamente. Novas funcionalidades maiores voltam ao foco depois que essa base estiver mais confiável.

## Próximas etapas

### 1. Alinhar e manter o plano e a documentação

**Objetivo:** manter os documentos atuais, claros e sem planos duplicados ou instruções conflitantes.

**Trabalho:** registrar o estado real do projeto; manter responsabilidades distintas entre README, guia de agente, contrato da página, SSD e roadmap; usar o OpenSpec para planos e histórico de mudanças.

**Concluída quando:** os guias descrevem o que existe hoje, as decisões vigentes estão claras e não há mais um plano de versão de teste separado e redundante.

**Estado:** concluída em 2026-10-02 com a consolidação desta documentação.

### 2. Criar testes para regras independentes do site

**Objetivo:** verificar cálculos e decisões sem abrir o WebPonto nem interagir com dados reais.

**Trabalho:** identificar regras que possam receber dados de exemplo e retornar resultados — por exemplo, tratamento de datas, semanas, feriados e planejamento de ajustes. Escolher testes pequenos e direcionados antes de tentar cobrir todo o userscript.

**Concluída quando:** as regras escolhidas têm exemplos automatizados para resultados esperados e casos-limite, e existe um comando documentado que os executa de forma repetível.

**Estado:** critérios atendidos. A suíte (`node --test`, documentado no [README.md](README.md)) cobre datas, planejamento de ajustes, mapeamento da folha, detector, modelo do relatório, esperas e a interface do relatório, com 181 testes aprovados em 2026-10-06. Novas regras devem continuar entrando com testes.

### 3. Separar gradualmente as regras da página

**Objetivo:** reduzir o quanto os cálculos dependem diretamente de elementos HTML e da estrutura específica do WebPonto.

**Trabalho:** em pequenas mudanças, transformar a leitura da página em dados estruturados e passar esses dados às regras; manter a interação com frames, DOM e popups numa fronteira identificável. Não é uma reescrita total.

**Concluída quando:** as principais regras de negócio podem ser testadas com dados de exemplo sem DOM, e os fluxos existentes continuam produzindo os resultados esperados em validações controladas.

**Progresso:** em andamento. O mapeamento da folha e o planejamento de ajustes foram extraídos, e `sheet-detector-and-log` (arquivada; ver etapa 5) trouxe a leitura da folha em linhas estruturadas e a detecção pura, com os dias de cada irregularidade, usada por Análise e Ajuste. `unified-live-report` e `irregularity-export` seguiram o mesmo princípio: o modelo do relatório e o texto de irregularidades são funções puras testadas sem DOM. `extract-sheet-reading-rules` (arquivada) separa em `37-regras-folha.js` quatro regras de leitura usadas pela Análise: contagem de folgas, escopo dos dias com código 47, totalização das horas extras e interpretação do saldo compensável. A decisão da Fase 4 (change `extract-phase4-decision`) foi extraída para a função pura `AF.regras.selecionarCamposCod47` em `37-regras-folha.js`, garantindo por construção que a Análise e a Fase 4 selecionam o mesmo conjunto de códigos 47. A validação de runtime somente de observação foi realizada em 2026-10-07 via MCP, confirmando equivalência perfeita entre a Análise e a Fase 4 na folha real aberta do MyWay. O envio dos eventos e a gravação permanecem como estão. Outros candidatos avaliados e adiados: leitura e navegação da lista de funcionários em `processarTodas` (risco médio) e o laço de `analisarTodas` (pouco ganho).

### 4. Reforçar segurança e diagnóstico das ações que alteram dados

**Objetivo:** garantir que alterações só ocorram no contexto esperado e que falhas parem de maneira visível e compreensível.

**Trabalho:** revisar pré-condições da página e dos seletores, condições de parada, tratamento de erros e pontos de gravação; diferenciar claramente leitura, alteração automatizada e aprovação final humana. Toda mudança nesse fluxo deve ser validada primeiro na branch `test`, respeitando [AGENT.md](AGENT.md) e [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md).

**Concluída quando:** cada ação que altera dados tem pré-condições e resultado verificáveis, estados inesperados interrompem o fluxo com diagnóstico, e a validação confirma que nenhuma gravação ou aprovação ocorre fora do comportamento explicitamente aprovado.

**Estado:** concluída em 2026-10-06 por decisão do responsável do projeto. As mudanças `guard-adjustment-write-preconditions` e `stop-adjustments-on-wait-failure` (ambas arquivadas) trouxeram pré-condições de gravação, esperas com evidência estrutural, parada por execução, limpeza de recursos e diagnóstico de resultados parciais. Prazos são limites provisórios de segurança, não tempos fixos de resposta do FPW; a validação sintética não substitui evidência de runtime. Uma validação de runtime dedicada e controlada do Ajuste foi feita como parte desta etapa; o uso na branch `test` segue como evidência e qualquer falha observada vira uma nova mudança.

### 5. Retomar evoluções maiores de funcionalidades

**Objetivo:** voltar a ampliar o produto sobre uma base mais fácil de manter e validar.

**Trabalho:** avaliar cada ideia como uma mudança OpenSpec própria, com objetivo, escopo, riscos e critérios de aceitação; validar na branch `test` antes de considerar promoção.

**Concluída quando:** não é uma entrega única. Cada funcionalidade aprovada tem critérios de aceitação, validação compatível com seu risco e decisão explícita sobre eventual promoção para a linha estável.

**Progresso:** A, B e C foram concluídas e arquivadas; seus requisitos duráveis estão em `openspec/specs/`. Todas estão publicadas apenas na branch `test`, sem promoção para `main`; a promoção fica para depois de mais melhorias e validações na versão de teste. A validação de C em runtime foi somente leitura via MCP e não incluiu Análise nem Ajuste. Ao promover, considerar que `main` tem o commit `74524c6` (reversão de uma promoção anterior) que `test` não tem; verificar o que ele reverteu antes de integrar.

1. **`sheet-detector-and-log` (A, concluída e arquivada):** fundação com detector de folha unificado e log estruturado.
2. **`unified-live-report` (B, concluída e arquivada):** modelo único por funcionário (`27-modelo-relatorio.js`), Análise e Ajuste coexistindo, botão Relatório sempre disponível com janela ao vivo (`60-relatorios.js`), frações de progresso (`movidas/(movidas+presas)`), cores por estado, colunas abertas de irregularidade, indicadores no topo com filtros rápidos e persistência na sessão.
3. **`irregularity-export` (C, concluída e arquivada):** texto copiável por pessoa e pela lista visível do time, com os dias de cada irregularidade; ícone por linha e janela "Exportar irregularidades" que respeita filtros e extremos.

Decisões de produto já tomadas para B e C: a fração usa a Análise como denominador e o Ajuste como numerador, e Ajustar repetido acumula sobre a mesma linha de base; uma nova Análise volta ao valor inteiro.

#### Fila de melhorias exploradas em 2026-10-07 (D a I)

Ordem do mais simples ao mais complexo, confirmada em 2026-10-07: sons (item 0), D+E, F, G, extração da Fase 4, H, I1, I2. Cada item é uma mudança OpenSpec própria, validada na branch `test`; D e E são agrupadas por alterarem a mesma função de renderização da linha. Todas as changes abaixo foram criadas e planejadas em 2026-10-07 (proposta, especificação, design e tarefas, validadas com `openspec validate --strict`) e aguardam aplicação na ordem da tabela; nenhuma foi implementada. Os itens 0 a G alteram só som e janela do relatório (leitura); H e I tocam sessão e fluxo de ajuste e seguem as regras da Etapa 4.

| # | Change | Origem | Natureza | Risco |
|---|--------|--------|----------|-------|
| 0 | `fix-run-sounds` | Sons | Acionamento de sons em `70-sons.js`, painel, Análise e Ajuste | Baixo |
| D+E | `report-row-presentation` | Melhorias 4 e 5 | Visual e renderização, `60-relatorios.js` | Baixo |
| F | `additive-report-filters` | Melhoria 2 | Regra de filtro + UI + specs | Médio |
| G | `report-row-adjustment-detail` | Melhoria 6 | Novo dado no modelo + UI | Médio |
| Fase 4 | `extract-phase4-decision` (sem mudança de especificação) | Etapa 3 | Função pura testada, validada via MCP e arquivada em 2026-10-07 | Médio |
| H | `oracle-session-keepalive` | Melhoria 1 | Monitor e sentinela implementados (256 testes); validação de runtime pendente | Baixo |
| H2 | `oracle-active-keepalive` | Melhoria 1 (continuação) | Diagnóstico passivo, estado expirado e pulso ativo automático implementados e testados (259 testes); validação de runtime no Oracle pendente | Médio |
| I1 | `supervised-preanalysis` | Melhoria 3 | Pré-análise somente leitura validada via MCP e arquivada em 2026-10-07 | Médio |
| I2 | `adjustment-mode-selector` | Melhoria 3 | Seletor Automático/Supervisionado implementado (`65-supervisionado.js`, 253 testes) | Médio |

**0. Sons (`fix-run-sounds`).** O relatório é vivo, então o som de cópia ao abrir o Relatório deixa de existir e o som de conclusão perde o atraso de 900 ms. O som de início do Ajuste passa a tocar só depois das pré-condições; interrupção por erro ganha um som de falha próprio; Parar só toca com execução em andamento; cada execução toca um único som de desfecho (conclusão, parada ou falha). O modo Supervisionado (I2) reaproveita esse contrato e acrescenta um som de atenção ao abrir a confirmação. Estado: implementada e arquivada em 2026-10-07 (`2026-10-07-fix-run-sounds`; capacidade durável `run-sounds`), com a validação manual de som arquivada como tarefa não marcada.

**D. Linha pulsando em vez de texto de status** (parte de `report-row-presentation`; implementada e arquivada em 2026-10-07 como `2026-10-07-report-row-presentation`, requisitos em `team-report`; a validação manual ficou como tarefa não marcada). Hoje o selo "processando" fica dentro da célula do nome (`td:first-child`, largura fixa de 180px, `overflow:hidden`), por isso o texto é cortado. Trocar o selo por uma animação de pulso na linha-alvo (`row-processing`), sem texto. Os selos "parcial" e "s/ marcações" sofrem do mesmo corte; decidir ao implementar se "parcial" vira dica de contexto ou ganha outro lugar. Critério: a linha em Análise/Ajuste pulsa, não há texto de status ao lado do nome e o pulso para ao encerrar ou interromper a execução.

**E. Funcionário sem marcações em linha mesclada** (parte de `report-row-presentation`; o texto da célula é "Sem Marcações na Folha", conforme a edição do responsável neste roadmap). Hoje a linha mostra "-" em todas as colunas e o selo "s/ marcações". Passar a mostrar, após o nome, uma célula única (`colspan`) com "Sem Marcações na Folha". Pontos a decidir: não manter a coluna do botão de exportação (já desabilitado); Essas linhas em ordenação e filtros continuam sumindo quando há filtro ativo; manter a regra da exportação de irregularidades, que já ignora folhas sem marcações. Depende apenas de `obterDadosFunc` já expor `vazia`.

**F. Filtros aditivos, correção de Movim. e busca por nome** (`additive-report-filters`; implementada e arquivada em 2026-10-07 como `2026-10-07-additive-report-filters`, requisitos em `report-summary` e `irregularity-export`).
- Múltiplos indicadores ativos ao mesmo tempo, somando linhas (união): com "Sem Entrada/Saída" ativo, clicar em "Interjornada" acrescenta quem tem interjornada. Vale para todos os indicadores. Hoje `estadoVisao.filtro` guarda um valor só e o clique substitui o anterior.
- Causa do defeito de Movim.: `AF.modelo.filtrar('pendentes')` exige `folgas.estado === 'pendente'`, estado que só existe depois da Análise e antes do Ajuste; após Ajustar o estado vira `concluida`/`atencao` e o filtro não retorna ninguém. Movim. deve listar quem tem folgas no indicador (movidas, pendentes ou presas), com a coluna de folgas preenchida.
- Campo de busca por nome no relatório, combinado (interseção) com os indicadores ativos.
- Impactos em specs: `report-summary` (requisitos "Filtro da tabela por indicador", cenário "Trocar de filtro" e a regra de que o filtro substitui o anterior) e `irregularity-export` (janela e título da exportação respeitam o filtro; hoje o rótulo é de um único filtro). Mín/máx continuam como extremo separado.
- Testes: união de filtros, Movim. após Análise e após Ajuste, busca por nome com acentos, e exportação com vários filtros.

**G. Detalhe compacto por funcionário (resumo do log na linha)** (`report-row-adjustment-detail`; implementada e arquivada em 2026-10-07 como `2026-10-07-report-row-adjustment-detail`, requisitos em `team-report`). Botão por linha que expande a própria linha com o texto: folgas movimentadas (destino, origem, resultado alterado/sem alteração), folgas presas e dias de código 47. Descobertas: o log já registra `acao-folga` (ausência, origem, resultado) por funcionário, mas o log tem limites de memória e de armazenamento e descarta eventos antigos; o modelo do relatório guarda só a contagem de movidas, a lista de presas e `cod47Dias` da Análise. Por isso a recomendação é gravar no modelo uma lista compacta de ações por funcionário (e os dias de código 47 convertidos), persistida com o resto do modelo na sessão, em vez de reconstruir a partir do log. O texto deve ser gerado por função pura testada sem DOM, na linha do texto de irregularidades. Pode compartilhar a estrutura de dados com a pré-análise de I. Não usar nomes ou dados reais em exemplos e testes.

**H. Keepalive baseado na página Oracle (item 1 das pendências)** (`oracle-session-keepalive`; implementada em 2026-10-07 com 256 testes aprovados; validação de runtime ainda pendente). A URL da página Oracle começa com `https://elny.fa.la1.oraclecloud.com/`. A investigação via MCP em 2026-10-07 confirmou a hipótese 1: o userscript roda na aba Oracle como sentinela mínima (sem automações de folha nem painel), emitindo um pulso a cada 30 s via `GM_setValue`. No MyWay, `00-core.js` monitora o sinal com janela de tolerância de 90 s, registra evento de log em caso de perda, e `80-painel.js` apresenta o badge e o aviso de perda sem interromper execuções. Limites conhecidos: o pulso prova que a aba Oracle está aberta e com o script rodando, não que a sessão no servidor Oracle continua válida; o sistema apenas monitora e avisa, não mantém a sessão Oracle ativa; abas em segundo plano têm temporizadores reduzidos pelo Chrome, o que pode aproximar o pulso da janela de 90 s. A tentativa de inspeção via MCP em 2026-10-07 listou as abas, mas as chamadas seguintes expiraram, então a causa da desconexão relatada não foi confirmada.

**I. Modo Automático ou Supervisionado** (I1 `supervised-preanalysis`, I2 `adjustment-mode-selector`). Seletor excludente na interface do painel (nunca os dois ao mesmo tempo): Automático mantém o comportamento atual (percorre a lista até o último nome); Supervisionado trabalha uma folha por vez. No Supervisionado, Ajustar abre uma janela com a pré-análise da folha atual e pede confirmação; Aplicar executa as fases normais apenas nessa folha, sem avançar para outra, para o usuário conferir a folha ajustada; Cancelar volta ao estado dormente. Ao concluir, a mesma janela mostra o texto do detalhe de G e o status "concluído". Sem folha selecionada, avisa para selecionar uma folha ou trocar o modo. Conteúdo da pré-análise: nome; intervalo analisado (mês alvo + última semana, mesmo escopo do código 47); folgas a movimentar (quantidade e dias); códigos 47 a ajustar (quantidade); resumo de irregularidades (Sem E/S, Interjornada, Britânicas, % não preenchida); resumo de horas (HE 100%, HEF 100%, HEC 70%); aviso de que os valores podem mudar após o ajuste.
- Descobertas: a pré-análise é leitura e pode reutilizar `AF.analisar` (folgas, código 47, horas), o detector e o intervalo de `selecionarDiasCod47`. O planejamento das Fases 1 a 3 é por rodada e refeito após cada popup (`planejarFase1Rodada` retorna uma ação por vez), então destino e origem de cada folga não podem ser previstos por completo sem executar. A pré-análise deve listar as folgas a movimentar e os dias de código 47, não o plano completo; os valores finais aparecem em G.
- Pré-requisito recomendado: a extração pura da decisão da Fase 4 (próximo passo da Etapa 3), que dá à pré-análise a mesma regra usada na gravação.
- A pré-análise não grava nada; a confirmação humana antes da gravação reforça a Etapa 4 e exige validação de runtime controlada.
- Divisão sugerida: I1 (`supervised-preanalysis`), pré-análise somente leitura implementada e validada em runtime via MCP em 2026-10-07 (`38-preanalise.js`, 240 testes aprovados); I2 (`adjustment-mode-selector`), seletor de modo, confirmação e travas (modo fixo durante execução, persistência da escolha, interação com Parar).

Decisões do responsável em 2026-10-07:
1. Ordem: sons, D+E, F, G, extração da Fase 4, H, I1, I2. A extração da Fase 4 precede H e I, que reutilizam a mesma regra; isso substitui a ordem do acordo de 2026-10-06 (Fase 4 e keepalive antes das melhorias).
2. H: URL Oracle começa com `https://elny.fa.la1.oraclecloud.com/`; o userscript pode rodar nela; a estrutura da página será verificada via MCP no momento da investigação.
3. I: depois de confirmar, o app só aplica a folha atual (sem avançar), e o resumo final acrescenta o texto de G e o status concluído. Nome dos modos: Automático / Supervisionado.
4. F: indicadores se combinam por união e a busca por nome por interseção com eles.
5. Sons: o relatório vivo dispensa os sons de abertura e de cópia; os sons de início e conclusão seguem como sinais da execução e passam a ser acionados conforme `fix-run-sounds`.
6. E: a célula mesclada diz "Sem Marcações na Folha", não mantém a coluna do botão de exportação, e essas linhas continuam fora da tabela quando há filtro ativo.

Interpretações assumidas nas changes, a corrigir se não forem a intenção: (a) a linha "Códigos 47 a ajustar" da pré-análise mostra os dias de código 47 que a Fase 4 converteria e sua quantidade, e a quantidade de folgas a movimentar aparece em linha própria; (b) a janela de confirmação é um popup, como as demais janelas do app; (c) a pré-análise informa valores iniciais, não o plano completo de movimentação, que só é conhecido durante a execução.

## Pendências conhecidas

- **Promoção para `main`:** adiada por decisão do responsável; ainda há melhorias e validações previstas na versão de teste. Ver a observação sobre o commit `74524c6` na Etapa 5.
- **Keepalive (`iniciarKeepAlive`), segunda ação prevista, depois da extração da Fase 4:** hoje faz um `GET` no WebPonto a cada 2 min e, com `oracle-session-keepalive`, monitora e acompanha a sessão da aba Oracle via pulso sentinela compartilhado sem afetar automações. Pendente apenas promoção conjunta para a linha estável.

## Princípios para a execução

- Trabalhar na branch `test`; manter `main` como referência estável até uma promoção deliberada.
- Preferir mudanças pequenas e reversíveis, sem combinar remodulação ampla e mudança de comportamento no mesmo passo.
- Distinguir evidência observada de garantia: um teste sintático, uma resposta HTTP ou uma observação de duração limitada não comprovam cenários além do que foi efetivamente verificado.
- Não usar dados de funcionários ou conteúdo de folhas em documentação de arquitetura, exemplos públicos ou testes versionados.
- Tratar gravação e aprovação no WebPonto como operações sensíveis e preservar a supervisão humana estabelecida nos guias.

## Acompanhamento

O estado das etapas é descrito aqui em alto nível; tarefas concretas, decisões técnicas e evidências específicas pertencem às mudanças OpenSpec correspondentes. Ao concluir ou redirecionar uma etapa, atualizar este documento para não deixar itens concluídos escritos como trabalho futuro.
