(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.supervisionado = AF.supervisionado || {};

    var janelaSupervisionado = null;
    var estadoFluxo = 'ocioso'; // ocioso | confirmando | aplicando | concluido | parado | interrompido

    function escaparHTML(valor) {
        var entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caractere) {
            return entidades[caractere];
        });
    }

    AF.supervisionado.obterEstado = function () {
        return estadoFluxo;
    };

    function gerarHTMLConfirmacao(resumo, nomeEsperado) {
        var textoResumo = AF.preanalise && typeof AF.preanalise.texto === 'function'
            ? AF.preanalise.texto(resumo)
            : 'Pré-análise indisponível.';
        var podeAplicar = !resumo.vazia;

        return '<!DOCTYPE html><html lang="pt-BR" data-theme="dark"><head><meta charset="UTF-8">'
            + '<title>Ajuste Supervisionado — Confirmação</title>'
            + '<style>'
            + ':root{--bg:#0f1117;--surface:#161b22;--surface2:#0d1117;--border:rgba(255,255,255,.08);--text:#e2e8f0;--text-muted:#94a3b8;--blue:#3b82f6;--purple:#7c3aed;--red:#ef4444;--green:#22c55e}'
            + '*{box-sizing:border-box;margin:0;padding:0}'
            + 'body{background:var(--bg);color:var(--text);font-family:Arial,sans-serif;font-size:12px;padding:12px;display:flex;flex-direction:column;height:100vh;overflow:hidden}'
            + '.hdr{border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px}'
            + '.hdr-title{font-size:13px;font-weight:bold;color:#c084fc;display:flex;align-items:center;gap:6px}'
            + '.hdr-sub{font-size:11px;color:var(--text-muted);margin-top:3px}'
            + '.pre-wrap{flex:1;overflow:auto;background:#0d1117;border:1px solid var(--border);border-radius:6px;padding:10px;font-family:ui-monospace,monospace;font-size:11px;line-height:1.45;color:var(--text);white-space:pre-wrap}'
            + '.status-box{display:none;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-weight:600;font-size:11px}'
            + '.status-aplicando{display:block;background:rgba(59,130,246,.2);color:#93c5fd;border:1px solid rgba(59,130,246,.4)}'
            + '.status-concluido{display:block;background:rgba(34,197,94,.2);color:#4ade80;border:1px solid rgba(34,197,94,.4)}'
            + '.status-parado{display:block;background:rgba(249,115,22,.2);color:#fdba74;border:1px solid rgba(249,115,22,.4)}'
            + '.status-interrompido{display:block;background:rgba(239,68,68,.2);color:#fca5a5;border:1px solid rgba(239,68,68,.4)}'
            + '.actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:8px;border-top:1px solid var(--border)}'
            + '.btn{padding:6px 14px;border-radius:5px;font-size:11px;font-weight:bold;cursor:pointer;border:none;font-family:inherit}'
            + '.btn-cancel{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border)}'
            + '.btn-apply{background:#7c3aed;color:#ffffff}'
            + '.btn-apply:hover:not(:disabled){filter:brightness(1.15)}'
            + '.btn:disabled{opacity:.35;cursor:not-allowed}'
            + '</style></head><body>'
            + '<div class="hdr">'
            +   '<div class="hdr-title">⚙️ Ajuste Supervisionado — Pré-Análise</div>'
            +   '<div class="hdr-sub">Modo supervisionado ativo. Para ajustar a lista inteira, mude para Automático no painel.</div>'
            + '</div>'
            + '<div id="box-status" class="status-box"></div>'
            + '<pre id="box-conteudo" class="pre-wrap">' + escaparHTML(textoResumo) + '</pre>'
            + '<div class="actions">'
            +   '<button id="btn-cancelar" class="btn btn-cancel">Cancelar</button>'
            +   '<button id="btn-aplicar" class="btn btn-apply"' + (podeAplicar ? '' : ' disabled title="Folha sem marcações para ajustar"') + '>Aplicar nesta folha</button>'
            + '</div></body></html>';
    }

    AF.supervisionado.iniciarConfirmacao = async function () {
        var sel = AF.core ? AF.core.getSelNome() : null;
        var nomeAtual = AF.core ? AF.core.nomeAtual() : '';
        if (!sel || !nomeAtual) {
            if (AF.painel && typeof AF.painel.setStatus === 'function') {
                AF.painel.setStatus('Selecione uma folha ou mude para Automático', '#f97316');
            }
            return null;
        }

        var resumo = AF.preanalise && typeof AF.preanalise.lerFolhaAtual === 'function'
            ? AF.preanalise.lerFolhaAtual()
            : { nome: nomeAtual, vazia: false, folgas: { total: 0, dias: [] }, cod47: { total: 0, dias: [] }, irregularidades: { semES: 0, interj: 0, britanica: 0, naoPreenchida: null }, horas: { HE: '00:00', HEF: '00:00', HEC: '00:00' } };

        var win = window.open('', 'fpw-supervisionado', 'width=620,height=520,left=120,top=80,resizable=yes,scrollbars=yes');
        if (!win) {
            if (AF.painel && typeof AF.painel.setStatus === 'function') {
                AF.painel.setStatus('Popup bloqueado pelo navegador. Permita popups.', '#f87171');
            }
            return null;
        }

        janelaSupervisionado = win;
        estadoFluxo = 'confirmando';
        if (AF.estado) AF.estado.confirmacaoPendente = true;
        if (AF.core && typeof AF.core.setBotoes === 'function') AF.core.setBotoes(false);

        // Toca som de atenção
        if (AF.sons && typeof AF.sons.tocar === 'function') {
            AF.sons.tocar('atencao');
        }

        win.document.open();
        win.document.write(gerarHTMLConfirmacao(resumo, nomeAtual));
        win.document.close();

        function encerrarConfirmacao(motivo) {
            if (estadoFluxo === 'confirmando') {
                estadoFluxo = 'ocioso';
                if (AF.estado) AF.estado.confirmacaoPendente = false;
                if (AF.core && typeof AF.core.setBotoes === 'function') AF.core.setBotoes(false);
                if (AF.painel && typeof AF.painel.setStatus === 'function') {
                    AF.painel.setStatus('Aguardando...', '#4b5563');
                }
            }
        }

        var timerFechamento = setInterval(function () {
            if (!janelaSupervisionado || janelaSupervisionado.closed) {
                clearInterval(timerFechamento);
                encerrarConfirmacao('fechado');
            }
        }, 800);

        var btnCancelar = win.document.getElementById('btn-cancelar');
        if (btnCancelar) {
            btnCancelar.onclick = function () {
                clearInterval(timerFechamento);
                try { win.close(); } catch (e) {}
                encerrarConfirmacao('cancelado');
            };
        }

        var btnAplicar = win.document.getElementById('btn-aplicar');
        if (btnAplicar) {
            btnAplicar.onclick = async function () {
                if (estadoFluxo !== 'confirmando') return;
                estadoFluxo = 'aplicando';
                btnAplicar.disabled = true;
                btnCancelar.disabled = true;

                var boxStatus = win.document.getElementById('box-status');
                if (boxStatus) {
                    boxStatus.className = 'status-box status-aplicando';
                    boxStatus.textContent = 'Aplicando ajustes na folha de ' + nomeAtual + '...';
                }

                if (AF.estado) AF.estado.confirmacaoPendente = false;

                try {
                    await AF.fases.processarTodas({ somenteFolhaAtual: true, nomeEsperado: nomeAtual });
                } catch (err) {
                    console.error('[FPW] Erro no ajuste supervisionado:', err);
                } finally {
                    btnCancelar.disabled = false;
                    btnCancelar.textContent = 'Fechar';

                    var cancelado = !!(AF.estado && AF.estado.cancelado);
                    var falha = AF.estado && AF.estado.falhaAjuste;
                    var parada = AF.estado && AF.estado.motivoParadaAjuste;

                    if (falha) {
                        estadoFluxo = 'interrompido';
                        if (boxStatus) {
                            boxStatus.className = 'status-box status-interrompido';
                            boxStatus.textContent = 'Interrompido (' + falha.stage + '): ' + falha.reason;
                        }
                    } else if (cancelado) {
                        estadoFluxo = 'parado';
                        if (boxStatus) {
                            boxStatus.className = 'status-box status-parado';
                            boxStatus.textContent = 'Parado: ' + ((parada && parada.reason) || 'Ajuste cancelado.');
                        }
                    } else {
                        estadoFluxo = 'concluido';
                        if (boxStatus) {
                            boxStatus.className = 'status-box status-concluido';
                            boxStatus.textContent = 'Ajuste concluído com sucesso!';
                        }
                    }

                    var boxConteudo = win.document.getElementById('box-conteudo');
                    if (boxConteudo && AF.modelo && typeof AF.modelo.textoDetalheAjuste === 'function') {
                        var textoFinal = AF.modelo.textoDetalheAjuste(nomeAtual);
                        boxConteudo.textContent = textoFinal;
                    }
                }
            };
        }

        return win;
    };

    console.log('[FPW] 65-supervisionado carregado. v1.0 - fluxo de confirmacao supervisionada');
})();
