# Tasks

## 1. Sentinela Oracle e ciclo de vida (`99-main.user.js`)

- [ ] 1.1 Em `99-main.user.js`, substituir a checagem ampla de `document.body.innerText` por verificação estrita de rota de login/autenticação no topo da janela (`window.top.location`) e checagem de resposta do pulso ativo (redirecionamento ou status 401/403). Verificar com testes de unidade simulando páginas com textos incidentais de sessão.
- [ ] 1.2 Em `99-main.user.js`, implementar a rotina de auto-recuperação: se a URL atual corresponder a uma tela válida autenticada do Oracle (ex.: `/faces/` ou `/fscmUI/`), redefinir `fpw_oracle_estado` de `expired` para `active` e permitir a reativação do pulso ativo. Verificar com teste cobrindo a transição de recuperação.

## 2. Monitoramento e tolerância a background (`00-core.js`)

- [ ] 2.1 Em `00-core.js`, aumentar `JANELA_EXPIRACAO_ORACLE_MS` de 90s para 180s para suportar o atraso de temporizadores em abas secundárias sem falsa transição para `inactive`. Verificar nos testes de temporizador de liveness.
- [ ] 2.2 Em `00-core.js`, atualizar `AF.sessao.avaliarEstadoOracle` para registrar transição de recuperação limpa quando o estado anterior era `expired` ou `inactive` e novo sinal ativo for recebido. Verificar em `tests/sessao-oracle.test.js`.

## 3. Painel e experiência visual (`80-painel.js`)

- [ ] 3.1 Em `80-painel.js`, assegurar que ao transicionar para `active`, qualquer aviso de sessão seja imediatamente ocultado e o badge atualizado para verde, sem persistência residual de alertas na UI. Verificar em `tests/panel-status.test.js`.
- [ ] 3.2 Garantir que o estado `unknown` não exiba tarja ou mensagem de alerta de erro, restringindo alertas visuais apenas a `expired` explicitamente confirmado. Verificar em `tests/panel-status.test.js`.

## 4. Validação e cobertura de testes

- [ ] 4.1 Atualizar a suíte de testes unitários (`tests/sessao-oracle.test.js`, `tests/panel-status.test.js`, `tests/modules.test.js`) cobrindo todos os cenários da especificação (recuperação automática, não disparo em textos secundários, tolerância a background). Verificar com `node --test`.
- [ ] 4.2 Executar validação de conformidade da proposta com `openspec validate oracle-session-recovery --strict` e confirmar ausência de erros.
