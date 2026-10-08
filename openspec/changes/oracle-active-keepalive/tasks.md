# Tasks

## 1. Medição (diagnóstico passivo e leitura via MCP)

- [x] 1.1 No sentinela (`99-main.user.js`), adicionar diagnóstico passivo que grava via `GM_setValue` um registro limitado (últimas N entradas, sem URLs com parâmetros nem valores sensíveis): abertura da página, último evento de atividade observado, avisos de expiração e instante em que a página indica sessão expirada. Verificar em teste com `window`/`document` simulados: o registro respeita o limite, não contém query string nem tokens, e não acessa formulários.
- [ ] 1.2 Publicar em `test`, orientar o responsável a reinstalar o userscript (procedimento do `AGENT.md`) e deixar a aba Oracle aberta e o computador ocioso até a próxima queda. Verificar lendo o registro de diagnóstico (console ou `GM_getValue`) com as horas de abertura e de expiração.
- [ ] 1.3 Em paralelo, tentar via MCP somente leitura observar a aba Oracle: requisições periódicas da própria página, avisos de expiração, mecanismo de renovação e sinais de página expirada (login/aviso). Verificar com notas em `PAGE_STRUCTURE.md` (sem identificadores, tokens ou URLs completas); se o MCP expirar de novo, registrar que não foi observado, sem afirmar o contrário.
- [x] 1.4 Fechar a medição: timeout de inatividade, o que conta como atividade, existência de limite absoluto e o sinal de "expirada". Verificar com a conclusão escrita em `PAGE_STRUCTURE.md` e a escolha do tipo e do intervalo do pulso.
- [x] 1.5 Atualizar esta change com `/openspec-update-change` conforme a medição (tipo de pulso, intervalo, sinais de expiração, `@connect` se necessário). Verificar com `openspec validate oracle-active-keepalive --strict` e o grupo 2 reescrito em tarefas específicas.

## 2. Estado e política (lógica pura)

- [x] 2.1 Acrescentar o estado `expired` a `AF.sessao.avaliarEstadoOracle` (aba fechada continua `inactive`; transição para expirada notifica uma vez). Verificar em `tests/sessao-oracle.test.js`: expirada vs fechada, aviso único por expiração, retorno a ativa limpa o aviso.
- [x] 2.2 Criar `AF.sessao.decidirPulsoAtivo` com constantes nomeadas (intervalo abaixo do timeout medido) e regras: opção desligada não pulsa, estado `expired` para, intervalo não decorrido aguarda. Verificar em teste dos casos: desligado, ligado no intervalo, ligado após o intervalo, expirado, primeiro pulso.

## 3. Implementação

- [x] 3.1 Implementar no sentinela Oracle a detecção de expiração (sinais da medição) e a publicação do estado e do último pulso via `GM_setValue`. Verificar em teste com `document`/`location` simulados: sinal de expirada publica `expired`, página normal não, e nada além do previsto é lido.
- [x] 3.2 Implementar o pulso ativo escolhido na medição, respeitando `decidirPulsoAtivo`, sem navegar, recarregar, enviar formulários nem ler dados. Verificar em teste com `fetch`/DOM simulados: um pulso por intervalo, nenhum com a opção desligada ou expirada, falha registrada sem repetição agressiva.
- [x] 3.3 Em `80-painel.js` e `00-core.js`, adicionar a opção "Manter Oracle ativa" (persistida em `fpw.oracleKeepalive`, padrão desligada), o indicador do último pulso, o estado `expired` com aviso único e o registro de log. Verificar em `tests/panel-status.test.js` e `tests/log.test.js`: opção persiste e é propagada, estados exibidos, aviso e log uma vez por expiração, execução em andamento intacta.

## 4. Documentação e validação

- [x] 4.1 Atualizar `AGENT.md` (reinstalação do userscript e leitura do diagnóstico), `SSD.md`, `PAGE_STRUCTURE.md` e `ROADMAP.md`. Verificar com `Select-String -Pattern 'Manter Oracle' AGENT.md SSD.md ROADMAP.md`.
- [x] 4.2 Rodar `node --test` completo e `openspec validate oracle-active-keepalive --strict`, sem falhas.
- [ ] 4.3 Validação de runtime em `test`: com a opção ligada, aba Oracle aberta e MyWay ocioso por mais que o timeout medido, registrar período e resultado (sessão mantida ou perdida); depois com a opção desligada, confirmar que não há pulsos. Registrar no `ROADMAP.md`. Não executar Ajuste.
