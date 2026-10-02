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

- Form: `form[name="yourform"]`, method `POST`, action `justuser_corpo.asp`, target `mainFrame`.
- Employee selector: `select#lstNome[name="lstNome"]`.
- Selector change runs `verificaAlteracao(...)`, then updates employee fields and calls `AtualizaFuncionario()`; that function can submit `Exibir` to `mainFrame`.
- The header also contains the filter controls, mark-display radio options, and links for adjustment workflows.
- The FolhaFacil panel is injected into this frame by the userscript as `#painel-simples`.

## Body (`mainFrame`)

- Form: `form[name="myForm"]`, method `POST`, action `justuser_corpo.asp`.
- Contains the dynamic time-sheet table and per-day controls. Select IDs follow a `lstNome` plus numeric suffix pattern in the observed page.
- The visible column headings describe two marks, irregularity, justification, justification flag, missing hours, selection, and status.
- `input[name="hidTotRegs"]` is present as a row-count field. Selection controls use names beginning with `Selecionado`.
- Table rows, inputs, and selects vary with the selected employee and period. Never use observed row/control counts as selectors or assume every selection has the same shape.

## Footer (`bottomFrame`)

- Contains summary fields and the `btnAprovar` / `btnGravar` controls.
- These are write actions. Do not click them during structural inspection or read-only navigation tests.

## Navigation and wait strategy

1. Resolve `window.top.frames[0]` and `window.top.frames[1]` at the moment of use.
2. To inspect a loaded body, wait until frame `1` has the expected `justuser_corpo.asp` path, `document.readyState === "complete"`, and `form[name="myForm"]` exists. Use a bounded poll; a fixed row count is not a readiness condition.
3. Changing `topFrame.document.querySelector('#lstNome')` reloads/updates the body through the form target `mainFrame`; the header normally remains in place.
4. Before changing the employee selector, require zero checked controls matching `input[name^="Selecionado"]`. The page can show a confirmation to abandon changes when records are selected. Never auto-accept that confirmation.
5. Read only structural metadata for diagnostics. Do not inspect or persist field values from the body/footer.

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
| `Ajuste Jornada Plan.` | `/WebPontoDotNet/Justificativa/TrocarHorario.aspx` | ASP.NET Web Forms `form#form1`; period/date selector `#rpnPeriodo_ddlDatas`; submit actions `btnGravar` and `btnCancelar`. |
| `Recup.Marcação` | `/WebPontoDotNet/Justificativa/RecuperaMarcacao.aspx` | ASP.NET Web Forms `form#form1`; date control `#dteDataJornada_I`, `btnExibir`, grid controls with `grdMarcacoes$ctlNN` names, and action controls `btnInserirMarcacao`, `btnConfirma`, `btnCancela`. Popup/editor control prefixes include `ppcNovaMarcacao`, `ppcDesconsideraMotivo`, and `ppcEditHora`. Treat grid/edit/confirm controls as potentially write-capable. |

The `SelecionadoN` checkboxes in `mainFrame` are internal dirty flags, not row selectors; their click handler immediately unchecks them. Use the `radConfirma` radio to set the current row context for `Marcações`. Before changing employees, require all `SelecionadoN` flags to be clear.

## Header filters and other links

- Radio group `input[name="lstMarcacao"]` has four marking filters: all, irregular, unjustified, and unapproved. Changing a filter can update the body; re-resolve frame `1` and wait for its form after navigation.
- `Filtrar Nome` calls `FiltraNome()`. The hierarchy and scale filters use read-only text fields plus picker buttons and `Filtrar` actions.
- The employee-filter checkbox is `input[name="ChkNaoAprovadas"]`; its click handler calls `RecarregaFuncs()`.
- `Estatísticas` calls `Get()`. Its behavior was not exercised in this inspection.

## Inspection outcome

On 2026-10-01, the menu routes for all five auxiliary actions above loaded. For `Marcações`, an ordinary marked row produced a no-option message; selecting a row with an absent/asterisk mark opened the edit form. The `Incluir`, `Intervalo`, planned-schedule, and recovery forms were inspected structurally only. No save/approval/confirmation action was submitted. At the end, the temporary row radio was cleared, all dirty flags were clear, and the header's selected-mark context fields were empty.