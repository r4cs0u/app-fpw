# Design

## Context

A arquitetura do acompanhamento de sessão Oracle opera através de comunicação assíncrona entre origens distintas via Tampermonkey (`GM_setValue`, `GM_getValue`). Na aba do Oracle (`elny.fa.la1.oraclecloud.com`), o script executa apenas a rotina sentinela que emite pulsos de vida (`fpw_oracle_liveness`) e pulsos ativos de leitura HEAD (`fpw_oracle_ultimo_pulso_ts`), reportando anomalias em `fpw_oracle_estado`. Na aba do MyWay, o painel lê essas variáveis e indica se a sessão de apoio está ativa ou expirada.

Veja `proposal.md` para a motivação detalhada dos problemas observados em produção e teste.

## Goals / Non-Goals

**Goals:**
- Ciclo de vida recuperável: garantir que `fpw_oracle_estado` retorne a `active`/`null` automaticamente assim que o usuário navegar em uma tela autenticada do Oracle.
- Detecção estrita de expiração: restringir a detecção de expiração a redirecionamentos reais de autenticação ou falhas 401/403/redirecionamento do pulso ativo, eliminando inspeção ampla de texto no DOM.
- Resiliência a abas em segundo plano: estender a janela de liveness para 180 segundos a fim de absorver o throttling de temporizadores do Chrome sem gerar falsos avisos de "inativa".
- Retomada imediata do keepalive ativo: permitir que o pulso ativo volte a ser disparado assim que o estado expirado for desfeito.

**Non-Goals:**
- Não automatizar login, preenchimento de credenciais ou reload forçado da página Oracle.
- Não bloquear nem alterar as automações em andamento no MyWay caso ocorra inatividade na aba Oracle.

## Decisions

### 1. Detecção estrita de expiração no Oracle
- **Decisão**: Avaliar expiração com base em:
  1. A URL do topo (`window.top.location.pathname`) apontar para provedores de SSO/autenticação da Oracle (ex.: `/oam/`, `/oamsso/`, `/idp/`, `/auth/login`).
  2. O resultado do fetch do pulso ativo retornar `redirected` para login ou status HTTP 401/403.
- **Alternativa rejeitada**: Varrer `document.body.innerText` procurando strings como "sessão expirou". A varredura em texto livre causa falsos positivos em páginas que possuem rótulos internos, históricos de log ou modais em templates ADF.

### 2. Auto-recuperação de estado e limpeza de flags
- **Decisão**: Toda vez que o sentinela executar `emitirPulso()` ou detectar navegação em páginas do ERP reconhecidas (ex.: pathname contendo `/faces/` ou `/fscmUI/`), verificar se `fpw_oracle_estado === 'expired'`. Em caso positivo, limpar a chave (`GM_setValue('fpw_oracle_estado', 'active')`) e registrar evento de recuperação no log de diagnóstico.
- **Alternativa rejeitada**: Exigir ação manual no painel do MyWay para destravar o estado de expiração. A recuperação automática é transparente e reflete o login real feito pelo usuário no Oracle.

### 3. Ampliação da janela de inatividade para 180s
- **Decisão**: Elevar `JANELA_EXPIRACAO_ORACLE_MS` em `00-core.js` de 90s para 180s. Como o pulso é emitido a cada 30s e abas em background no Chrome podem sofrer atraso de timers de até 1 minuto, uma janela de 180s oferece margem suficiente para evitar o estado oscilante de "inativa".

### 4. Transição visual suave no painel
- **Decisão**: O aviso de sessão inativa/expirada no painel (`80-painel.js`) deve ser recolhido de forma limpa quando o estado voltar a `active`. Se a página do MyWay acabou de ser aberta e ainda não decorreu o tempo de leitura ou o estado for desconhecido (`unknown`), nenhum aviso vermelho/laranja deve ser exibido.

## Risks / Trade-offs

- **[Risco]** Modal de expiração do Oracle ADF aparecer na tela sem alterar a URL do navegador.
  - *Mitigação*: Caso ocorra, o próximo pulso ativo via `fetch` detectará a rejeição da sessão ou a expiração será confirmada no momento em que o usuário clicar em qualquer link (que redirecionará para o SSO).
- **[Risco]** Janela de 180s demorar mais para avisar que a aba foi fechada.
  - *Mitigação*: Trade-off aceitável, pois evitar falsos alarmes é prioridade crítica para a usabilidade do usuário em produção e teste.

## Migration Plan

1. Implementar e validar as mudanças na branch `test`.
2. Executar suíte de testes unitários (`node --test`) cobrindo cenários de recuperação, detecção estrita e tolerância a background.
3. Validar no navegador com a extensão Tampermonkey e ferramenta DevTools MCP.
