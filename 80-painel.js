(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.painel = AF.painel || {};

    // ── Monta e injeta o painel no Frame 0 ────────────────────────
    //
    // Chamado pelo 99-main.user.js após todos os módulos carregarem.
    // Recebe docC = document do frames[0] (cabeçalho do MyWay).

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
            'font-size:11px', 'width:320px', 'height:200px',
            'border:1px solid #374151', 'overflow:hidden', 'display:flex',
            'flex-direction:column'
        ].join(';') + ';';

        painel.innerHTML =
            '<div style="background:#1f2937;padding:3px 8px;font-weight:bold;font-size:11px;border-bottom:1px solid #374151;text-align:center;flex-shrink:0;">Folha de Ponto - Automacao</div>' +
            '<div style="display:flex;flex:1;overflow:hidden;">' +

            // ── Barra lateral de botões ──────────────────────────
            '<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;padding:5px 4px;border-right:1px solid #374151;background:#1a2233;min-width:38px;align-items:center;flex-shrink:0;">' +

            '<button id="btn-analisar" title="Analisar mes alvo"' +
            ' style="width:28px;height:28px;border:0;border-radius:6px;background:#2563eb;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#128269;</button>' +

            '<button id="btn-executar" title="Folgas + Gravar"' +
            ' style="width:28px;height:28px;border:0;border-radius:6px;background:#7c3aed;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#9881;&#65039;</button>' +

            '<button id="btn-copiar" title="Relatório" disabled' +
            ' style="width:28px;height:28px;border:0;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#128202;</button>' +

            '<div style="width:24px;height:1px;background:#374151;"></div>' +

            '<button id="btn-parar" title="Parar execucao" disabled' +
            ' style="width:28px;height:28px;border:0;border-radius:6px;background:#1f2937;border:1px solid #dc2626;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;line-height:1;">&#128721;</button>' +

            '</div>' +

            // ── Área de log ──────────────────────────────────────
            '<div id="log-box" style="flex:1;padding:5px 7px;overflow-y:auto;line-height:1.5;font-size:11px;color:#9ca3af;background:#0b1220;">Aguardando...</div>' +

            '</div>';

        docC.body.appendChild(painel);

        // ── Eventos dos botões ────────────────────────────────────

        docC.getElementById('btn-analisar').onclick = async function () {
            AF.estado.cancelado = false;
            docC.getElementById('log-box').innerHTML = '';
            await AF.analisar.analisarTodas();
        };

        docC.getElementById('btn-executar').onclick = async function () {
            AF.estado.cancelado = false;
            docC.getElementById('log-box').innerHTML = '';
            await AF.fases.processarTodas(docC);
        };

        docC.getElementById('btn-parar').onclick = function () {
            AF.core.cancelarTudo();
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.sons.tocar('parada');
            AF.core.log('PARADO pelo usuario.', '#f87171');
            AF.core.setBotoes(false);
        };

        // btn-copiar: abre a janela visual de relatório
        docC.getElementById('btn-copiar').onclick = function () {
            if (!AF.estado.relatorioLista || !AF.estado.relatorioLista.length) {
                AF.core.log('Nenhum relatorio disponivel.', '#f87171');
                return;
            }
            AF.relatorios.abrirJanela();
            AF.sons.tocar('copia');
        };

        AF.core.log('Pronto para executar.', '#a3e635');
        AF.core.setBotoes(false);
    };

})();
