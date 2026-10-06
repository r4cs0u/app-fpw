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

**Estado:** critérios atendidos. A suíte (`node --test`, documentado no [README.md](README.md)) cobre datas, planejamento de ajustes, mapeamento da folha, detector, modelo do relatório, esperas e a interface do relatório, com 172 testes aprovados em 2026-10-06. Novas regras devem continuar entrando com testes.

### 3. Separar gradualmente as regras da página

**Objetivo:** reduzir o quanto os cálculos dependem diretamente de elementos HTML e da estrutura específica do WebPonto.

**Trabalho:** em pequenas mudanças, transformar a leitura da página em dados estruturados e passar esses dados às regras; manter a interação com frames, DOM e popups numa fronteira identificável. Não é uma reescrita total.

**Concluída quando:** as principais regras de negócio podem ser testadas com dados de exemplo sem DOM, e os fluxos existentes continuam produzindo os resultados esperados em validações controladas.

**Progresso:** em andamento. O mapeamento da folha e o planejamento de ajustes foram extraídos, e `sheet-detector-and-log` (arquivada; ver etapa 5) trouxe a leitura da folha em linhas estruturadas e a detecção pura, com os dias de cada irregularidade, usada por Análise e Ajuste. `unified-live-report` e `irregularity-export` seguiram o mesmo princípio: o modelo do relatório e o texto de irregularidades são funções puras testadas sem DOM. A fronteira com frames, DOM e popups continua sendo o que falta isolar nos fluxos de Análise e Ajuste.

### 4. Reforçar segurança e diagnóstico das ações que alteram dados

**Objetivo:** garantir que alterações só ocorram no contexto esperado e que falhas parem de maneira visível e compreensível.

**Trabalho:** revisar pré-condições da página e dos seletores, condições de parada, tratamento de erros e pontos de gravação; diferenciar claramente leitura, alteração automatizada e aprovação final humana. Toda mudança nesse fluxo deve ser validada primeiro na branch `test`, respeitando [AGENT.md](AGENT.md) e [PAGE_STRUCTURE.md](PAGE_STRUCTURE.md).

**Concluída quando:** cada ação que altera dados tem pré-condições e resultado verificáveis, estados inesperados interrompem o fluxo com diagnóstico, e a validação confirma que nenhuma gravação ou aprovação ocorre fora do comportamento explicitamente aprovado.

**Progresso:** em andamento. As mudanças `guard-adjustment-write-preconditions` e `stop-adjustments-on-wait-failure` (ambas arquivadas) trouxeram pré-condições de gravação, esperas com evidência estrutural, parada por execução, limpeza de recursos e diagnóstico de resultados parciais. Prazos são limites provisórios de segurança, não tempos fixos de resposta do FPW; a validação sintética não substitui evidência de runtime.

**Pendente para concluir:** validar em runtime, de forma controlada e com aprovação explícita do usuário, o comportamento do Ajuste (pré-condições, parada em falha e ausência de gravação fora do esperado). Isso é requisito para decidir a promoção a `main`.

### 5. Retomar evoluções maiores de funcionalidades

**Objetivo:** voltar a ampliar o produto sobre uma base mais fácil de manter e validar.

**Trabalho:** avaliar cada ideia como uma mudança OpenSpec própria, com objetivo, escopo, riscos e critérios de aceitação; validar na branch `test` antes de considerar promoção.

**Concluída quando:** não é uma entrega única. Cada funcionalidade aprovada tem critérios de aceitação, validação compatível com seu risco e decisão explícita sobre eventual promoção para a linha estável.

**Progresso:** A, B e C foram concluídas e arquivadas; seus requisitos duráveis estão em `openspec/specs/`. Todas estão publicadas apenas na branch `test`, sem promoção para `main`. A validação de C em runtime foi somente leitura via MCP e não incluiu Análise nem Ajuste.

1. **`sheet-detector-and-log` (A, concluída e arquivada):** fundação com detector de folha unificado e log estruturado.
2. **`unified-live-report` (B, concluída e arquivada):** modelo único por funcionário (`27-modelo-relatorio.js`), Análise e Ajuste coexistindo, botão Relatório sempre disponível com janela ao vivo (`60-relatorios.js`), frações de progresso (`movidas/(movidas+presas)`), cores por estado, colunas abertas de irregularidade, indicadores no topo com filtros rápidos e persistência na sessão.
3. **`irregularity-export` (C, concluída e arquivada):** texto copiável por pessoa e pela lista visível do time, com os dias de cada irregularidade; ícone por linha e janela "Exportar irregularidades" que respeita filtros e extremos.

Decisões de produto já tomadas para B e C: a fração usa a Análise como denominador e o Ajuste como numerador, e Ajustar repetido acumula sobre a mesma linha de base; uma nova Análise volta ao valor inteiro.

## Princípios para a execução

- Trabalhar na branch `test`; manter `main` como referência estável até uma promoção deliberada.
- Preferir mudanças pequenas e reversíveis, sem combinar remodulação ampla e mudança de comportamento no mesmo passo.
- Distinguir evidência observada de garantia: um teste sintático, uma resposta HTTP ou uma observação de duração limitada não comprovam cenários além do que foi efetivamente verificado.
- Não usar dados de funcionários ou conteúdo de folhas em documentação de arquitetura, exemplos públicos ou testes versionados.
- Tratar gravação e aprovação no WebPonto como operações sensíveis e preservar a supervisão humana estabelecida nos guias.

## Acompanhamento

O estado das etapas é descrito aqui em alto nível; tarefas concretas, decisões técnicas e evidências específicas pertencem às mudanças OpenSpec correspondentes. Ao concluir ou redirecionar uma etapa, atualizar este documento para não deixar itens concluídos escritos como trabalho futuro.
