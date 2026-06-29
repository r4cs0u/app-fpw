(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.painel = AF.painel || {};

    // ── Helpers de estado visual ───────────────────────────────────────

    function setStatus(docC, texto, cor) {
        var el = docC.getElementById('fpw-status-text');
        var dot = docC.getElementById('fpw-status-dot');
        if (!el || !dot) return;
        cor = cor || '#4b5563';
        dot.style.background = cor;
        el.style.color = cor;
        el.textContent = texto;
    }

    function setBtnAtivo(docC, rodando) {
        var btnA = docC.getElementById('btn-analisar');
        var btnE = docC.getElementById('btn-executar');
        var btnC = docC.getElementById('btn-copiar');
        var btnP = docC.getElementById('btn-parar');
        [btnA, btnE].forEach(function (b) {
            if (!b) return;
            b.disabled = rodando;
            b.style.opacity = rodando ? '.35' : '1';
            b.style.cursor = rodando ? 'not-allowed' : 'pointer';
        });
        if (btnP) {
            btnP.disabled = !rodando;
            btnP.style.opacity = !rodando ? '.35' : '1';
            btnP.style.cursor = !rodando ? 'not-allowed' : 'pointer';
        }
        // btn-copiar: nunca desabilitar junto — só ativa quando há relatório
    }

    // Sobrescreve AF.core.setBotoes para usar o novo helper
    AF.core.setBotoes = function (rodando) {
        try {
            var docC = AF.core.getDocC();
            setBtnAtivo(docC, rodando);
        } catch (e) {}
    };

    // ── Inicializar painel ─────────────────────────────────────────────

    AF.painel.iniciar = function (docC) {

        // Remove painel anterior se existir (hot-reload)
        var antigo = docC.getElementById('painel-simples');
        if (antigo) antigo.parentNode.removeChild(antigo);

        var painel = docC.createElement('div');
        painel.id = 'painel-simples';
        painel.style.cssText = [
            'position:fixed', 'top:4px', 'right:6px', 'z-index:999999',
            'background:#111827', 'color:#f9fafb', 'border-radius:8px',
            'box-shadow:0 4px 16px rgba(0,0,0,.5)', 'font-family:Arial,sans-serif',
            'font-size:11px', 'width:360px',
            'border:1px solid #374151', 'overflow:hidden', 'display:flex',
            'flex-direction:column', 'user-select:none'
        ].join(';');

        var btnStyle = [
            'flex:1', 'padding:6px 4px', 'border:0', 'border-radius:6px',
            'color:white', 'cursor:pointer', 'font-size:13px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'line-height:1', 'gap:4px', 'font-family:Arial,sans-serif'
        ].join(';');

        painel.innerHTML =
            // Título
            '<div style="background:#1f2937;padding:4px 8px;font-weight:bold;font-size:11px;border-bottom:1px solid #374151;text-align:center;flex-shrink:0;">Folha de Ponto — Automação</div>' +

            // Linha de botões
            '<div style="display:flex;gap:6px;padding:8px 10px;background:#0f172a;">' +

            '<button id="btn-analisar" title="Analisar mes alvo"' +
            ' style="' + btnStyle + ';background:#2563eb;">&#128269; Analisar</button>' +

            '<button id="btn-executar" title="Folgas + Gravar"' +
            ' style="' + btnStyle + ';background:#7c3aed;">&#9881;&#65039; Ajustar</button>' +

            '<button id="btn-copiar" title="Relatório" disabled' +
            ' style="' + btnStyle + ';background:#16a34a;opacity:.35;cursor:not-allowed;">&#128202; Relatório</button>' +

            '<button id="btn-parar" title="Parar execucao" disabled' +
            ' style="' + btnStyle + ';background:transparent;border:1px solid #dc2626;color:white;opacity:.35;cursor:not-allowed;">&#128721; Parar</button>' +

            '</div>' +

            // Log box (mantido para compatibilidade com 50-analisar e 40-fases)
            '<div id="log-box" style="flex:1;padding:5px 7px;overflow-y:auto;line-height:1.5;font-size:11px;color:#9ca3af;background:#0b1220;max-height:130px;">Aguardando...</div>' +

            // Barra de status
            '<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#0d1117;border-top:1px solid #1f2937;font-size:10px;letter-spacing:.02em;">' +
            '<span id="fpw-status-dot" style="width:6px;height:6px;border-radius:50%;background:#374151;flex-shrink:0;display:inline-block;"></span>' +
            '<span id="fpw-status-text" style="color:#4b5563;">Aguardando...</span>' +
            '</div>';

        docC.body.appendChild(painel);

        // ── Hover nos botões ──────────────────────────────────────────
        ['btn-analisar','btn-executar'].forEach(function(id) {
            var btn = docC.getElementById(id);
            if (!btn) return;
            var bgOriginal = btn.style.background;
            btn.addEventListener('mouseenter', function() {
                if (!this.disabled) this.style.filter = 'brightness(1.15)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.filter = '';
            });
        });

        // ── Eventos ───────────────────────────────────────────────────

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.core.limparLogBuffer();
            docC.getElementById('log-box').innerHTML = '';
            setStatus(docC, 'Analisando...', '#60a5fa');
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.core.limparLogBuffer();
            docC.getElementById('log-box').innerHTML = '';
            setStatus(docC, 'Ajustando...', '#a78bfa');
            await AF.fases.processarTodas(docC);
        };

        docC.getElementById('btn-parar').onclick = function () {
            AF.core.cancelarTudo();
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.sons.tocar('parada');
            setStatus(docC, 'Parado pelo usuário', '#f87171');
            setBtnAtivo(docC, false);
        };

        docC.getElementById('btn-copiar').onclick = function () {
            if (!AF.estado.relatorioLista || !AF.estado.relatorioLista.length) {
                setStatus(docC, 'Nenhum relatório disponível', '#f87171');
                return;
            }
            AF.relatorios.abrirJanela();
            AF.sons.tocar('copia');
        };

        // Expor setStatus e setBtnAtivo para outros módulos
        AF.painel.setStatus = function (texto, cor) { setStatus(docC, texto, cor); };
        AF.painel.setBtnCopiar = function (ativo) {
            var b = docC.getElementById('btn-copiar');
            if (!b) return;
            b.disabled = !ativo;
            b.style.opacity = ativo ? '1' : '.35';
            b.style.cursor = ativo ? 'pointer' : 'not-allowed';
        };

        AF.core.log('Pronto para executar.', '#a3e635');
        setBtnAtivo(docC, false);
    };

})();
