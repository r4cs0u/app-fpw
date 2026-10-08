## Context

`AF.core.iniciarKeepAlive` (`00-core.js`) executa, ao carregar e a cada 2 minutos, um `GET` na `window.location.href` do WebPonto, pulado enquanto `AF.estado.rodando`. O resultado fica em `AF.estado.keepAliveUltimoResultado`; um redirecionamento é tratado como falha. O userscript (`99-main.user.js`) só tem `@match` em `https://myway.g.globo/WebPonto/just_user/justuser.asp*`, `@grant GM_xmlhttpRequest` e `@connect raw.githubusercontent.com`, e baixa os módulos do GitHub para executá-los na página.

Informação do responsável (2026-10-07): a URL da página Oracle varia, mas sempre começa com `https://elny.fa.la1.oraclecloud.com/`; o userscript pode rodar nela; a sessão do MyWay depende dessa página aberta; a estrutura deve ser verificada via MCP quando chegar o momento. Nada além disso foi observado ainda sobre como a sessão Oracle se mantém ou expira.

Ver proposal.md e a spec `session-liveness` desta change.

## Goals / Non-Goals

**Goals:**
- Saber e mostrar se a sessão Oracle está ativa, inativa ou desconhecida, e avisar quando ela cai.
- Mantê-la ativa sem interferir em dados ou navegação, se viável.
- Isolar a decisão de estado em lógica pura e testável.

**Non-Goals:**
- Não executar Análise, Ajuste, relatório ou painel no domínio Oracle.
- Não autenticar, renovar credenciais nem abrir a página Oracle automaticamente.
- Não bloquear automaticamente uma execução quando a sessão cair (apenas avisar).
- Não alterar o keepalive do WebPonto.

## Decisions

**1. A investigação vem antes de qualquer implementação e fecha o desenho.**
O grupo 1 de tarefas é somente leitura, via MCP, sobre a página Oracle aberta pelo responsável: o que mantém a sessão (cookies, requisições periódicas, scripts da própria página), qual é um sinal confiável de "viva" e qual é o de "expirou", e se há eventos ao fechar. O resultado vai para `PAGE_STRUCTURE.md` sem identificadores nem tokens. Em seguida, `/openspec-update-change` detalha o grupo 2 e ajusta spec e design se necessário. Alternativa descartada: implementar já uma abordagem; qualquer escolha sem observação seria especulação.

**2. Hipótese preferida: o userscript também carrega na aba Oracle, em modo mínimo, e sinaliza à aba do MyWay.**
Abas de origens diferentes não compartilham `BroadcastChannel`, `localStorage` nem `sessionStorage`. O armazenamento do gerenciador de userscripts (`GM_setValue` e `GM_addValueChangeListener`) é compartilhado entre origens do mesmo script e permite a sinalização sem rede. A instância Oracle grava um carimbo de tempo periódico e, se a investigação mostrar um modo seguro, faz uma ação mínima que mantém a sessão. A instância MyWay lê o carimbo e decide o estado.

**3. Hipóteses alternativas, só se a primeira falhar na investigação.**
(a) Requisição direta à URL Oracle a partir da aba do MyWay com `GM_xmlhttpRequest` e `@connect` para o domínio Oracle: funciona sem a aba aberta, mas pode não representar a atividade que a sessão exige e exige permissão extra. (b) `iframe` oculto da página Oracle dentro do MyWay: frequentemente bloqueado por cabeçalhos de segurança e muda a estrutura de frames que o contrato da página protege. A escolha final constará na atualização do design.

**4. Estado como função pura.**
`AF.sessao.avaliarEstadoOracle(entrada)` recebe o último carimbo de liveness, o instante atual, a janela de tolerância e o estado anterior e devolve `unknown`, `active` ou `inactive` e se houve transição (para disparar o aviso uma vez por perda). Os parâmetros de janela são constantes nomeadas, provisórias e documentadas como limites de segurança, não tempos garantidos pelo Oracle, como em `esperarAjuste`.

**5. Aviso no painel e no log, sem parar execução.**
O indicador usa a barra de status do painel ou um item próprio, com cor distinta do status de execução, e o log registra um evento por perda. Alternativa: parar o Ajuste ao perder a sessão; mais invasivo e não pedido. Fica como possível evolução, se o uso mostrar necessidade.

**6. Isolamento do código no domínio Oracle.**
O ponto de entrada decide pelo `location.origin`: no domínio Oracle roda só o módulo de sinalização; no WebPonto segue o fluxo atual. Nenhum módulo de Análise, Ajuste ou painel é carregado na origem Oracle.

## Risks / Trade-offs

- [Descobrir na investigação que a sessão Oracle não pode ser mantida pelo script] → o estado e o aviso ainda entregam valor; a manutenção ativa vira não objetivo registrado.
- [`@match` adicional amplia onde o userscript executa] → o código na origem Oracle é mínimo, sem acesso a dados de funcionários, e o modo da origem é decidido antes de baixar módulos.
- [Falso "inativa" por throttling de aba em segundo plano] → a janela de tolerância considera o throttling e o estado exibe "desconhecida" quando não há evidência suficiente, em vez de afirmar queda.
- [Falso "ativa" quando a página está aberta mas a sessão expirou] → o resultado é descrito como evidência, não prova, e a validação de longa duração fica registrada antes de considerar a capacidade provada.
- [`GM_*` exigem concessões novas no cabeçalho do userscript e reinstalação] → documentar no procedimento de instalação de teste em `AGENT.md`.

## Migration Plan

Mudança só na branch `test`. Antes de implementar: concluir a investigação e atualizar a change. Para reverter: remover o `@match` e as concessões adicionais e o módulo de sinalização; o keepalive do WebPonto permanece intacto.

## Open Questions

- Qual sinal confiável indica sessão Oracle viva e qual indica expirada? (resolvido pela investigação)
- A atividade que mantém a sessão exige interação do usuário ou basta um sinal periódico? (resolvido pela investigação; pode alterar a spec do keepalive)
