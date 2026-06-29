(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.painel = AF.painel || {};

    // ── Estilos inline reutilizáveis ─────────────────────────────

    var S = {
        painel: [
            'position:fixed', 'top:6px', 'right:8px', 'z-index:999999',
            'background:#111827', 'color:#f9fafb',
            'border-radius:10px', 'box-shadow:0 4px 20px rgba(0,0,0,.6)',
            'font-family:Arial,sans-serif', 'font-size:12px',
            'width:210px', 'border:1px solid #1f2937',
            'overflow:hidden', 'display:flex', 'flex-direction:column',
            'user-select:none'
        ].join(';'),

        titulo: [
            'background:#1a2233', 'padding:7px 12px',
            'font-weight:bold', 'font-size:11px', 'letter-spacing:.04em',
            'text-align:center', 'color:#93c5fd',
            'border-bottom:1px solid #1f2937', 'flex-shrink:0'
        ].join(';'),

        btnBase: [
            'display:flex', 'align-items:center', 'gap:9px',
            'width:100%', 'padding:9px 14px',
            'border:none', 'border-radius:0',
            'background:transparent', 'color:#e2e8f0',
            'font-family:Arial,sans-serif', 'font-size:12px',
            'cursor:pointer', 'text-align:left',
            'transition:background .15s'
        ].join(';'),

        divisor: 'height:1px;background:#1f2937;margin:0 12px;',

        status: [
            'padding:7px 14px', 'font-size:10px',
            'color:#4b5563', 'border-top:1px solid #1f2937',
            'background:#0d1117', 'letter-spacing:.02em',
            'flex-shrink:0', 'min-height:28px',
            'display:flex', 'align-items:center', 'gap:6px'
        ].join(';')
    };

    // ── Helpers de estado visual ──────────────────────────────

    function setStatus(docC, texto, cor) {
        var el = docC.getElementById('fpw-status');
        if (!el) return;
        cor = cor || '#4b5563';
        el.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:' + cor + ';display:inline-block;flex-shrink:0"></span>'
                     + '<span style="color:' + cor + '">' + texto + '</span>';
    }

    function setBtnAtivo(docC, rodando) {
        var btnA = docC.getElementById('btn-analisar');
        var btnE = docC.getElementById('btn-executar');
        var btnP = docC.getElementById('btn-parar');
        if (btnA) { btnA.disabled = rodando; btnA.style.opacity = rodando ? '.35' : '1'; btnA.style.cursor = rodando ? 'not-allowed' : 'pointer'; }
        if (btnE) { btnE.disabled = rodando; btnE.style.opacity = rodando ? '.35' : '1'; btnE.style.cursor = rodando ? 'not-allowed' : 'pointer'; }
        if (btnP) { btnP.disabled = !rodando; btnP.style.opacity = !rodando ? '.35' : '1'; btnP.style.cursor = !rodando ? 'not-allowed' : 'pointer'; }
    }

    // Sobrescreve AF.core.setBotoes para usar o novo helper
    AF.core.setBotoes = function (rodando) {
        try {
            var docC = AF.core.getDocC();
            setBtnAtivo(docC, rodando);
        } catch (e) {}
    };

    // ── Montar HTML do painel ────────────────────────────────

    function montarBotao(id, icone, label, corIcone, disabled) {
        return '<button id="' + id + '"'
            + (disabled ? ' disabled' : '')
            + ' style="' + S.btnBase + (disabled ? ';opacity:.35;cursor:not-allowed' : '') + '">'
            + '<span style="font-size:16px;line-height:1;color:' + corIcone + ';flex-shrink:0">' + icone + '</span>'
            + '<span>' + label + '</span>'
            + '</button>';
    }

    // ── Inicializar painel ───────────────────────────────────

    AF.painel.iniciar = function (docC) {

        // Remove painel anterior se existir (hot-reload)
        var antigo = docC.getElementById('painel-simples');
        if (antigo) antigo.parentNode.removeChild(antigo);

        var painel = docC.createElement('div');
        painel.id = 'painel-simples';
        painel.style.cssText = S.painel;

        painel.innerHTML =
            // Título
            '<div style="' + S.titulo + '">📄 Folha de Ponto — Automação</div>' +

            // Botões
            '<div style="display:flex;flex-direction:column;padding:4px 0;">' +
                montarBotao('btn-analisar', '🔍', 'Analisar folhas',   '#60a5fa', false) +
                '<div style="' + S.divisor + '"></div>' +
                montarBotao('btn-executar', '⚙️',  'Ajustar folhas',   '#a78bfa', false) +
                '<div style="' + S.divisor + '"></div>' +
                montarBotao('btn-copiar',   '📊', 'Abrir Relatório',  '#34d399', true)  +
                '<div style="' + S.divisor + '"></div>' +
                montarBotao('btn-parar',    '⏹️',  'Parar',            '#f87171', true)  +
            '</div>' +

            // Status
            '<div id="fpw-status" style="' + S.status + '">' +
                '<span style="width:6px;height:6px;border-radius:50%;background:#374151;display:inline-block"></span>' +
                '<span style="color:#374151">Aguardando...</span>' +
            '</div>';

        docC.body.appendChild(painel);

        // ── Hover nos botões ──────────────────────────────────

        ['btn-analisar','btn-executar','btn-copiar','btn-parar'].forEach(function(id) {
            var btn = docC.getElementById(id);
            if (!btn) return;
            btn.addEventListener('mouseenter', function() {
                if (!this.disabled) this.style.background = 'rgba(255,255,255,.06)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
            });
        });

        // ── Eventos ─────────────────────────────────────────

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.core.limparLogBuffer();
            setStatus(docC, 'Analisando...', '#60a5fa');
            setBtnAtivo(docC, true);
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            AF.core.limparLogBuffer();
            setStatus(docC, 'Ajustando...', '#a78bfa');
            setBtnAtivo(docC, true);
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

        // Expor setStatus globalmente para outros módulos atualizarem o status
        AF.painel.setStatus = function (texto, cor) {
            setStatus(docC, texto, cor);
        };

        setStatus(docC, 'Pronto', '#374151');
        setBtnAtivo(docC, false);
    };

})();
