## Context

Contexto e motivação em `proposal.md`. Estado observado do código:

- `AF.analisar.contarIrregs/contarInterj/contarCod47` (`50-analisar.js`) e `AF.fases.analisarFolha` (`40-fases.js`) fazem leituras diretas do DOM com critérios de texto diferentes (`s/marc` x `s/marc de entrada/saida`; `Interjornada` x `[Interjornada]`) e guardam só números.
- A folha é uma tabela com, por dia, um `<tr>` de cabeçalho (data, horário previsto, indicações como interjornada) seguido de uma ou mais linhas com `Marc1N`/`Marc2N`, `IrreN`, `lstNomeN`, `CodJustN` e `HorasInfN`. `N` é um índice global de linhas. A origem da marcação vem no sufixo do valor (`*` manual, `M` mobile, `W` web, espaço = relógio). Em dias com mais de uma linha, `Marc1` das linhas seguintes repete o limite de divisão da jornada e pode haver linha órfã (só `Marc1`) com `Hora Extra Irregular`. Dias de folga justificada aparecem com `Ausência de Marcação` e marcações vazias. Observado em três folhas reais, somente leitura, com dias de 1 a 4 linhas.
- Em dias com mais de uma linha, as linhas costumam ser **encadeadas** (`Marc1` repete o `Marc2` da anterior), mas pode haver linha final **independente** com as duas marcações (ex.: `23:38 ` / `23:45*`) ou **órfã** (só `Marc1`, com `Hora Extra Irregular`).
- A marca `[Interjornada]` aparece no **cabeçalho** do dia, em `<b>`. O `innerText` das linhas de marcação inclui os textos das opções da lista de justificativas (há uma opção de interjornada), então esse texto não serve de evidência de interjornada.
- `AF.core.log(msg, cor)` (`00-core.js`) empilha `{msg, cor}` em `AF.estado.logBuffer`, que é zerado por `80-painel.js` a cada execução; `60-relatorios.js` agrupa por funcionário com regex sobre a linha `── Nome ──`, o que só existe no Ajuste.
- `ROADMAP.md` (etapa 3) já direciona para separar a leitura da página das regras, para que sejam testáveis com dados sintéticos (`node --test`, `node:test` + `vm`).

## Goals / Non-Goals

**Goals:**
- Uma única leitura da folha para dados estruturados e uma única função pura de detecção, usada por Análise e Ajuste.
- Registrar os dias de cada ocorrência para consumo futuro (relatório unificado e exportação).
- Log estruturado, acumulado e persistente, com antes/depois e janela de consulta/cópia.
- Preservar integralmente o fluxo de alteração de dados (fases, esperas, condições de parada).

**Non-Goals:**
- Reformular a tabela do relatório, frações, big numbers, filtros e exportação de irregularidades (changes B e C).
- Persistir o modelo do relatório entre recarregamentos (change B); só o log persiste aqui.
- Alterar o algoritmo de planejamento de folgas ou de gravação.

## Decisions

### D1. Duas camadas: leitor de linhas e detector puro (novo `25-detector.js`)
O leitor percorre `input[name^="Marc1"]`, associa cada linha ao cabeçalho do dia com `AF.mapa.obterCabecalhoDoDia` (já testado) e devolve `[{n, dataStr, cabecalho, marc1, marc2, irre, codJust, texto}]`. O detector recebe essas linhas e o mês alvo e devolve o resultado sem tocar no DOM.
- *Por quê:* segue a etapa 3 do roadmap e permite testar todas as regras com dados sintéticos, como `mapa.test.js` faz com `construirMapaFolha`.
- *Alternativa:* estender `AF.mapa.construirMapaFolha`. Rejeitada: esse mapa serve ao planejamento de folgas e tem outro escopo (semanas); misturar aumentaria o risco de regressão no Ajuste.
- Carrega depois de `20-mapa.js` e antes de `30-popup.js`.

### D2. Forma do resultado
`detectarFolha(linhas, alvo)` devolve `{ dias: {semES, interj, britanica}, naoPreenchida: {avaliada, flag, criterios, pctNaoPreenchida, visiveis, preenchidos}, contagens: {semES, interj, britanica} }`. Cada item de `dias` tem a data (e, em Sem Entrada/Saída, o texto da irregularidade). As contagens são sempre `length` das listas (`britanica` conta dias das sequências). Quando o leitor não encontra os campos de marcação, britânica e não preenchida ficam `avaliada:false` ("não avaliadas", não zero), o log registra o aviso e o Ajuste não é bloqueado, pois a detecção é só leitura.

