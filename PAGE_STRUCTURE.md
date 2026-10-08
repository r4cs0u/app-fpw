# WebPonto Page Structure (AI Reference)

## Scope and privacy

This file records page structure and automation behavior only. Do not add employee names, registration numbers, selected values, or time-sheet contents. The page data is private and changes by employee and period.

## Page map

Entry page: `/WebPonto/just_user/justuser.asp`

The page is a frameset. Resolve frames from the current `window.top` each time; do not retain a frame `Document` across navigation.

| Index | Frame name | Document path | Role |
| --- | --- | --- | --- |
| `0` | `topFrame` | `/WebPonto/just_user/justuser_cabec.asp` | Header, employee selection, filters, navigation links |
| `1` | `mainFrame` | `/WebPonto/just_user/justuser_corpo.asp` | Dynamic time-sheet body |
| `2` | `bottomFrame` | `/WebPonto/just_user/justuser_rodape.asp` | Summary and action controls |

The header and footer use body class `Painel`; the body document uses body class `Tudo`. The parent page title includes the selected period. Frame URLs can initially differ while the page is loading.

## Header (`topFrame`)

- Form: `form[name="yourform"]`, method `POST`. Its action and target vary across observed page states; examples include `justuser_cabec.asp` with no target and `justuser_corpo.asp` targeting `mainFrame`. They are not routing invariants.
- Employee selector: `select#lstNome[name="lstNome"]`.
- Employee options vary by user and may differ in names, IDs, count, and order. Use the options in the current session; never hardcode an employee or assume another user's list.
- Selector change runs `verificaAlteracao(...)`, then updates employee fields and calls `AtualizaFuncionario()`. Preserve this existing header behavior; do not infer the body destination from the form's static action or target. Confirm navigation from the observed `mainFrame` transition and its loaded structure.
- The header also contains the filter controls, mark-display radio options, and links for adjustment workflows.
- The FolhaFacil panel is injected into this frame by the userscript as `#painel-simples`.

## Body (`mainFrame`)

- Form: `form[name="myForm"]`, method `POST`, action `justuser_corpo.asp`.
- Contains the dynamic time-sheet table and per-day controls. Select IDs follow a `lstNome` plus numeric suffix pattern in the observed page.
- The visible column headings describe two marks, irregularity, justification, justification flag, missing hours, selection, and status.
- `input[name="hidTotRegs"]` is present as a row-count field. Selection controls use names beginning with `Selecionado`.
- Table rows, inputs, and selects vary with the selected employee and period. Never use observed row/control counts as selectors or assume every selection has the same shape.
- A day with no row on the page does not by itself identify a folga; non-rendered days may be ordinary worked days. Only dates confirmed as non-worked by schedule or calendar (such as hidden Sundays or supported holidays) can be treated as non-worked origins.

### Day rows and marks (observed 2026-10-05, read-only, three sheets)

- Each day is a day-heading `<tr>` followed by one or more mark rows. The heading holds the date (`DD/MM/YYYY` plus weekday), the planned schedule (`Horário: HH:MM às HH:MM (...)`, or `Horário: Folga` / `Horário: Feriado`), a code token, and optional markers in `<b>`. The marker `[Interjornada]` appears in the heading, never in the mark rows.
- Each mark row carries fields suffixed by a global row index `N` (not a per-day index): `Marc1N` (left mark), `Marc2N` (right mark), `IrreN` (irregularity text), `lstNomeN` (justification select), `CodJustN` (justification code) and `HorasInfN` (informed hours). Read marks from the field `value`, never from the row `innerText`.
- `innerText` of a mark row includes the text of every `<option>` of its justification select (one option mentions interjornada), so row text is not evidence of an irregularity.
- A mark value is `HH:MM` plus a one-character suffix. Observed origins: no suffix (a trailing space) is the time clock, `M` is the mobile app, `W` is the web, and `*` is a manual entry. Only `*` entries are treated as manually typed.
- A day can have one to four (or more) rows. Rows are usually chained: `Marc1` of a row repeats `Marc2` of the previous row (a split of the shift, not a new mark). A final row can also be independent (both marks present, not chained) or orphan (only `Marc1`, usually with `Hora Extra Irregular`).
- Day entry is the left mark of the first row. Day exit is the right mark of the last row that has a right mark. An orphan last row with an empty right mark does not remove the exit of the previous rows.
- Observed `IrreN` values: blank, `Hora Extra`, `Hora Extra Irregular`, `s/marc de entrada/saída`, `Ausência de Marcação` and `Saída Antecipada`. Days with `Ausência de Marcação` have empty `Marc1N`/`Marc2N` and are often justified as a folga (code 48). Accents in these texts must be handled by normalizing before comparing.
- Rows from the transition week of the next month are also rendered; counts for the target month must filter by the date of the day heading.

