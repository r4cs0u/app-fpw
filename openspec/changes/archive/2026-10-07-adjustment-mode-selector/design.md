## Context

`processarTodas` (`40-fases.js`) cria a execução (`iniciarExecucaoAjuste`), valida a estrutura com `exigirEstrutura('inicio do ajuste', null, true)` (o `true` aceita a seleção inicial vazia e depois seleciona o primeiro funcionário), instala o interceptor de popup, registra a lista no modelo e entra no laço: `processarFolhaAtual`, `avancarFuncionario`, até o fim da lista. O botão Ajustar (`80-painel.js`) só chama `processarTodas()`. O painel é uma caixa fixa de 400 px por no máximo 200 px de altura no `topFrame`, com botões Analisar, Ajustar, Relatório e Parar e uma barra de status. As janelas de relatório, log e exportação são popups abertos por `window.open` no clique do usuário. A leitura da folha para a pré-análise e o texto do resultado vêm das changes `supervised-preanalysis` e `report-row-adjustment-detail`; o contrato dos sons vem de `fix-run-sounds`.

Ver proposal.md e a spec `adjustment-mode`.

## Goals / Non-Goals

**Goals:**
- Modo Supervisionado seguro: nada é alterado sem confirmação explícita e revalidação.
- Reaproveitar o pipeline do Ajuste, sem reescrevê-lo, com um escopo de uma folha.
- Manter o modo Automático idêntico ao atual.

**Non-Goals:**
- Não oferecer "aplicar e ir para a próxima" (decisão: o usuário confere a folha ajustada).
- Não prever o plano completo de movimentação nem permitir editar a pré-análise.
- Não aprovar a folha no WebPonto; a aprovação final continua manual.
- Não mudar Analisar.

## Decisions

**1. A confirmação é uma janela popup própria (`fpw-supervisionado`), no padrão das demais janelas.**
O clique em Ajustar lê a pré-análise de forma síncrona e abre a janela no mesmo gesto do usuário, evitando o bloqueio de popup. O painel é pequeno demais para um modal com o resumo. Alternativas: modal dentro do `topFrame` (cortado pela altura do frame) e `window.confirm` (sem espaço para o resumo). Se o navegador bloquear o popup, o painel mostra o aviso e nada é iniciado.

**2. Novo módulo `65-supervisionado.js`, carregado depois de `60-relatorios.js` e `38-preanalise.js`.**
Contém o estado do fluxo (ocioso, confirmando, aplicando, concluído, parado, interrompido), a abertura e o desenho da janela, o cancelamento por fechamento e a leitura do desfecho. O painel só decide o modo e chama o módulo. Alternativa: pôr tudo em `80-painel.js`, que já mistura UI e eventos.

**3. `processarTodas` ganha `opcoes`: `{ somenteFolhaAtual, nomeEsperado }`.**
Com `somenteFolhaAtual`: valida a estrutura sem aceitar seleção vazia; compara o funcionário atual com `nomeEsperado` e, se diferir, interrompe com `pararExecucaoAjuste({ status: 'error', stage: 'supervised-revalidation', ... })` antes de registrar execução no modelo; toca o som de início só depois disso; registra no modelo todos os nomes do seletor e define o total da execução como 1; processa a folha atual e sai sem chamar `avancarFuncionario`. O modo Automático não passa opções e segue o caminho de hoje. Alternativa: função paralela `ajustarFolhaAtual`; duplicaria preparação, limpeza e encerramento da execução.

**4. O total opcional em `AF.modelo.iniciarExecucao(tipo, nomes, mes, opcoes)`.**
A lista completa de funcionários continua conhecida (o relatório mostra todos), mas o progresso da execução supervisionada é 1 de 1. Sem `opcoes`, o comportamento é o atual.

**5. O resultado reaproveita `AF.modelo.textoDetalheAjuste(nome)` e o estado da execução.**
O status final vem de `AF.estado.cancelado`, `falhaAjuste` e `motivoParadaAjuste`, os mesmos que o painel usa. Alternativa: texto próprio do resultado; duplicaria o detalhe por linha e criaria dois formatos para a mesma informação.

**6. Seletor de modo como controle segmentado de duas posições no painel, com a escolha em `sessionStorage` (`fpw.modoAjuste`).**
Uma linha compacta entre os botões e a barra de status mantém o painel dentro da altura máxima. A leitura do armazenamento é tolerante a falhas e cai em Automático. O estado de trava (`AF.estado.rodando` ou `AF.estado.confirmacaoPendente`) desabilita o seletor e os botões Analisar e Ajustar.

**7. Fechar a janela equivale a cancelar.**
O módulo observa o fechamento durante `confirmando` e volta ao ocioso. Fechar durante `aplicando` não interrompe o Ajuste (Parar continua sendo o meio de parar); o resultado só deixa de ser exibido.

**8. Som de atenção `atencao` no catálogo, tocado ao abrir a janela.**
Duas notas curtas e suaves, diferentes dos demais. O início toca na revalidação aprovada, como em `fix-run-sounds`; cancelar não toca nada.

**9. A janela desabilita Aplicar depois do clique e quando `AF.estado.rodando` for verdadeiro.**
Evita duplo envio e confirmação sobre uma execução já em curso.

## Risks / Trade-offs

- [Gravação no WebPonto depois da confirmação] → confirmação humana explícita, revalidação de funcionário e estrutura, mesmas pré-condições e esperas do Ajuste atual, Parar disponível, e validação de runtime controlada (Etapa 4, `AGENT.md`).
- [Popup bloqueado] → o painel avisa e nada é iniciado; o texto das instruções orienta a permitir popups do site.
- [Usuário trocar de funcionário com a janela aberta] → o painel trava Analisar e Ajustar, mas a troca pelo cabeçalho da página continua possível; a revalidação recusa a aplicação se o nome mudou.
- [Pré-análise diferir do que o Ajuste faz] → o resumo declara valores iniciais; o resultado final mostra o que foi realmente feito.
- [Progresso 1 de 1 diferir do modo Automático no relatório] → decisão deliberada; o cabeçalho descreve cada execução de forma independente.
- [O painel de 200 px não comportar a linha extra] → altura da linha de modo é pequena; teste de layout verifica o `max-height` do painel e a ausência de corte dos botões.

## Migration Plan

Só na branch `test`. Sem migração de dados; ausência da chave de modo na sessão significa Automático. Reverter é remover o módulo, o seletor e as `opcoes` de `processarTodas`. Validação de runtime em duas etapas: primeiro cancelar a confirmação e fechar a janela (sem alteração); depois aplicar em uma folha de teste escolhida com o responsável, conferindo resultado, relatório e log.
