(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.painel = AF.painel || {};

    // ── Helpers internos ─────────────────────────────────────────────

    function setStatus(docC, texto, cor) {
        var el  = docC.getElementById('fpw-status-text');
        var dot = docC.getElementById('fpw-status-dot');
        if (!el || !dot) return;
        cor = cor || '#4b5563';
        dot.style.background = cor;
        el.style.color = cor;
        el.textContent = texto;
    }

    function setBtnCopiar(docC, ativo) {
        var b = docC.getElementById('btn-copiar');
        if (!b) return;
        b.disabled = false;
        b.style.opacity  = '1';
        b.style.cursor   = 'pointer';
    }

    function atualizarSessaoOracle(docC, avaliacao) {
        var badge = docC.getElementById('fpw-oracle-badge');
        var aviso = docC.getElementById('fpw-oracle-warning');
        if (!badge) return;
        var st = (avaliacao && avaliacao.estado) || 'unknown';
        if (st === 'active') {
            badge.style.background = 'rgba(34,197,94,.18)';
            badge.style.color = '#4ade80';
            badge.textContent = 'Oracle: ativa';
            badge.title = 'Sess\u00E3o Oracle ativa e comunicando';
            if (aviso) aviso.style.display = 'none';
        } else if (st === 'expired') {
            badge.style.background = 'rgba(239,68,68,.35)';
            badge.style.color = '#f87171';
            badge.textContent = 'Oracle: expirada';
            badge.title = 'Sess\u00E3o Oracle expirou (tela de login/aviso de expira\u00E7\u00E3o)';
            if (aviso) {
                aviso.textContent = '\u26A0\uFE0F Sess\u00E3o Oracle expirou por inatividade. Fa\u00E7a login novamente na aba Oracle.';
                aviso.style.display = 'block';
            }
        } else if (st === 'inactive') {
            badge.style.background = 'rgba(239,68,68,.25)';
            badge.style.color = '#fca5a5';
            badge.textContent = 'Oracle: inativa';
            badge.title = 'Sess\u00E3o Oracle inativa ou aba fechada';
            if (aviso) {
                aviso.textContent = '\u26A0\uFE0F Sess\u00E3o Oracle inativa. Abra ou recarregue a aba do Oracle para manter o MyWay conectado.';
                aviso.style.display = 'block';
            }
        } else {
            badge.style.background = '#374151';
            badge.style.color = '#9ca3af';
            badge.textContent = 'Oracle: ?';
            badge.title = 'Sess\u00E3o Oracle: sem evid\u00EAncia recente';
            if (aviso) aviso.style.display = 'none';
        }
    }

    var CHAVE_STORAGE_ORACLE_KEEPALIVE = 'fpw.oracleKeepalive';

    function obterOracleKeepaliveAtivo() {
        try {
            if (typeof GM_getValue === 'function') {
                return !!GM_getValue('fpw_oracle_keepalive_ativo', false);
            }
        } catch (e) {}
        try {
            return sessionStorage.getItem(CHAVE_STORAGE_ORACLE_KEEPALIVE) === 'true';
        } catch (e) {}
        return false;
    }

    function salvarOracleKeepaliveAtivo(ativo) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue('fpw_oracle_keepalive_ativo', !!ativo);
            }
        } catch (e) {}
        try {
            sessionStorage.setItem(CHAVE_STORAGE_ORACLE_KEEPALIVE, String(!!ativo));
        } catch (e) {}
    }

    function renderizarOracleKeepalive(docC, ativo) {
        var btn = docC.getElementById('btn-oracle-keepalive');
        if (!btn) return;
        btn.style.background = ativo ? '#059669' : '#374151';
        btn.style.color = ativo ? '#ffffff' : '#9ca3af';
        btn.textContent = ativo ? 'Manter Oracle: ON' : 'Manter Oracle: OFF';
    }

    var CHAVE_STORAGE_MODO = 'fpw.modoAjuste';
    var modoEmMemoria = 'automatico';

    function obterModoAjuste() {
        try {
            var m = sessionStorage.getItem(CHAVE_STORAGE_MODO);
            if (m === 'supervisionado' || m === 'automatico') return m;
        } catch (e) {}
        return modoEmMemoria || 'automatico';
    }

    function salvarModoAjuste(m) {
        modoEmMemoria = m;
        try {
            sessionStorage.setItem(CHAVE_STORAGE_MODO, m);
        } catch (e) {}
    }

    function renderizarModo(docC, modo) {
        var bAuto = docC.getElementById('btn-modo-auto');
        var bSuperv = docC.getElementById('btn-modo-superv');
        if (!bAuto || !bSuperv) return;
        if (modo === 'supervisionado') {
            bSuperv.style.background = '#7c3aed';
            bSuperv.style.color = '#ffffff';
            bSuperv.style.borderColor = '#7c3aed';
            bAuto.style.background = 'transparent';
            bAuto.style.color = '#9ca3af';
            bAuto.style.borderColor = '#374151';
        } else {
            bAuto.style.background = '#2563eb';
            bAuto.style.color = '#ffffff';
            bAuto.style.borderColor = '#2563eb';
            bSuperv.style.background = 'transparent';
            bSuperv.style.color = '#9ca3af';
            bSuperv.style.borderColor = '#374151';
        }
    }

    function setBtnAtivo(docC, rodando) {
        var bloqueado = !!(rodando || (AF.estado && (AF.estado.rodando || AF.estado.confirmacaoPendente)));
        ['btn-analisar', 'btn-executar'].forEach(function (id) {
            var b = docC.getElementById(id);
            if (!b) return;
            b.disabled      = bloqueado;
            b.style.opacity = bloqueado ? '.35' : '1';
            b.style.cursor  = bloqueado ? 'not-allowed' : 'pointer';
        });
        ['btn-modo-auto', 'btn-modo-superv'].forEach(function (id) {
            var b = docC.getElementById(id);
            if (!b) return;
            b.disabled      = bloqueado;
            b.style.opacity = bloqueado ? '.4' : '1';
            b.style.cursor  = bloqueado ? 'not-allowed' : 'pointer';
        });
        var btnP = docC.getElementById('btn-parar');
        if (btnP) {
            var emExecucao = !!(rodando || (AF.estado && AF.estado.rodando));
            btnP.disabled      = !emExecucao;
            btnP.style.opacity = !emExecucao ? '.35' : '1';
            btnP.style.cursor  = !emExecucao ? 'not-allowed' : 'pointer';
        }
    }

    // Sobrescreve AF.core.setBotoes — chamado por analisarTodas e processarTodas.
    AF.core.setBotoes = function (rodando) {
        try {
            var docC = AF.core.getDocC();
            setBtnAtivo(docC, rodando);
        } catch (e) {}
    };

    // ── Inicializar painel ────────────────────────────────────────────

    AF.painel.iniciar = function (docC) {

        var antigo = docC.getElementById('painel-simples');
        if (antigo) antigo.parentNode.removeChild(antigo);

        var antigoSide = docC.getElementById('fpw-sidepanel');
        if (antigoSide) antigoSide.parentNode.removeChild(antigoSide);

        // ── Sidepanel de instruções ───────────────────────────────────
        var side = docC.createElement('div');
        side.id = 'fpw-sidepanel';
        side.style.cssText = [
            'position:fixed', 'top:4px', 'right:412px', 'z-index:999998',
            'background:#111827', 'color:#f9fafb', 'border-radius:8px',
            'box-shadow:0 4px 16px rgba(0,0,0,.5)',
            'font-family:Arial,sans-serif', 'font-size:11px',
            'width:400px', 'height:200px',
            'border:1px solid #374151', 'overflow:hidden',
            'display:none', 'flex-direction:column', 'user-select:none'
        ].join(';');

        var sideHdr = docC.createElement('div');
        sideHdr.style.cssText = 'background:#1f2937;padding:5px 10px;font-weight:bold;font-size:11px;border-bottom:1px solid #374151;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;';
        var sideHdrTitle = docC.createElement('span');
        sideHdrTitle.textContent = '\uD83D\uDCD6 Instru\u00E7\u00F5es de uso \u2014 FolhaF\u00E1cil';
        var sideHdrClose = docC.createElement('span');
        sideHdrClose.id = 'btn-fechar-side';
        sideHdrClose.style.cssText = 'cursor:pointer;color:#9ca3af;font-size:14px;line-height:1;';
        sideHdrClose.textContent = '\u2715';
        sideHdr.appendChild(sideHdrTitle);
        sideHdr.appendChild(sideHdrClose);

        var sideBody = docC.createElement('div');
        sideBody.style.cssText = 'flex:1;overflow-y:auto;padding:8px 12px;line-height:1.6;color:#d1d5db;font-size:11px;';

        var ol = docC.createElement('ol');
        ol.style.cssText = 'margin:0;padding-left:18px;';

        var itens = [
            'Analise <strong>todas</strong> as folhas de ponto.',
            'Gere o relat\u00F3rio e atue <strong>manualmente</strong> nas irregularidades encontradas.',
            'Ap\u00F3s os ajustes manuais, clique em <strong>Ajustar</strong>. Escolha o modo <strong>Autom\u00E1tico</strong> (processa toda a lista) ou <strong>Supervisionado</strong> (confirma\u00E7\u00E3o pr\u00E9via folha a folha). Certifique-se de permitir popups do site.',
            'Gere o relat\u00F3rio novamente e navegue pelas folhas que ainda merecem aten\u00E7\u00E3o.',
            'A <strong>aprova\u00E7\u00E3o final</strong> de cada folha \u00E9 manual.'
        ];

        for (var ii = 0; ii < itens.length; ii++) {
            var li = docC.createElement('li');
            li.style.cssText = 'margin-bottom:4px;';
            li.innerHTML = itens[ii];
            ol.appendChild(li);
        }

        var nota = docC.createElement('div');
        nota.style.cssText = 'margin-top:6px;padding-top:6px;border-top:1px solid #374151;color:#9ca3af;font-size:10px;';
        nota.innerHTML = '* Use o bot\u00E3o <strong style="color:#f87171;">Parar</strong> para interromper qualquer execu\u00E7\u00E3o em andamento.';

        sideBody.appendChild(ol);
        sideBody.appendChild(nota);
        side.appendChild(sideHdr);
        side.appendChild(sideBody);
        docC.body.appendChild(side);

        // ── Painel principal ──────────────────────────────────────────
        var painel = docC.createElement('div');
        painel.id = 'painel-simples';
        painel.style.cssText = [
            'position:fixed', 'top:4px', 'right:6px', 'z-index:999999',
            'background:#111827', 'color:#f9fafb', 'border-radius:8px',
            'box-shadow:0 4px 16px rgba(0,0,0,.5)',
            'font-family:Arial,sans-serif', 'font-size:11px',
            'width:400px', 'max-height:200px',
            'border:1px solid #374151', 'overflow:hidden',
            'display:flex', 'flex-direction:column', 'user-select:none'
        ].join(';');

        var btnStyle = [
            'flex:1', 'padding:7px 4px', 'border:0', 'border-radius:6px',
            'color:white', 'cursor:pointer', 'font-size:13px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'gap:4px', 'font-family:Arial,sans-serif', 'line-height:1'
        ].join(';');

        painel.innerHTML =
            // Título + botão instruções
            '<div style="background:#1f2937;padding:5px 10px;font-weight:bold;font-size:13px;' +
            'border-bottom:1px solid #374151;text-align:center;flex-shrink:0;' +
            'display:flex;align-items:center;justify-content:space-between;">'
            + '<span id="fpw-oracle-badge" title="Sess\u00E3o Oracle: sem evid\u00EAncia recente" style="font-size:9px;font-weight:600;padding:1px 6px;border-radius:99px;background:#374151;color:#9ca3af;cursor:help;">Oracle: ?</span>'
            + '<span style="flex:1;text-align:center;">FolhaF\u00E1cil</span>'
            + '<div style="display:flex;gap:4px;flex-shrink:0;">'
            + '<button id="btn-log" title="Log de atividades" style="'
            + 'background:transparent;border:1px solid #374151;border-radius:5px;'
            + 'color:#9ca3af;cursor:pointer;font-size:11px;padding:2px 7px;'
            + 'font-family:Arial,sans-serif;line-height:1.4;flex-shrink:0;">\uD83D\uDCDC</button>'
            + '<button id="btn-instrucoes" title="Instru\u00E7\u00F5es de uso" style="'
            + 'background:transparent;border:1px solid #374151;border-radius:5px;'
            + 'color:#9ca3af;cursor:pointer;font-size:11px;padding:2px 7px;'
            + 'font-family:Arial,sans-serif;line-height:1.4;flex-shrink:0;">\uD83D\uDCD6</button>'
            + '</div>'
            + '</div>' +

            // Botões
            '<div style="display:flex;gap:6px;padding:10px 10px;background:#0f172a;flex-shrink:0;">' +
            '<button id="btn-analisar" title="Analisar m\u00EAs alvo" style="' + btnStyle + ';background:#2563eb;">&#128269; Analisar</button>' +
            '<button id="btn-executar" title="Ajustar folgas e c\u00F3d 47" style="' + btnStyle + ';background:#7c3aed;">&#9881;&#65039; Ajustar</button>' +
            '<button id="btn-copiar" title="Ver relat\u00F3rio" style="' + btnStyle + ';background:#16a34a;opacity:1;cursor:pointer;">&#128202; Relat\u00F3rio</button>' +
            '<button id="btn-parar" title="Parar execu\u00E7\u00E3o" disabled style="' + btnStyle + ';background:transparent;border:1px solid #dc2626;opacity:.35;cursor:not-allowed;">&#9209; Parar</button>' +
            '</div>' +

            // log-box oculto — mantido para compatibilidade com 50-analisar.js e 40-fases.js
            '<div id="log-box" style="display:none;"></div>' +

            // Controle de modo
            '<div id="fpw-modo-container" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:3px 10px;background:#0d1117;border-top:1px solid #1f2937;flex-shrink:0;">' +
            '<span style="font-size:10px;color:#9ca3af;">Modo:</span>' +
            '<button id="btn-modo-auto" type="button" title="Modo Autom\u00E1tico: percorre toda a lista" style="padding:2px 8px;font-size:10px;font-weight:600;border-radius:4px;border:1px solid #374151;cursor:pointer;font-family:inherit;">Autom\u00E1tico</button>' +
            '<button id="btn-modo-superv" type="button" title="Modo Supervisionado: confirma\u00E7\u00E3o pr\u00E9via folha a folha" style="padding:2px 8px;font-size:10px;font-weight:600;border-radius:4px;border:1px solid #374151;cursor:pointer;font-family:inherit;">Supervisionado</button>' +
            '<button id="btn-oracle-keepalive" type="button" title="Manter sess\u00E3o da aba Oracle ativa via pulsos in\u00F3cuos peri\u00F3dicos" style="margin-left:4px;padding:2px 6px;font-size:9px;font-weight:600;border-radius:4px;border:1px solid #374151;cursor:pointer;font-family:inherit;background:#374151;color:#9ca3af;">Manter Oracle: OFF</button>' +
            '</div>' +

            // Barra de status
            '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;' +
            'background:#0d1117;border-top:1px solid #1f2937;font-size:13px;flex-shrink:0;">' +
            '<span id="fpw-status-dot" style="width:7px;height:7px;border-radius:50%;background:#374151;flex-shrink:0;"></span>' +
            '<span id="fpw-status-text" style="color:#4b5563;">Aguardando...</span>' +
            '</div>' +

            // Aviso de perda de sessão Oracle
            '<div id="fpw-oracle-warning" style="display:none;background:#7c2d12;color:#ffedd5;padding:4px 10px;' +
            'font-size:11px;text-align:center;border-top:1px solid #9a3412;line-height:1.3;flex-shrink:0;">' +
            '&#9888;&#65039; Sess\u00E3o Oracle inativa. Abra ou recarregue a aba do Oracle para manter o MyWay conectado.' +
            '</div>';

        docC.body.appendChild(painel);

        // hover botões principais
        ['btn-analisar','btn-executar','btn-copiar'].forEach(function (id) {
            var b = docC.getElementById(id);
            if (!b) return;
            b.addEventListener('mouseenter', function () { if (!this.disabled) this.style.filter = 'brightness(1.18)'; });
            b.addEventListener('mouseleave', function () { this.style.filter = ''; });
        });

        // toggle sidepanel
        docC.getElementById('btn-log').addEventListener('click', function () {
            if (AF.log && typeof AF.log.abrirJanela === 'function') {
                AF.log.abrirJanela();
            } else {
                setStatus(docC, 'Log indispon\u00EDvel', '#f87171');
            }
        });

        docC.getElementById('btn-instrucoes').addEventListener('click', function () {
            var s = docC.getElementById('fpw-sidepanel');
            if (!s) return;
            var visible = s.style.display === 'flex';
            s.style.display = visible ? 'none' : 'flex';
            this.style.color = visible ? '#9ca3af' : '#60a5fa';
            this.style.borderColor = visible ? '#374151' : '#3b82f6';
        });

        docC.getElementById('btn-fechar-side').addEventListener('click', function () {
            var s = docC.getElementById('fpw-sidepanel');
            if (s) s.style.display = 'none';
            var btnI = docC.getElementById('btn-instrucoes');
            if (btnI) { btnI.style.color = '#9ca3af'; btnI.style.borderColor = '#374151'; }
        });

        // ── Sobrescreve habilitarCopiar: ativa botão + compõe status ──
        AF.relatorios.habilitarCopiar = function (titulo) {
            try {
                setBtnCopiar(docC, true);
                var label    = titulo || 'Relat\u00F3rio';
                var cancelou = !!(AF.estado && AF.estado.cancelado);
                var falha = AF.estado && AF.estado.falhaAjuste;
                if (falha) {
                    var detalhe = 'Interrompido (' + falha.stage + '): ' + falha.reason;
                    if (falha.unconfirmed) detalhe += ' (resultado nao confirmado)';
                    setStatus(docC, detalhe, '#f87171');
                } else if (cancelou) {
                    var parada = AF.estado.motivoParadaAjuste;
                    if (parada && parada.unconfirmed) {
                        setStatus(
                            docC,
                            'Parado: ' + parada.reason + ' (resultado nao confirmado)',
                            '#f97316'
                        );
                    } else {
                        setStatus(docC, 'Parado \u2014 ' + label + ' pronto', '#f97316');
                    }
                } else {
                    setStatus(docC, 'Conclu\u00EDdo \u2014 ' + label + ' pronto', '#4ade80');
                }
            } catch (e) {}
        };

        // ── Eventos dos botões ─────────────────────────────────────────

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.estado.falhaAjuste = null;
            AF.estado.falhaPrecondicao = false;
            AF.estado.motivoParadaAjuste = null;
            setStatus(docC, 'Analisando...', '#60a5fa');
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.estado.falhaAjuste = null;
            AF.estado.falhaPrecondicao = false;
            AF.estado.motivoParadaAjuste = null;
            var modo = obterModoAjuste();
            if (modo === 'supervisionado') {
                setStatus(docC, 'Ajuste supervisionado...', '#a78bfa');
                if (AF.supervisionado && typeof AF.supervisionado.iniciarConfirmacao === 'function') {
                    await AF.supervisionado.iniciarConfirmacao();
                } else {
                    setStatus(docC, 'M\u00F3dulo supervisionado indispon\u00EDvel', '#f87171');
                }
            } else {
                setStatus(docC, 'Ajustando...', '#a78bfa');
                await AF.fases.processarTodas();
            }
        };

        var modoAtual = 'supervisionado';
        salvarModoAjuste(modoAtual);
        renderizarModo(docC, modoAtual);

        var btnModoAuto = docC.getElementById('btn-modo-auto');
        if (btnModoAuto) {
            btnModoAuto.onclick = function () {
                if (this.disabled) return;
                modoAtual = 'automatico';
                salvarModoAjuste(modoAtual);
                renderizarModo(docC, modoAtual);
            };
        }

        var btnModoSuperv = docC.getElementById('btn-modo-superv');
        if (btnModoSuperv) {
            btnModoSuperv.onclick = function () {
                if (this.disabled) return;
                modoAtual = 'supervisionado';
                salvarModoAjuste(modoAtual);
                renderizarModo(docC, modoAtual);
            };
        }

        var oracleKeepaliveAtivo = obterOracleKeepaliveAtivo();
        renderizarOracleKeepalive(docC, oracleKeepaliveAtivo);

        var btnOracleKeepalive = docC.getElementById('btn-oracle-keepalive');
        if (btnOracleKeepalive) {
            btnOracleKeepalive.onclick = function () {
                oracleKeepaliveAtivo = !oracleKeepaliveAtivo;
                salvarOracleKeepaliveAtivo(oracleKeepaliveAtivo);
                renderizarOracleKeepalive(docC, oracleKeepaliveAtivo);
            };
        }

        docC.getElementById('btn-parar').onclick = function () {
            var execucaoAtiva = !!(AF.estado.execucaoAjuste && AF.estado.execucaoAjuste.ativa);
            var emAndamento = !!AF.estado.rodando;
            AF.core.cancelarTudo();
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
            if (emAndamento) AF.sons.tocar('parada');
            if (!execucaoAtiva) setStatus(docC, 'Parando...', '#f87171');
            setBtnAtivo(docC, false);
        };

        docC.getElementById('btn-copiar').onclick = function () {
            AF.relatorios.abrirJanela();
        };

        // API pública para outros módulos
        AF.painel.setStatus    = function (t, c) { setStatus(docC, t, c); };
        AF.painel.setBtnCopiar = function (a)    { setBtnCopiar(docC, a); };
        AF.painel.obterModo    = function ()     { return modoAtual; };
        AF.painel.definirModo  = function (m) {
            if (m !== 'automatico' && m !== 'supervisionado') return;
            modoAtual = m;
            salvarModoAjuste(modoAtual);
            renderizarModo(docC, modoAtual);
        };
        AF.painel.atualizarSessaoOracle = function (avaliacao) {
            atualizarSessaoOracle(docC, avaliacao);
        };

        atualizarSessaoOracle(docC, { estado: (AF.estado && AF.estado.sessaoOracleEstado) || 'unknown' });

        if (AF.sessao && typeof AF.sessao.iniciarMonitorOracle === 'function') {
            AF.sessao.iniciarMonitorOracle(function (avaliacao) {
                atualizarSessaoOracle(docC, avaliacao);
            });
        }

        setStatus(docC, 'Aguardando...', '#4b5563');
        setBtnAtivo(docC, false);
    };
    console.log('[FPW] 80-painel carregado.versão 1.2 - Log loading message for 80-painel version 1.2');
})();
