## Context

`oracle-session-keepalive` entregou: sentinela na aba Oracle (`99-main.user.js`, pulso `GM_setValue('fpw_oracle_liveness')` a cada 30 s), monitor no MyWay (`AF.sessao.avaliarEstadoOracle`, janela de 90 s, badge e aviso). Esse conjunto detecta aba fechada, mas não renova nada no servidor Oracle. O keepalive do WebPonto (`GET` a cada 2 min) cobre só o MyWay. A página Oracle é Oracle Fusion Cloud (ADF), em `https://elny.fa.la1.oraclecloud.com/fscmUI/faces/...` (ver `PAGE_STRUCTURE.md`); `iframe` e requisição direta do MyWay já foram descartados ali. Uma tentativa de inspecionar a aba Oracle via MCP expirou, então a causa da última desconexão e o timeout real continuam desconhecidos. O código na origem Oracle hoje é mínimo e não lê dados de negócio; esta change preserva esse limite.

## Goals / Non-Goals

**Goals:**
- Descobrir, com evidência, o que expira a sessão Oracle e em quanto tempo.
- Evitar a queda enquanto a aba Oracle estiver aberta, por meio não destrutivo, opcional e limitado.
- Distinguir sessão expirada de aba fechada e explicar a queda quando ocorrer (diagnóstico).

**Non-Goals:**
- Não autenticar, preencher credenciais nem recarregar a página para recuperar sessão.
- Não abrir a página Oracle automaticamente.
- Não ler nem gravar dados de funcionário, justificativa ou ponto na origem Oracle.
- Não prometer sessão infinita: pode existir um limite absoluto de sessão do Oracle que nenhum pulso contorna.

## Decisions

**1. Medir antes de escolher o pulso.**
Primeiro grupo de tarefas é observação: (a) modo de diagnóstico passivo no sentinela, que grava em `GM_setValue` (e no console) o instante de abertura, o último evento de atividade visto (movimento, tecla, requisições ADF observáveis) e o momento em que o estado vira "expirada"; (b) leitura via MCP, quando funcionar, de requisições periódicas da própria página e de eventuais avisos de expiração. O diagnóstico existe porque o MCP já falhou nesta investigação; ele permite medir deixando a máquina ociosa e lendo o registro depois. Os resultados vão para `PAGE_STRUCTURE.md`, sem identificadores nem tokens, e fixam o intervalo e o tipo de pulso.

**2. Candidatos a pulso, em ordem de preferência (a medição escolhe).**
(a) Requisição same-origin a partir da aba Oracle (`fetch` com credenciais da própria página) a um recurso inócuo, de leitura, se o servidor tratar como atividade e renovar a sessão; é a opção que mais se aproxima do uso normal e não depende de eventos de UI. (b) Eventos sintéticos de atividade do usuário na aba (por exemplo, movimento de ponteiro) se o temporizador de inatividade for do lado do cliente. (c) Acionar o mecanismo de renovação da própria página, se a medição mostrar que existe um (por exemplo, o diálogo de "continuar conectado"), apenas clicando em confirmação de manutenção, nunca em login. Descartar (b) e (c) se não reiniciarem o contador observado. Se nenhum funcionar, a capacidade vira "diagnóstico + aviso" e o limite fica registrado.

**3. Política do pulso como função pura.**
`AF.sessao.decidirPulsoAtivo({ ativo, estado, agora, ultimoPulso, intervalo })` devolve se deve pulsar, aguardar ou parar, com constantes nomeadas e documentadas (intervalo = fração segura do timeout medido, nunca o próprio timeout). Para quando o estado é `expired`. A parte de efeito (rede/DOM) fica numa camada fina testada com `document`/`fetch` simulados.

**4. Estado `expired` no monitor.**
`avaliarEstadoOracle` ganha o estado `expired`, sinalizado pelo sentinela por `GM_setValue('fpw_oracle_estado')`. Detecção do lado Oracle por sinais observados na medição (redirecionamento para login, aviso de expiração na página), preferindo seletor estrutural estável; sem esses sinais não declara expirada. Aba fechada continua `inactive`. Aviso e log uma vez por expiração, reaproveitando o fluxo do aviso de perda.

**5. Controle do usuário.**
Opção "Manter Oracle ativa" no painel, persistida (`fpw.oracleKeepalive`), propagada ao sentinela por `GM_setValue`/`GM_addValueChangeListener`. Padrão: desligada até a validação de runtime; depois de validada, o padrão pode virar ligada por decisão do responsável. O pulso para na expiração e não reautentica. Justificativa: manter uma sessão ativa contorna um controle de segurança de inatividade; deve ser consciente, auditável (último pulso visível) e só na sessão do próprio usuário.

**6. Resultado do pulso observável.**
O sentinela publica `{ quando, ok, status }` do último pulso; o painel mostra e o log registra falhas. Sucesso não é prova de sessão válida (consistente com os requisitos já existentes).

**7. Permissões.**
Se o pulso for `fetch` na própria página, não exige `@connect` novo. Se precisar de `GM_xmlhttpRequest` para o domínio Oracle, adiciona-se `@connect elny.fa.la1.oraclecloud.com`. Qualquer mudança no cabeçalho exige reinstalar o userscript (procedimento já em `AGENT.md`).

## Risks / Trade-offs

- [Timeout absoluto do Oracle ou política que invalida a sessão independentemente de atividade] → a medição o revela; se existir, a capacidade fica em diagnóstico e aviso, com o limite documentado.
- [Pulso ativo é tratado pelo Oracle como atividade suspeita ou sobrecarrega] → recurso inócuo, intervalo longo (minutos), falha registrada e sem repetição agressiva.
- [Políticas da empresa sobre sessão ociosa] → opcional, desligado por padrão até validação, sem reautenticação; pedir confirmação do responsável.
- [Falso "expirada" por seletor frágil] → só declara expirada com sinal observado e estável; na dúvida mantém o estado anterior ou `unknown`.
- [Throttling da aba Oracle em segundo plano atrasa pulsos] → o intervalo escolhido fica bem abaixo do timeout medido e o diagnóstico registra a cadência real.
- [MCP instável] → diagnóstico passivo permite medir sem MCP.

## Migration Plan

Só na branch `test`. Antes de implementar o pulso: concluir a medição e atualizar a change (`/openspec-update-change`) com o tipo e o intervalo definidos. Reverter: desligar a opção ou remover o pulso e o diagnóstico do sentinela; o monitor passivo e o keepalive do WebPonto permanecem. Arquivar `oracle-session-keepalive` antes, para a spec principal conter os requisitos Oracle.

## Open Questions

- Qual é o timeout real de inatividade e existe um limite absoluto de sessão? (resolvido pela medição)
- Qual ação o Oracle conta como atividade: requisição, interação ou ambas? (resolvido pela medição)
- O responsável aceita o padrão desligado até a validação? (assumido: sim)
