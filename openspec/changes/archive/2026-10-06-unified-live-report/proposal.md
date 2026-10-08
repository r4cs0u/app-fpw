# Proposal

## Why

Hoje Análise e Ajuste escrevem no mesmo "slot" de relatório e cada início de execução apaga o resultado anterior, então não é possível ver as duas visões juntas. O botão de relatório só habilita depois da conclusão e a tabela agrega as irregularidades em um único número, sem os dias nem a separação por tipo. Com o detector e o log da mudança anterior (`sheet-detector-and-log`), os dados necessários já existem por funcionário; falta um modelo único que os una e uma janela que os apresente ao vivo, com frações de progresso, cores de atenção e indicadores gerais.

Esta é a mudança B de três (A: detector e log, arquivada; C: exportação de irregularidades). O modelo criado aqui já guarda os dias de cada irregularidade para que C apenas os formate.

## What Changes

- Novo **modelo único de relatório por funcionário**, alimentado por Análise e Ajuste sem que um apague o outro, persistido em `sessionStorage` (sobrevive a recarregar a página, descartado ao fechar a aba).
- **Botão Relatório sempre disponível**: abre a janela mesmo sem dados e ela se preenche ao vivo enquanto a Análise ou o Ajuste rodam. A janela deixa de ser um HTML gerado ao final.
- **Tabela unificada** com todos os nomes do seletor desde a abertura (`-` até serem processados):
  - Folgas e Cód 47 em **fração** (`movidas/(movidas+presas)` e `convertidos/total`) após o Ajuste, e em número inteiro após a Análise.
  - Cores: azul (concluído), laranja (concluído com folgas presas ou 47 restantes), vermelho (irregularidades).
  - Irregularidades **abertas em colunas**: Sem Entrada/Saída, Interjornada, Marcações britânicas e % Folha não preenchida.
- **Indicadores no topo** (big numbers): folgas movimentadas/total com pendentes e presas; as quatro irregularidades; HE 100%, HEF 100% e HEC 70% com total, mínimo e máximo (sem zeros, com o nome em tooltip, HEC separando positivo e negativo). Clicar em folgas pendentes, folgas presas ou em qualquer irregularidade **filtra** os nomes correspondentes; novo clique limpa o filtro.
- **Botão Log dentro do relatório**, abrindo a janela de log já existente. O painel de log embutido por funcionário na janela do relatório é substituído por esse botão.
- A **Análise passa a contar o Cód 47 no mesmo escopo que o Ajuste altera** (mês alvo mais a semana de transição), o que muda o número exibido na Análise e elimina divergências falsas na pré-análise.
- A cópia do relatório (TSV) é gerada sob demanda a partir do modelo, com as novas colunas; frações recebem prefixo de texto para o Excel não as converter em data.
- Removidos o relatório estático por execução (`gerarAnalise`/`gerarFolgas`, `AF.estado.relatorioLista` e relacionados) e a obrigatoriedade de concluir uma execução para abrir o relatório.

Sem mudança no fluxo que altera dados (fases, esperas, gravação) nem nas condições de parada. Fica fora desta mudança: exportação de irregularidades (C).

## Capabilities

### New Capabilities
- `team-report`: modelo único por funcionário (Análise e Ajuste coexistindo), janela de relatório ao vivo e sempre disponível, tabela com frações, cores e colunas por irregularidade, persistência na sessão, cópia TSV, acesso ao log, e escopo do Cód 47 igual em Análise e Ajuste.
- `report-summary`: indicadores gerais do relatório (folgas, presas, irregularidades, HE, HEF e HEC com total/mín/máx) e filtros por clique.

### Modified Capabilities

## Impact

- **Código novo:** módulo do modelo de relatório (`27-modelo-relatorio.js`: regras puras, agregados, filtros, TSV e persistência), registrado em `99-main.user.js` (muda a lista de módulos, exigindo atualizar a instalação Tampermonkey conforme `AGENT.md`) e versão de teste incrementada.
- **Código alterado:** `60-relatorios.js` (reescrito: construção de HTML pura e janela viva), `50-analisar.js` e `40-fases.js` (alimentam o modelo; escopo do Cód 47), `80-painel.js` (botão Relatório sempre habilitado), `05-log.js` (reuso da janela a partir do relatório).
- **Testes:** novos para o modelo, frações, acúmulo, agregados e filtros, persistência e HTML; os testes de `gerarAnalise`/`gerarFolgas` em `tests/analise.test.js` e as expectativas de botão em `tests/panel-status.test.js` são atualizados.
- **Documentação:** `SSD.md` (inclui reparar uma linha da tabela de temporizadores danificada na mudança anterior), `README.md`, `ROADMAP.md`.
- **Sem dependências externas.**