## Footer (`bottomFrame`)

- Contains summary fields and the `btnAprovar` / `btnGravar` controls.
- These are write actions. Do not click them during structural inspection or read-only navigation tests.

## Navigation and wait strategy

1. Resolve `window.top.frames[0]` and `window.top.frames[1]` at the moment of use.
2. At adjustment startup, a blank employee selector may begin with `mainFrame` on a complete `/WebPonto/blank.htm` document. Permit only that exact empty-selection state, with the supported header/footer and no checked `input[name^="Selecionado"]` controls. Arm body-transition observation, select the first non-empty employee through the existing header functions, and require the loaded supported body before processing. Do not require static `yourform.action` or `yourform.target` values to identify `mainFrame`; the observed transition and loaded body are the routing evidence. A blank body after a non-empty employee is selected remains an error.
3. For adjustment saves and subsequent employee changes, capture the current body document/load generation and arm observation before the action. Completion requires evidence of a post-action frame load or a changed current document, followed by the supported body path, `document.readyState === "complete"`, body class `Tudo`, and `form[name="myForm"]` (POST to `justuser_corpo.asp`). Poll within a named safety deadline; the deadline is not an assumed FPW response time.
4. A transient loading state can complete between polls. A new structurally ready document or recorded frame-load generation establishes the transition even if the loading state was not observed. The same old ready document and elapsed time alone do not establish completion. An empty sheet is supported when this body structure is ready; no row/input count is required.
5. Employee changes use the existing header functions and can update/reload the body while the header remains in place. Do not assume a fixed employee option list or infer body routing from the form's static target; observe the `mainFrame` transition.
6. Before changing the employee selector, require zero checked controls matching `input[name^="Selecionado"]`. The page can show a confirmation to abandon changes when records are selected. Never auto-accept that confirmation.
7. Read only structural metadata for diagnostics. Do not inspect or persist field values from the body/footer.

The popup save and main-frame reload can complete in either order. Observe the body transition before submitting the popup save and retain that evidence while waiting for the popup to close. Footer completion likewise requires a supported post-save body transition. These observations confirm UI completion only; they do not prove server-side persistence. Keep compatibility stabilization delays distinct from readiness signals and maximum safety deadlines.

## Runtime note

During the 2026-10-01 structural inspection, the site frames loaded successfully, but `#painel-simples` was absent from `topFrame`. Treat this as a session-specific observation, not a page invariant; check that the userscript is installed and running in the browser being tested.

After installing userscript version `9.4`, filter behavior was verified in a dedicated MyWay tab:

- `Submit2` (`Executar`) replaced the `topFrame` document; `#painel-simples` remained visible after the new document completed.
- `Submit3` (`Exibir`) with empty filters did not replace the document; the panel remained visible.

The entrypoint now listens for `load` on `frame[name="topFrame"]` and retains the two-second panel watchdog as a fallback. The listener was added because the watchdog restored a manually removed panel in the same document but did not restore it after frame navigation in the previous version.

## Auxiliary actions

These actions open separate windows. Their forms were inspected but never submitted. Do not click `Gravar`, `Aprovar`, `btnConfirma`, or equivalent controls during read-only exploration.

