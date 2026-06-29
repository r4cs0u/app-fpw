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
            // Título
            '<div style="background:#1f2937;padding:5px 10px;font-weight:bold;font-size:11px;' +
            'border-bottom:1px solid #374151;text-align:center;flex-shrink:0;">Folha de Ponto — Automação</div>' +

            // Botões
            '<div style="display:flex;gap:6px;padding:10px 10px;background:#0f172a;flex-shrink:0;">' +
            '<button id="btn-analisar" title="Analisar mês alvo" style="' + btnStyle + ';background:#2563eb;">&#128269; Analisar</button>' +
            '<button id="btn-executar" title="Ajustar folgas e cód 47" style="' + btnStyle + ';background:#7c3aed;">&#9881;&#65039; Ajustar</button>' +
            '<button id="btn-copiar" title="Ver relatório" disabled style="' + btnStyle + ';background:#16a34a;opacity:.35;cursor:not-allowed;">&#128202; Relatório</button>' +
            '<button id="btn-parar" title="Parar execução" disabled style="' + btnStyle + ';background:transparent;border:1px solid #dc2626;opacity:.35;cursor:not-allowed;">&#9209; Parar</button>' +
            '</div>' +

            // log-box oculto — mantido para compatibilidade com 50-analisar.js e 40-fases.js
            '<div id="log-box" style="display:none;"></div>' +

            // Barra de status
            '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;' +
            'background:#0d1117;border-top:1px solid #1f2937;font-size:10px;flex-shrink:0;">' +
            '<span id="fpw-status-dot" style="width:7px;height:7px;border-radius:50%;background:#374151;flex-shrink:0;"></span>' +
            '<span id="fpw-status-text" style="color:#4b5563;">Aguardando...</span>' +
            '</div>';

        docC.body.appendChild(painel);

        // hover
        ['btn-analisar','btn-executar','btn-copiar'].forEach(function (id) {
            var b = docC.getElementById(id);
            if (!b) return;
            b.addEventListener('mouseenter', function () { if (!this.disabled) this.style.filter = 'brightness(1.18)'; });
            b.addEventListener('mouseleave', function () { this.style.filter = ''; });
        });

        // ── Sobrescreve habilitarCopiar: ativa botão + compõe status ──
        // Chamado por gerarAnalise e gerarFolgas (60-relatorios.js) ao terminar,
        // independente de ter sido cancelado ou não.
        AF.relatorios.habilitarCopiar = function (titulo) {
            try {
                setBtnCopiar(docC, true);
                var label    = titulo || 'Relatório';
                var cancelou = !!(AF.estado && AF.estado.cancelado);
                if (cancelou) {
                    setStatus(docC, 'Parado — ' + label + ' pronto', '#f97316');
                } else {
                    setStatus(docC, 'Concluído — ' + label + ' pronto', '#4ade80');
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
            // Status intermediário — será sobrescrito por habilitarCopiar
            // quando o relatório parcial for gerado (assíncrono)
            setStatus(docC, 'Parando...', '#f87171');
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

        // API pública para outros módulos
        AF.painel.setStatus    = function (t, c) { setStatus(docC, t, c); };
        AF.painel.setBtnCopiar = function (a)    { setBtnCopiar(docC, a); };

        setStatus(docC, 'Aguardando...', '#4b5563');
        setBtnAtivo(docC, false);
    };

})();