### D3. Regras de detecção
- **Sem Entrada/Saída:** texto normalizado (`AF.core.norm`) da irregularidade contém `marcacao irregular`, `hora extra irregular` ou `s/marc`. Unifica os dois critérios hoje divergentes no mais abrangente. É por linha, como hoje.
- **Interjornada:** por dia, somente pelo texto do **cabeçalho** (`[Interjornada]`). Nunca pelo texto das linhas: o `innerText` de uma linha inclui as opções da lista de justificativas, que têm uma opção de interjornada. O código atual só escapa disso porque filtra `tr` que contêm data, ou seja, cabeçalhos; o detector restringe isso explicitamente. Cada dia conta uma vez. As marcações são lidas do `value` dos campos, nunca do `innerText`.
- **Entrada/saída do dia:** entrada = `marc1` da primeira linha; saída = `marc2` da última linha com `marc2` preenchido; origem pelo sufixo (regex sobre `^\d{1,2}:\d{2}` e o caractere seguinte).
- **Britânica:** para entradas e para saídas separadamente, lista de marcações `*` do mês alvo ordenadas por data; sequências maximais de minutos iguais; as com 3 ou mais contribuem com todos os seus dias.
- **Não preenchida:** dias visíveis = datas distintas do mês alvo com linhas; preenchido = alguma `marc1`/`marc2` não vazia nas linhas do dia. Critério 1: `preenchidos <= floor(visiveis / 4)`. Critério 2: percorrendo os visíveis em ordem, trechos consecutivos não preenchidos cujo `último − primeiro + 1 >= 7` dias corridos. `pctNaoPreenchida = round(100 × (visíveis − preenchidos) / visíveis)`. Sem dias visíveis, não avalia.
- *Alternativa para a sequência:* contar linhas consecutivas. Rejeitada: escalas alternadas escondem dias, então "uma semana" tem 3 ou 4 linhas visíveis; dias corridos descrevem melhor o fenômeno.

### D4. Compatibilidade de `analisarFolha` e das contagens
`AF.fases.analisarFolha` e `AF.analisar.analisarFolhaAtual` passam a chamar o detector e continuam devolvendo os campos atuais (`irregs`, `interj`, etc.), mais `britanica`, `naoPreenchida` e `dias`. O relatório atual (tabela e TSV) continua a exibir os mesmos números, agora com a definição unificada. `cod47` e folgas a movimentar mantêm suas funções atuais; a diferença é que os dias com código 47 passam a ser coletados para o log.
- `irregs` do relatório = contagem de Sem Entrada/Saída (equivale à soma atual `marc + he + smES`).

### D5. Log estruturado sobre a API existente (novo `05-log.js`)
`AF.core.log(msg, cor)` continua existindo e passa a criar um evento enriquecido com o contexto corrente (`AF.estado.contextoLog`: execução, tipo, funcionário, fase) — os ~30 pontos de chamada continuam funcionando. Novo `AF.log.evento(tipo, dados, textoOpcional)` para eventos ricos (estado antes/depois, ação, folga presa, falha, divergência). Cada evento: `{ts, execId, tipo, func, fase, nivel, msg, dados}`.
- **Execuções:** `AF.log.iniciarExecucao(tipo)` gera `execId` sequencial na sessão e registra um evento de cabeçalho; `AF.log.encerrarExecucao(status)` registra o resultado.
- **Agrupamento:** `AF.log.porFuncionario(execId)` substitui a regex em `60-relatorios.js`; a seção de log do relatório passa a usar os eventos da execução correspondente.
- **Texto:** `AF.log.texto(filtro)` renderiza linhas planas `[AAAA-MM-DD HH:MM:SS] [AJUSTE#2] NOME | fase | mensagem`, com blocos indentados para antes/depois.
- *Alternativa:* manter `logBuffer` e só enriquecer as mensagens. Rejeitada: não resolve agrupamento nem persistência, e perpetua a dependência da formatação do texto.

### D6. Persistência no `sessionStorage`
Chave com namespace (`fpw.log.v1`) em `window.top.sessionStorage`, o mesmo mecanismo já usado no projeto (`autodataTrocar` etc.). Gravação com debounce curto e flush ao fim de cada folha e em `pagehide`. Limite de caracteres conservador, pois o armazenamento é compartilhado com o próprio site; ao exceder, descarta os eventos mais antigos e acrescenta um evento de truncamento. Falhas de `setItem` são engolidas, registradas e não interrompem a execução. Ao carregar, se o registro indicar execução em andamento sem execução viva, marca-a como `interrompida`.
- *Alternativas:* `localStorage` (sobreviveria ao fechamento da aba, contra o requisito) e IndexedDB (complexidade desnecessária).

