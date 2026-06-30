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
        b.disabled = !ativo;
        b.style.opacity  = ativo ? '1'       : '.35';
        b.style.cursor   = ativo ? 'pointer' : 'not-allowed';
    }

    function setBtnAtivo(docC, rodando) {
        ['btn-analisar', 'btn-executar'].forEach(function (id) {
            var b = docC.getElementById(id);
            if (!b) return;
            b.disabled      = rodando;
            b.style.opacity = rodando ? '.35' : '1';
            b.style.cursor  = rodando ? 'not-allowed' : 'pointer';
        });
        var btnP = docC.getElementById('btn-parar');
        if (btnP) {
            btnP.disabled      = !rodando;
            btnP.style.opacity = !rodando ? '.35' : '1';
            btnP.style.cursor  = !rodando ? 'not-allowed' : 'pointer';
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
            'Ap\u00F3s os ajustes manuais, clique em <strong>Ajustar</strong> e deixe o aplicativo mover e corrigir as folgas automaticamente.',
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
            + '<span style="flex:1;text-align:center;">FolhaF\u00E1cil</span>'
            + '<button id="btn-instrucoes" title="Instru\u00E7\u00F5es de uso" style="'
            + 'background:transparent;border:1px solid #374151;border-radius:5px;'
            + 'color:#9ca3af;cursor:pointer;font-size:11px;padding:2px 7px;'
            + 'font-family:Arial,sans-serif;line-height:1.4;flex-shrink:0;">\uD83D\uDCD6</button>'
            + '</div>' +

            // Botões
            '<div style="display:flex;gap:6px;padding:10px 10px;background:#0f172a;flex-shrink:0;">' +
            '<button id="btn-analisar" title="Analisar m\u00EAs alvo" style="' + btnStyle + ';background:#2563eb;">&#128269; Analisar</button>' +
            '<button id="btn-executar" title="Ajustar folgas e c\u00F3d 47" style="' + btnStyle + ';background:#7c3aed;">&#9881;&#65039; Ajustar</button>' +
            '<button id="btn-copiar" title="Ver relat\u00F3rio" disabled style="' + btnStyle + ';background:#16a34a;opacity:.35;cursor:not-allowed;">&#128202; Relat\u00F3rio</button>' +
            '<button id="btn-parar" title="Parar execu\u00E7\u00E3o" disabled style="' + btnStyle + ';background:transparent;border:1px solid #dc2626;opacity:.35;cursor:not-allowed;">&#9209; Parar</button>' +
            '</div>' +

            // log-box oculto — mantido para compatibilidade com 50-analisar.js e 40-fases.js
            '<div id="log-box" style="display:none;"></div>' +

            // Barra de status
            '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;' +
            'background:#0d1117;border-top:1px solid #1f2937;font-size:13px;flex-shrink:0;">' +
            '<span id="fpw-status-dot" style="width:7px;height:7px;border-radius:50%;background:#374151;flex-shrink:0;"></span>' +
            '<span id="fpw-status-text" style="color:#4b5563;">Aguardando...</span>' +
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
                if (cancelou) {
                    setStatus(docC, 'Parado \u2014 ' + label + ' pronto', '#f97316');
                } else {
                    setStatus(docC, 'Conclu\u00EDdo \u2014 ' + label + ' pronto', '#4ade80');
                }
            } catch (e) {}
        };

        // ── Eventos dos botões ─────────────────────────────────────────

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.estado.relatorioLista = null;
            AF.core.limparLogBuffer();
            setBtnCopiar(docC, false);
            setStatus(docC, 'Analisando...', '#60a5fa');
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.estado.relatorioLista = null;
            AF.core.limparLogBuffer();
            setBtnCopiar(docC, false);
            setStatus(docC, 'Ajustando...', '#a78bfa');
            await AF.fases.processarTodas();
        };

        docC.getElementById('btn-parar').onclick = function () {
            AF.core.cancelarTudo();
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.sons.tocar('parada');
            setStatus(docC, 'Parando...', '#f87171');
            setBtnAtivo(docC, false);
        };

        docC.getElementById('btn-copiar').onclick = function () {
            if (!AF.estado.relatorioLista || !AF.estado.relatorioLista.length) {
                setStatus(docC, 'Nenhum relat\u00F3rio dispon\u00EDvel', '#f87171');
                return;
            }
            AF.relatorios.abrirJanela();
            AF.sons.tocar('copia');
        };

        // API pública para outros módulos
        AF.painel.setStatus    = function (t, c) { setStatus(docC, t, c); };
        AF.painel.setBtnCopiar = function (a)    { setBtnCopiar(docC, a); };

        setStatus(docC, 'Aguardando...', '#4b5563');
        setBtnAtivo(docC, false);
    };
    console.log('[FPW] 80-painel carregado.versão 1.2 - Log loading message for 80-painel version 1.2');
})();
