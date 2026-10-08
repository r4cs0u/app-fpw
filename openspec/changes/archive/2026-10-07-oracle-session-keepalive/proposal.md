## Why

O keepalive atual faz apenas um `GET` na própria página do WebPonto a cada 2 minutos. Segundo o responsável, a sessão do MyWay depende de uma página Oracle (domínio `https://elny.fa.la1.oraclecloud.com/`) que precisa continuar aberta e ativa: quando ela cai, a sessão do MyWay cai junto, e o keepalive atual não cobre essa dependência. O resultado é perder a sessão no meio de uma Análise ou de um Ajuste sem aviso. É o item H da fila de melhorias de 2026-10-07.

## What Changes

- Investigar, de forma somente leitura e via MCP, como a página Oracle sustenta a sessão do MyWay, quais requisições ou sinais indicam que ela está ativa e o que acontece quando é fechada ou expira; registrar o achado na documentação da página.
- Com base na investigação, fazer o userscript acompanhar a sessão Oracle: mostrar no painel se ela está ativa, inativa ou desconhecida e avisar de forma visível, com registro no log, quando ela deixar de estar ativa.
- Manter a sessão Oracle ativa por meios que não alteram dados nem navegam, enquanto a página Oracle estiver aberta, se a investigação mostrar que isso é viável.
- Manter o keepalive atual da página do WebPonto, inclusive a pausa durante automações.
- A abordagem de implementação (por exemplo, o userscript também rodando na aba Oracle e sinalizando o estado à aba do MyWay) só é fixada depois da investigação; as tarefas de implementação serão detalhadas com `/openspec-update-change` ao final da investigação.

## Capabilities

### New Capabilities

### Modified Capabilities
- `session-liveness`: acrescenta o acompanhamento da sessão Oracle (estado visível, aviso de perda, resultado observável) e a manutenção não destrutiva dessa sessão, sem alterar os requisitos do heartbeat atual do WebPonto.

## Impact

- Código: `00-core.js` (keepalive e estado da sessão), `80-painel.js` (indicador e aviso), `99-main.user.js` (cabeçalho do userscript: `@match` adicional para o domínio Oracle e permissões de armazenamento compartilhado entre abas, se a abordagem exigir), possível novo módulo para a parte executada na página Oracle.
- Testes: lógica de estado (ativa, inativa, desconhecida, transições, aviso uma única vez) como função pura em testes automatizados; a parte de página é validada em runtime.
- Docs: `PAGE_STRUCTURE.md` (contrato observado da página Oracle, sem identificadores, tokens ou URLs completas com parâmetros), `AGENT.md` se mudar procedimentos de sessão, `SSD.md` e `ROADMAP.md`.
- Segurança: o código que rodar no domínio Oracle fica restrito a sinalizar e manter a sessão; não lê nem grava dados de funcionários e não interage com formulários.
- Dependência de ordem: depois da extração da Fase 4 na fila.
