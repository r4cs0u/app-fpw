# Proposal

## Why

Na branch `test`, o sentinela da sessão Oracle gravava a chave persistente `fpw_oracle_estado = 'expired'` sem nenhum mecanismo de limpeza ou recuperação automática, fazendo com que um falso positivo ou redirecionamento temporário travasse o status em "expirada" indefinidamente e bloqueasse o keepalive ativo, além de disparar alarmes invasivos no painel do MyWay mesmo após o usuário abrir e autenticar o sistema.

Esta mudança corrige o ciclo de vida e recuperação do estado de sessão Oracle, tornando a detecção de expiração estrita e resiliente, limpando estados obsoletos ao reautenticar/carregar páginas válidas e ajustando a tolerância e sinalização para evitar falsos alarmes de inatividade decorrentes de abas em segundo plano no navegador.

## What Changes

- **Limpeza e recuperação de estado**: O sentinela na origem Oracle e o monitor no MyWay passam a limpar `fpw_oracle_estado` quando detectam página autenticada válida (ex.: `FuseWelcome`), permitindo recuperação imediata do status de "expired" para "active".
- **Critérios estritos de detecção de expiração**: Substituição da busca genérica por texto no `document.body.innerText` por verificação estrita de URL de autenticação/login no frame principal e/ou respostas explícitas de redirecionamento em pulsos ativos, evitando falsos positivos causados por textos secundários.
- **Retomada de pulso ativo**: Ao transicionar de volta para estado autenticado, o agendamento de pulsos ativos é reabilitado sem exigir intervenção manual.
- **Tolerância a throttling em segundo plano**: Ajuste da janela de tolerância de inatividade de 90s para acomodar o throttling padrão do Chrome em abas em segundo plano, ou utilização de listeners reativos (`GM_addValueChangeListener`) para registrar atividade sem falso alarme de inatividade.
- **Sinalização limpa no painel**: Eliminação de mensagens de erro intrusivas no carregamento inicial; apresentação de status apenas quando houver evidência confirmada e recuperação visual limpa sem necessidade de reload.

## Capabilities

### New Capabilities
<!-- Nenhuma nova capability -->

### Modified Capabilities
- `session-liveness`: Atualiza os requisitos de acompanhamento de sessão Oracle para incluir recuperação automática de estado expirado (`expired` -> `active`), critérios de expiração estritos e tolerância ao gerenciamento de energia/segundo plano do navegador.

## Impact

- **Código afetado**: `99-main.user.js` (sentinela Oracle), `00-core.js` (avaliação de estado, monitor Oracle), `80-painel.js` (exibição de status/avisos), e testes associados (`tests/sessao-oracle.test.js`, `tests/panel-status.test.js`, `tests/modules.test.js`).
- **Compatibilidade**: Totalmente retrocompatível com a execução de automação FolhaFácil; a comunicação continua via storage GM (`GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`).
