## Why

A change `oracle-session-keepalive` entregou um sentinela e um monitor: o userscript mostra se a aba Oracle está aberta e avisa quando ela some, mas **não impede que a sessão Oracle caia** (o pulso é só um carimbo em `GM_setValue`, sem nenhuma atividade contra o servidor Oracle). O objetivo real do responsável é evitar a queda, porque quando a sessão Oracle expira o MyWay desconecta no meio de uma Análise ou de um Ajuste. Hoje não se sabe qual é o tempo de inatividade real do Oracle nem o que o renova, então qualquer keepalive ativo seria especulação. Esta change mede primeiro e depois implementa a manutenção ativa.

## What Changes

- Medir, de forma somente leitura, o que expira a sessão Oracle: tempo de inatividade, o que conta como atividade (requisição ao servidor, interação do usuário ou ambos), se há aviso de expiração na página e como é o estado "expirada". O sentinela ganha um modo de diagnóstico passivo que registra esses eventos, para a medição não depender só do MCP (que expirou nas tentativas anteriores).
- Detectar na própria aba Oracle o estado de **expirada** (redirecionamento para login ou aviso de expiração), distinto de "aba fechada", e sinalizá-lo à aba do MyWay.
- Implementar um keepalive ativo na aba Oracle, escolhido a partir da medição, que renove a sessão sem navegar, sem recarregar, sem enviar formulários e sem alterar dados; mantido enquanto a aba estiver aberta e a opção ativada.
- Tornar o keepalive ativo controlado pelo usuário no painel (ligar/desligar, preferência persistida) e limitado: para ao detectar expiração e **nunca** tenta autenticar de novo.
- Mostrar no painel o resultado do último pulso ativo (sucesso, falha, quando) e registrar falhas no log, sem apresentar isso como prova de sessão válida.
- Manter o keepalive do WebPonto e o monitor atuais.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-liveness`: acrescenta a medição/diagnóstico da inatividade Oracle, o estado expirado, o keepalive ativo opcional e limitado, e o resultado observável do último pulso ativo.

## Impact

- Código: `99-main.user.js` (modo sentinela Oracle: diagnóstico, pulso ativo, detecção de expiração; possivelmente `@connect`/`@grant` adicionais, o que exige reinstalar o userscript), `00-core.js` (`AF.sessao`: novo estado `expired`, política do pulso ativo como função pura), `80-painel.js` (opção e indicador).
- Testes: política de pulso e transições de estado como funções puras; detecção de expiração com `document`/`location` simulados; a eficácia real é validada em runtime.
- Docs: `PAGE_STRUCTURE.md` (resultado da medição, sem identificadores, tokens ou URLs completas), `AGENT.md`, `SSD.md`, `ROADMAP.md`.
- Segurança e política: manter a sessão ativa contorna um controle de inatividade da empresa; por isso é opcional, limitado, restrito à sessão do próprio usuário na própria aba e sem reautenticação automática. Convém o responsável confirmar que a prática é aceitável.
- Ordem: depende de `oracle-session-keepalive` (arquivar antes, para a spec principal conter os requisitos Oracle).