### D7. Estado antes/depois e pré-análise
`AF.fases.capturarEstadoFolha()` combina `AF.mapa.mapearFolhaAtual()` (folgas visíveis e ocultas, ausências, feriados, domingos ocultos), os dias com código 47 e o resultado do detector, e é somente leitura. Em `processarFolhaAtual`: captura **antes** logo após o teste de página vazia e antes da Fase 1 (serve como pré-análise e referência); captura **depois** na leitura que já existe após a gravação da Fase 4 (página recarregada), reaproveitando-a para as contagens finais. Em interrupção (`salvarProgressoParcial`), registra "depois: não coletado". A comparação com a Análise anterior usa um mapa em memória `AF.estado.ultimaAnalise[nome]` preenchido pela Análise; sem Análise prévia, só registra o estado inicial.
- A captura não adiciona esperas nem interações, não altera a ordem das fases e respeita `execucao.isActive()`.

### D8. Eventos de ação
Pontos de log existentes (Fases 1-4, gravação, parada) passam a também emitir eventos ricos: `acao-folga` (fase, origem, destino, resultado), `cod47` (data), `folga-presa` (data, fase e motivo, obtido do planejador onde já disponível), `falha` (etapa, motivo, não confirmado). Não se altera o retorno nem o fluxo dessas funções.

### D9. Janela do log e botão
`AF.log.abrirJanela()` abre (ou reutiliza) uma janela nomeada com `<pre>` de texto selecionável, botão copiar (`navigator.clipboard`, com fallback de seleção) e atualização enquanto aberta (leitura de `window.opener.AutomacaoFolha.log` a cada ~1 s, só se houve mudança). A janela lê o estado vivo do opener e não o `sessionStorage` próprio (que é copiado, não compartilhado, entre abas). O botão **Log** é adicionado ao painel em `80-painel.js`, sempre habilitado, e não é afetado por `setBtnAtivo`. O botão dentro do relatório fica para o change B.

### D10. Registro dos módulos e versão
`99-main.user.js` passa a listar `05-log.js` (após `00-core.js`) e `25-detector.js` (após `20-mapa.js`) e a versão sobe para `9.9-test` (também em `00-core.js`). Como o arquivo de entrada muda, a instalação Tampermonkey de teste precisa ser atualizada conforme `AGENT.md`.

## Risks / Trade-offs

- **Seletores `Marc1N`/`Marc2N` ausentes ou diferentes em outras folhas** → detecção devolve "não avaliada" para britânica e não preenchida, o log registra o aviso e o fluxo de ajuste não é afetado; a documentação em `PAGE_STRUCTURE.md` registra o formato observado.
- **Mudança de números exibidos** (critério unificado, interjornada por dia) → documentar no `SSD.md`; testes cobrem os critérios; comparar a saída do detector com o relatório atual em uma folha real, só leitura.
- **Cota do `sessionStorage` compartilhada com o site** → limite conservador, descarte dos mais antigos e falha silenciosa registrada.
- **Volume de log nos snapshots** → listar apenas datas (não linhas completas) e limitar o tamanho por evento.
- **Execução interrompida por recarga** → reconciliação ao carregar marca a execução como interrompida; dados da execução em andamento não são recuperados.
- **Captura "antes" adicionando risco ao Ajuste** → somente leitura, sem esperas, protegida por try/catch que registra o erro e prossegue (não interrompe a folha); verificação por teste e por validação de runtime sem executar Ajustar.
- **Falso positivo de interjornada por texto de linha** → o detector usa só o cabeçalho e nunca o `innerText` de linhas; teste com opção "interjornada" na lista de justificativas.
- **Heurística de britânica sensível a poucos dados** → a regra depende de 3 ou mais marcações manuais; folhas com poucas marcações manuais não disparam.

## Migration Plan

1. Implementar na branch `test` (módulos novos + alterações), com testes `node --test` passando.
2. Atualizar a instalação Tampermonkey de teste (muda `99-main.user.js`), recarregar o MyWay e validar em modo somente leitura: módulos carregados, painel, botão Log, Análise de uma folha e comparação com a saída do detector. Não executar Ajustar sem supervisão explícita.
3. Rollback: reverter a lista de módulos e as chamadas alteradas na branch `test`; `main` permanece intacta.

## Open Questions

- Nenhuma que mude specs ou tarefas. O formato do texto do log e o limite exato de caracteres do `sessionStorage` podem ser ajustados durante a implementação.