| Header action | Route | Structural controls and behavior |
| --- | --- | --- |
| `Marcações` | `/WebPonto/just_user/AcertarMarcacao.asp` | Requires a selected eligible row. `input[name="radConfirma"]` selects a row; its `submitPage(index)` handler copies row context into hidden fields in `topFrame.yourform` and does not submit the form. A row is eligible when a mark is absent or contains `*`; an ordinary marked row can open an informational no-option message. Popup form is `form[name="form1"]`; `#Horario1` and `#Data1` are read-only, `#Horario2`, `#Data2`, and `select[name="cmbMotivo"]` are editable; `#txtMotivo` is read-only. Actions: `btnGravar`, `Submit2` (cancel). |
| `Incluir Marcações` | `/WebPonto/just_user/IncluirMarcacao.asp` | Popup form `form[name="form1"]`; `select[name="Data"]`, `#Horario1`, `#Horario2`, `select[name="cmbMotivo"]`, and read-only `#txtMotivo`; hidden `QtdMarc`. Actions: `button` (save) and `Submit2` (cancel). |
| `Intervalo` | `/WebPontoDotNet/Justificativa/LancamentoIntervalo.aspx` | ASP.NET Web Forms `form#form1` with standard view-state hidden fields; `#txtData_I` is read-only; radio group `rblTipoLancamento`; submit action `btnGravar`. |
| `Ajuste Jornada Plan.` | `/WebPontoDotNet/Justificativa/TrocarHorario.aspx` | The popup may initially be `about:blank` (whose pathname can be `blank`) before redirecting through `/RedirecionamentoAspx.asp`; these are transient states. Wait for the final supported route and ASP.NET Web Forms `form#form1`, period/date selector `#rpnPeriodo_ddlDatas`, and submit actions `btnGravar` / `btnCancelar` before editing. |
| `Recup.Marcação` | `/WebPontoDotNet/Justificativa/RecuperaMarcacao.aspx` | ASP.NET Web Forms `form#form1`; date control `#dteDataJornada_I`, `btnExibir`, grid controls with `grdMarcacoes$ctlNN` names, and action controls `btnInserirMarcacao`, `btnConfirma`, `btnCancela`. Popup/editor control prefixes include `ppcNovaMarcacao`, `ppcDesconsideraMotivo`, and `ppcEditHora`. Treat grid/edit/confirm controls as potentially write-capable. |

### Reported popup save messages and outcomes

The following outcomes were reported during user testing; they are behavioral observations, not proof of server-side persistence:

| Popup message | Reported meaning after acknowledging `OK` | Required interpretation |
| --- | --- | --- |
| `Dias selecionados possuem horários iguais!` | No schedule change is applied. The popup may remain open for another request or close; a main-frame refresh was also reported. | Rejection / no change, even if the popup closes or the main frame reloads. Never count closure plus reload alone as success. |
| `Alteração realizada com sucesso!` | The popup closes and the time-sheet frame reloads with the change. | Positive UI confirmation. Record the message and the supported body transition; this still does not prove server-side persistence. |

The implementation checks for the visible `#ppcMsg_btnMsgErro_CD` acknowledgement control and reads the popup's visible body text before acknowledging it; it does not assume a fixed message-container location. It recognizes only the two reported messages above. A recognized rejection is no change even if acknowledging it closes the popup or reloads the body. A recognized success requires both the message and a supported body transition plus popup closure. If no recognized outcome text is captured, stop as unconfirmed rather than inferring success from popup closure or reload. The acknowledgement control and body-text source still need runtime verification in MyWay.

The `SelecionadoN` checkboxes in `mainFrame` are internal dirty flags, not row selectors; their click handler immediately unchecks them. Use the `radConfirma` radio to set the current row context for `Marcações`. Before changing employees, require all `SelecionadoN` flags to be clear.

## Header filters and other links

- Radio group `input[name="lstMarcacao"]` has four marking filters: all, irregular, unjustified, and unapproved. Changing a filter can update the body; re-resolve frame `1` and wait for its form after navigation.
- `Filtrar Nome` calls `FiltraNome()`. The hierarchy and scale filters use read-only text fields plus picker buttons and `Filtrar` actions.
- The employee-filter checkbox is `input[name="ChkNaoAprovadas"]`; its click handler calls `RecarregaFuncs()`.
- `Estatísticas` calls `Get()`. Its behavior was not exercised in this inspection.

## Inspection outcome

On 2026-10-01, the menu routes for all five auxiliary actions above loaded. For `Marcações`, an ordinary marked row produced a no-option message; selecting a row with an absent/asterisk mark opened the edit form. The `Incluir`, `Intervalo`, planned-schedule, and recovery forms were inspected structurally only. No save/approval/confirmation action was submitted. At the end, the temporary row radio was cleared, all dirty flags were clear, and the header's selected-mark context fields were empty.

## Structural preconditions and stop behavior

The automation verifies structural contracts before starting adjustments and before write-sensitive actions:

1. **Required base structure (startup and employee loop)**:
   - Top-level entry page path: ends with `/WebPonto/just_user/justuser.asp`.
   - Frame 0 (`topFrame`): path ends with `/WebPonto/just_user/justuser_cabec.asp`, `readyState === 'complete'`, body class `Painel`, form `yourform` (POST, action `justuser_corpo.asp`, target `mainFrame`), employee selector `select#lstNome[name="lstNome"]`.
   - Frame 1 (`mainFrame`): path ends with `/WebPonto/just_user/justuser_corpo.asp`, `readyState === 'complete'`, body class `Tudo`, form `myForm` (POST, action `justuser_corpo.asp`).
   - Frame 2 (`bottomFrame`): path ends with `/WebPonto/just_user/justuser_rodape.asp`, `readyState === 'complete'`, body class `Painel`, action control `btnGravar`.

2. **Required popup structure (Ajuste Jornada Plan. edits and saves)**:
   - Path ends with `/WebPontoDotNet/Justificativa/TrocarHorario.aspx`, `readyState === 'complete'`.
   - Form `form#form1`, date selector `#rpnPeriodo_ddlDatas`, and save button `input[name="btnGravar"]`.

3. **Stop behavior**:
   - If any required frame, form, or control is absent or fails the contract, the batch stops immediately (`AF.estado.falhaPrecondicao = true`, `AF.estado.cancelado = true`).
   - A visible diagnostic error is logged and reflected in the panel status.
   - The batch does not advance automatically to the next employee.

## Página Oracle (observada em 2026-10-07 via MCP)

- **Origem e rota**: `https://elny.fa.la1.oraclecloud.com/fscmUI/faces/FuseWelcome` (Oracle Fusion Cloud / Oracle ADF).
- **Scripts e framework**: utiliza biblioteca Oracle ADF (`AdfPage`, recursos em `/fscmUI/adf/` e `/fscmUI/afr/`).
- **Cookies de sessão (apenas nomes)**: `OciTrack`, `bm_sv`. Nenhum valor ou token armazenado ou exposto.
- **Diálogos de expiração**: diálogos com IDs contendo `session`, `timeout` ou `expire` surgem na árvore DOM quando a sessão expira ou avisa inatividade.
- **Conclusão para manutenção de sessão e liveness (Tarefas 1.1 e 1.2)**:
  - As origens `myway.g.globo` e `oraclecloud.com` são distintas e não compartilham armazenamento web nativo (`sessionStorage`, `localStorage`, `BroadcastChannel`).
  - O uso de `iframe` da página Oracle dentro do WebPonto é inviabilizado por políticas de cabeçalhos de segurança (frame-ancestors) e alteraria a estrutura de frames do WebPonto.
  - Requisição HTTP direta do MyWay para o Oracle via `GM_xmlhttpRequest` pode não satisfazer o ciclo de vida do Oracle ADF (que depende de estado na UI e na conexão da aba).
  - A abordagem viável e segura é a **hipótese 1 do design**: o userscript do Tampermonkey também carregar no domínio `https://elny.fa.la1.oraclecloud.com/*` em modo exclusivamente sentinela/liveness (sem automações de folha nem injeção de painel), gravando carimbos de presença periódicos via `GM_setValue`. A instância do userscript no MyWay consome esse sinal via `GM_addValueChangeListener` / `GM_getValue`, apresentando o status da sessão Oracle e avisando quando o sinal for interrompido.
- **Keepalive Ativo e Diagnóstico Passivo (oracle-active-keepalive)**:
  - Registro passivo de diagnósticos em `fpw_oracle_diag` (abertura, atividade recente, expiração) sem segredos ou tokens.
  - Detecção ativa de expiração com sinalização em `fpw_oracle_estado = 'expired'`.
  - Manutenção ativa automática: pulsos periódicos de leitura inócua (`HEAD /fscmUI/faces/...`) executados automaticamente a cada 3 minutos na própria aba Oracle aberta para manter a sessão renovada sem necessidade de intervenção do usuário, cessando se houver expiração detectada.
