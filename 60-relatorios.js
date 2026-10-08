(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    var janelaRelatorio = null;
    var janelaIrregularidades = null;
    var intervaloJanela = null;
    var ultimoVersaoJanela = -1;
    var estadoVisao = {
        col: 'nome',
        dir: 1,
        filtros: [],
        busca: '',
        extremo: null,
        selecionado: null,
        expandidos: {}
    };

    function escaparHTML(valor) {
        var entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caractere) {
            return entidades[caractere];
        });
    }

    function normSort(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function abrevNome(nome) {
        var clean = String(nome || '').replace(/\s+\d+$/, '').trim();
        var parts = clean.split(' ');
        if (parts.length <= 2) return clean;
        var skip = ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'];
        var primeiro = parts[0];
        var ultimo   = parts[parts.length - 1];
        var meio = parts.slice(1, -1).map(function (p) {
            return skip.indexOf(p.toUpperCase()) >= 0 ? p : p.charAt(0) + '.';
        }).join(' ');
        return primeiro + ' ' + meio + ' ' + ultimo;
    }

    // ── Habilitar botão copiar (mantido para compor o status no painel) ────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) {
                btn.disabled = false;
                btn.title = titulo || 'Relatório';
            }
        } catch (e) {}
    };

    // ── Geração de HTML puro para componentes da janela ──────────────────

    AF.relatorios.gerarEsqueletoHTML = function () {
        return '<!DOCTYPE html><html lang="pt-BR" data-theme="dark"><head><meta charset="UTF-8">'
            + '<title>FPW — Relatório Unificado</title>'
            + '<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">'
            + '<style>'
            + ':root,[data-theme="dark"]{'
            + '--bg:#0f1117;--surface:#161b22;--surface2:#0d1117;--border:rgba(255,255,255,.08);'
            + '--text:#e2e8f0;--text-muted:#94a3b8;--text-faint:#64748b;--hdr-bg:#0d1117;'
            + '--tbl-head:#0d1117;--tbl-head-txt:#94a3b8;--tbl-row-hover:rgba(255,255,255,.04);'
            + '--tbl-row-active:rgba(59,130,246,.15);--tbl-row-active-outline:rgba(59,130,246,.35);'
            + '--card-bg:#161b22;--card-border:rgba(255,255,255,.10);--card-active-border:#3b82f6;'
            + '--blue:#3b82f6;--orange:#f97316;--red:#ef4444;--green:#22c55e;'
            + '}'
            + '*{box-sizing:border-box;margin:0;padding:0}'
            + 'html,body{background:var(--bg);color:var(--text);font-family:"Satoshi","Inter",sans-serif;font-size:12px;height:100%;overflow:hidden}'
            + '.frame{display:flex;flex-direction:column;height:100vh;overflow:hidden}'
            + '.hdr{background:var(--hdr-bg);border-bottom:1px solid var(--border);padding:10px 16px;flex-shrink:0}'
            + '.hdr-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}'
            + '.hdr-title{font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}'
            + '.hdr-actions{display:flex;align-items:center;gap:8px}'
            + '.cards-grid{display:flex;flex-direction:column;gap:5px;padding:6px 16px;max-height:40vh;overflow-y:auto;background:var(--surface2);border-bottom:1px solid var(--border);flex-shrink:0}'
            + '.grp{width:100%;border:1px solid var(--grp-border);background:var(--grp-bg);border-radius:6px;padding:4px 8px;display:flex;flex-direction:row;align-items:stretch;gap:10px}'
            + '.grp-title{flex:0 0 92px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--grp-fg);display:flex;align-items:center}'
            + '.grp-items{flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:5px}'
            + '.grp-green{--grp-bg:rgba(34,197,94,.06);--grp-border:rgba(34,197,94,.28);--grp-fg:#4ade80;--card-bg:rgba(34,197,94,.12)}'
            + '.grp-red{--grp-bg:rgba(239,68,68,.06);--grp-border:rgba(239,68,68,.28);--grp-fg:#f87171;--card-bg:rgba(239,68,68,.12)}'
            + '.grp-blue{--grp-bg:rgba(59,130,246,.06);--grp-border:rgba(59,130,246,.28);--grp-fg:#60a5fa;--card-bg:rgba(59,130,246,.12)}'
            + '.card{background:var(--card-bg);border:1px solid var(--grp-border);border-radius:5px;padding:3px 7px;display:flex;flex-direction:column;gap:1px;cursor:pointer;transition:border-color .15s,box-shadow .15s;user-select:none}'
            + '.card:hover{border-color:var(--grp-fg)}'
            + '.card.card-active{border-color:var(--grp-fg);box-shadow:0 0 0 1px var(--grp-fg)}'
            + '.card-static{cursor:default}.card-static:hover{border-color:var(--grp-border)}'
            + '.card-wide{grid-column:span 2}'
            + '.card-title{font-size:9px;font-weight:600;color:var(--text-muted);display:flex;justify-content:space-between;gap:4px;line-height:1.2}'
            + '.card-val{font-size:14px;font-weight:700;color:var(--text);line-height:1.15}'
            + '.card-sub{font-size:9px;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:0 8px;line-height:1.2}'
            + '.mini-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
            + '.mini{border:1px solid var(--grp-border);background:rgba(15,17,23,.35);border-radius:4px;padding:2px 6px;display:flex;flex-direction:column;gap:0}'
            + '.mm{cursor:pointer;border-radius:3px;padding:0 2px}'
            + '.mm:hover{background:rgba(255,255,255,.10);color:var(--text)}'
            + '.mm.mm-active{background:var(--grp-fg);color:#0f1117;font-weight:700}'
            + '.mm.mm-off{cursor:default;opacity:.5}.mm.mm-off:hover{background:none;color:inherit}'
            + '.sg-pos{color:#22c55e;font-weight:700}.sg-neg{color:#ef4444;font-weight:700}'
            + '.tbl-wrap{flex:1;overflow:auto}'
            + 'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
            + 'thead th{background:var(--tbl-head);color:var(--tbl-head-txt);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5;user-select:none;text-align:right}'
            + 'thead th:first-child{text-align:left;width:180px}'
            + 'thead th[data-col]{cursor:pointer}'
            + 'thead th.sort-active{color:var(--blue)}'
            + 'thead th.irreg-copy-col{width:44px;text-align:center}'
            + 'thead th.detail-col{width:44px;text-align:center}'
            + 'tbody tr{cursor:pointer;transition:background .1s}'
            + 'tbody tr:hover{background:var(--tbl-row-hover)}'
            + 'tbody tr.active-row{background:var(--tbl-row-active)!important;outline:1px solid var(--tbl-row-active-outline)}'
            + 'tbody tr.row-unread{opacity:.45}'
            + 'tbody tr.row-processing{font-weight:500;animation:pulse-row 1.4s ease-in-out infinite}'
            + '@keyframes pulse-row{0%,100%{background:rgba(59,130,246,.08)}50%{background:rgba(59,130,246,.30)}}'
            + '@media (prefers-reduced-motion:reduce){tbody tr.row-processing{animation:none;background:rgba(59,130,246,.18)}}'
            + 'td{padding:5px 10px;text-align:right;border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
            + 'td:first-child{text-align:left}'
            + '.cell-nome{display:flex;align-items:center;min-width:0}'
            + '.nome-txt{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}'
            + 'td.cell-sem-marcacoes{text-align:center;color:var(--text-faint);font-style:italic}'
            + '.cell-chip{display:inline-block;padding:1px 6px;border-radius:4px;font-weight:600;font-size:11px}'
            + '.chip-blue{background:rgba(59,130,246,.15);color:#93c5fd}'
            + '.chip-orange{background:rgba(249,115,22,.15);color:#fdba74}'
            + '.chip-red{background:rgba(239,68,68,.18);color:#fca5a5}'
            + '.chip-zero{color:var(--text-faint)}'
            + '.chip-dash{color:var(--text-faint)}'
            + '.btn-copy-irreg,.btn-detalhe-ajuste{border:1px solid var(--border);background:rgba(255,255,255,.06);color:var(--text-muted);border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px}'
            + '.btn-copy-irreg:hover:not(:disabled),.btn-detalhe-ajuste:hover:not(:disabled){background:rgba(59,130,246,.2);color:#bfdbfe}'
            + '.btn-copy-irreg:disabled,.btn-detalhe-ajuste:disabled{opacity:.35;cursor:default}'
            + '.btn-detalhe-ajuste.expanded{background:rgba(59,130,246,.25);color:#93c5fd;border-color:var(--blue)}'
            + 'tbody tr.detail-row{background:rgba(15,23,42,.65)!important;cursor:default}'
            + 'tbody tr.detail-row td{padding:8px 14px;text-align:left;white-space:normal;overflow:visible}'
            + '.detail-box{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;line-height:1.5;color:var(--text);white-space:pre-wrap;word-break:break-word}'
            + '.badge{font-size:9px;padding:1px 5px;border-radius:99px;font-weight:600;margin-left:4px;vertical-align:middle;flex-shrink:0}'
            + '.badge-parcial{background:rgba(249,115,22,.2);color:#fdba74}'
            + '.action-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 14px;background:var(--surface2);border-top:1px solid var(--border);flex-shrink:0}'
            + '.btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:5px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}'
            + '.btn-blue{background:#3b82f6;color:#fff}.btn-blue:hover{filter:brightness(1.15)}.btn-blue.ok{background:#22c55e}'
            + '.btn-gray{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border)}.btn-gray:hover{background:rgba(255,255,255,.14)}'
            + '.busca{width:210px;background:rgba(255,255,255,.06);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:5px 9px;font-size:11px;font-family:inherit}'
            + '.busca:focus{outline:none;border-color:var(--blue)}'
            + '.notice-bar{display:none;background:#7c2d12;color:#ffedd5;padding:4px 12px;font-size:11px;text-align:center}'
            + '</style></head><body>'
            + '<div class="frame">'
            + '<div class="hdr">'
            +   '<div class="hdr-row1">'
            +     '<div class="hdr-title" id="fpw-hdr-title">📊 Relatório do Time</div>'
            +     '<div class="hdr-actions">'
            +       '<input type="search" class="busca" id="fpw-busca" placeholder="Buscar funcionário..." autocomplete="off" title="Buscar por nome (combina com os indicadores ativos)">'
            +       '<button class="btn btn-gray" id="btn-janela-log" title="Abrir janela de log completo">📜 Log</button>'
            +       '<button class="btn btn-blue" id="btn-janela-copiar">📋 Copiar TSV</button>'
            +     '</div>'
            +   '</div>'
            +   '<div id="fpw-hdr-meta" style="font-size:11px;color:var(--text-muted);display:flex;gap:16px;"></div>'
            + '</div>'
            + '<div class="notice-bar" id="fpw-notice-bar"></div>'
            + '<div class="cards-grid" id="fpw-cards-grid"></div>'
            + '<div class="tbl-wrap">'
            +   '<table id="fpw-table">'
            +     '<thead><tr id="fpw-thead-tr"></tr></thead>'
            +     '<tbody id="fpw-tbody"></tbody>'
            +   '</table>'
            + '</div>'
            + '<div class="action-bar">'
            +   '<span style="font-size:11px;color:var(--text-faint);" id="fpw-status-hint">👆 Clique na linha para navegar no FPW • Clique nos cards para filtrar</span>'
            +   '<span style="font-size:11px;color:var(--text-muted);" id="fpw-rodape-contagem"></span>'
            +   '<button class="btn btn-blue" id="btn-exportar-irregularidades">📝 Exportar irregularidades</button>'
            + '</div>'
            + '</div></body></html>';
    };

    // ── Renderização dos Indicadores (3 caixas temáticas) ─────────────────

    function semSinal(v) {
        return String(v == null ? '' : v).replace(/^[+\-−]/, '');
    }

    // Sinal colorido apenas no caractere; o valor mantém a cor do texto.
    function horaComSinal(v, sinal) {
        var s = sinal < 0 ? '<span class="sg-neg">−</span>' : '<span class="sg-pos">+</span>';
        return s + escaparHTML(semSinal(v));
    }

    AF.relatorios.gerarCardsHTML = function (resumo, filtrosAtivos, extremoAtivo) {
        var ativos = Array.isArray(filtrosAtivos) ? filtrosAtivos : (filtrosAtivos ? [filtrosAtivos] : []);
        function card(id, titulo, valor, sub, tip, extraClass) {
            var clicavel = !!id;
            var ativo = clicavel && ativos.indexOf(id) !== -1;
            var cls = 'card ' + (clicavel ? '' : 'card-static ') + (ativo ? 'card-active ' : '') + (extraClass || '');
            var dataAttr = clicavel ? ' data-filtro="' + id + '"' : '';
            var titleAttr = tip ? ' title="' + escaparHTML(tip) + '"' : '';
            return '<div class="' + cls + '"' + dataAttr + titleAttr + '>'
                + '<div class="card-title"><span>' + escaparHTML(titulo) + '</span>' + (ativo ? '<span style="color:var(--grp-fg)">●</span>' : '') + '</div>'
                + '<div class="card-val">' + valor + '</div>'
                + (sub ? '<div class="card-sub">' + sub + '</div>' : '')
                + '</div>';
        }

        function grupo(cor, titulo, cards) {
            return '<div class="grp grp-' + cor + '"><div class="grp-title">' + escaparHTML(titulo) + '</div>'
                + '<div class="grp-items">' + cards + '</div></div>';
        }

        // mín/máx clicáveis: ordenam a tabela pela coluna e excluem quem está zerado nela.
        function minMax(o, col, sinal, comSinal) {
            function item(modo, rotulo, valor, nome) {
                var vazio = !valor || valor === '-';
                var ativo = extremoAtivo && extremoAtivo.col === col && extremoAtivo.modo === modo && extremoAtivo.sinal === sinal;
                var cls = 'mm' + (vazio ? ' mm-off' : '') + (ativo ? ' mm-active' : '');
                var attrs = vazio ? '' : ' data-mm="' + col + ':' + modo + ':' + sinal + '"'
                    + ' title="' + escaparHTML((modo === 'min' ? 'Menor' : 'Maior') + (nome ? ': ' + nome : '') + ' — clique para ordenar a tabela') + '"';
                var txt = vazio ? '-' : (comSinal ? horaComSinal(valor, sinal) : escaparHTML(valor));
                return '<span class="' + cls + '"' + attrs + '>' + rotulo + ' ' + txt + '</span>';
            }
            return item('min', 'mín', o.min, o.minNome) + item('max', 'máx', o.max, o.maxNome);
        }

        var fol = resumo.folgas;
        var irr = resumo.irregularidades;

        var gFolgas = grupo('green', 'Folgas',
            card('pendentes', 'Movim.', escaparHTML(fol.fracaoTexto),
                '<span>' + fol.pendentes + ' pendente(s)</span>', 'Movimentadas / total considerado. Clique para filtrar quem ainda tem folga pendente.')
            + card('presas', 'Presas', String(fol.presas), '', 'Folgas que permaneceram presas. Clique para filtrar.')
        );

        var gIrreg = grupo('red', 'Irregularidades',
            card('semES', 'Sem Entrada/Saída', String(irr.semES.total), '<span>' + irr.semES.funcs + ' func.</span>')
            + card('interj', 'Interjornada', String(irr.interj.total), '<span>' + irr.interj.funcs + ' func.</span>')
            + card('britanica', 'Marc. Britânicas', String(irr.britanica.total), '<span>' + irr.britanica.funcs + ' func.</span>')
            + card('naoPreenchida', 'Folhas não Preenchidas', String(irr.naoPreenchida.total), '<span>' + irr.naoPreenchida.funcs + ' folha(s)</span>')
        );

        function miniHec(rotuloSinal, dados, sinal) {
            var tot = dados.total === '00:00' ? '00:00' : dados.total;
            return '<div class="mini">'
                + '<div class="card-val">' + horaComSinal(tot, sinal) + '</div>'
                + '<div class="card-sub">' + minMax(dados, 'hec', sinal, true) + '</div>'
                + '</div>';
        }

        var cardHec = '<div class="card card-static card-wide">'
            + '<div class="card-title"><span>70% (Compensáveis)</span></div>'
            + '<div class="mini-row">' + miniHec('+', resumo.hecPos, 1) + miniHec('−', resumo.hecNeg, -1) + '</div>'
            + '</div>';

        var gHoras = grupo('blue', 'Hora Extra',
            card(null, '100% (Acima das 10h)', escaparHTML(resumo.he.total), minMax(resumo.he, 'he', 0, false))
            + card(null, '100% (Feriado)', escaparHTML(resumo.hef.total), minMax(resumo.hef, 'hef', 0, false))
            + cardHec
        );

        return gFolgas + gIrreg + gHoras;
    };
    // ── Renderização do Cabeçalho da Tabela ───────────────────────────────

    var COLUNAS_TABELA = [
        { id: 'nome', label: 'Nome', align: 'left' },
        { id: 'folgas', label: 'Folgas', align: 'right' },
        { id: 'cod47', label: 'Cód 47', align: 'right' },
        { id: 'semES', label: 'Sem E/S', align: 'right' },
        { id: 'interj', label: 'Interj.', align: 'right' },
        { id: 'britanica', label: 'Britânicas', align: 'right' },
        { id: 'naoPreenchida', label: '% Não Preench.', align: 'right' },
        { id: 'he', label: 'HE 100%', align: 'right' },
        { id: 'hef', label: 'HEF 100%', align: 'right' },
        { id: 'hec', label: 'HEC 70%', align: 'right' }
    ];

    // Colunas extras além das métricas: cópia de irregularidades e detalhe de ajustes.
    var COLUNAS_EXTRAS = 2;
    var TOTAL_COLUNAS_TABELA = COLUNAS_TABELA.length + COLUNAS_EXTRAS;
    var COLUNAS_APOS_NOME = TOTAL_COLUNAS_TABELA - 1;

    AF.relatorios.gerarTheadHTML = function (sortCol, sortDir) {
        var colunas = COLUNAS_TABELA;

        var h = '';
        for (var i = 0; i < colunas.length; i++) {
            var c = colunas[i];
            var ativo = sortCol === c.id;
            var seta = ativo ? (sortDir === 1 ? ' ↑' : ' ↓') : '';
            var cls = ativo ? ' class="sort-active"' : '';
            h += '<th data-col="' + c.id + '"' + cls + ' style="text-align:' + c.align + '">'
                + escaparHTML(c.label) + '<span style="opacity:.6;font-size:9px;">' + seta + '</span></th>';
        }
        h += '<th class="irreg-copy-col" title="Copiar irregularidades">📋</th>';
        h += '<th class="detail-col" title="Detalhe dos ajustes">🔍</th>';
        return h;
    };

    // ── Renderização das Linhas da Tabela ─────────────────────────────────

    function formatarTooltipFolgas(f) {
        if (!f.folgas.presasDetalhe || !f.folgas.presasDetalhe.length) return '';
        var t = 'Folgas presas: ' + f.folgas.presasDetalhe.map(function (p) {
            return (p.dataFolga || p.data) + ' (' + (p.motivo || 'fase ' + p.fase) + ')';
        }).join('; ');
        return ' title="' + escaparHTML(t) + '"';
    }

    function formatarTooltipDias(dias, titulo) {
        if (!dias || !dias.length) return '';
        var lista = dias.map(function (d) { return typeof d === 'string' ? d : d.data; });
        return ' title="' + escaparHTML(titulo + ': ' + lista.join(', ')) + '"';
    }

    function formatarTooltipNaoPreenchida(np) {
        if (!np.avaliada) return '';
        var t = 'Dias visíveis: ' + np.visiveis + ', preenchidos: ' + np.preenchidos;
        if (np.criterios && np.criterios.length) {
            t += ' (Critério: ' + np.criterios.join(', ') + ')';
        }
        return ' title="' + escaparHTML(t) + '"';
    }

    AF.relatorios.gerarTbodyHTML = function (nomes, atualEmExecucao, selecionado, expandidos) {
        expandidos = expandidos || estadoVisao.expandidos || {};
        var h = '';

        for (var j = 0; j < nomes.length; j++) {
            var nome = nomes[j];
            var d = AF.modelo.obterDadosFunc(nome);
            var ehAtual = atualEmExecucao && atualEmExecucao === nome;
            var ehSel = selecionado && selecionado === nome;

            var trCls = [];
            if (!d.processado) trCls.push('row-unread');
            if (ehAtual) trCls.push('row-processing');
            if (ehSel) trCls.push('active-row');

            var badges = '';
            if (d.parcial) badges += '<span class="badge badge-parcial">parcial</span>';

            var celulaNome = '<td title="' + escaparHTML(nome) + '"><div class="cell-nome"><span class="nome-txt">'
                + escaparHTML(abrevNome(nome)) + '</span>' + badges + '</div></td>';
            var atributosLinha = ' data-nome="' + escaparHTML(nome) + '"' + (ehAtual ? ' aria-current="true"' : '');

            if (d.vazia) {
                h += '<tr class="' + trCls.join(' ') + '"' + atributosLinha + '>'
                    + celulaNome
                    + '<td class="cell-sem-marcacoes" colspan="' + COLUNAS_APOS_NOME + '">Sem Marcações na Folha</td>'
                    + '</tr>';
                continue;
            }
            // Chips de folgas e cod47
            var chipF = d.folgas.texto === '-' ? '<span class="chip-dash">-</span>' :
                (d.folgas.estado === 'concluida' ? '<span class="cell-chip chip-blue">' + d.folgas.texto + '</span>' :
                (d.folgas.estado === 'atencao' ? '<span class="cell-chip chip-orange"' + formatarTooltipFolgas(d) + '>' + d.folgas.texto + '</span>' :
                (d.folgas.estado === 'pendente' ? '<span class="cell-chip chip-blue">' + d.folgas.texto + '</span>' :
                '<span class="chip-zero">0</span>')));

            var chipC = d.cod47.texto === '-' ? '<span class="chip-dash">-</span>' :
                (d.cod47.estado === 'concluida' ? '<span class="cell-chip chip-blue">' + d.cod47.texto + '</span>' :
                (d.cod47.estado === 'atencao' ? '<span class="cell-chip chip-orange">' + d.cod47.texto + '</span>' :
                (d.cod47.estado === 'pendente' ? '<span class="cell-chip chip-blue">' + d.cod47.texto + '</span>' :
                '<span class="chip-zero">0</span>')));

            // Irregularidades
            function chipIrreg(val, dias, tit) {
                if (val === null || val === undefined) return '<span class="chip-dash">-</span>';
                if (!val) return '<span class="chip-zero">0</span>';
                return '<span class="cell-chip chip-red"' + formatarTooltipDias(dias, tit) + '>' + val + '</span>';
            }

            var chipNP = d.naoPreenchida.texto === '-' ? '<span class="chip-dash">-</span>' :
                '<span class="cell-chip chip-red"' + formatarTooltipNaoPreenchida(d.naoPreenchida) + '>' + d.naoPreenchida.texto + '</span>';
            var textoIrregularidades = AF.modelo.textoIrregularidades(nome);
            var botaoIrregularidades = '<button type="button" class="btn-copy-irreg" data-nome="' + escaparHTML(nome) + '"'
                + (textoIrregularidades ? '' : ' disabled')
                + ' aria-label="' + (textoIrregularidades ? 'Copiar irregularidades de ' + escaparHTML(nome) : 'Sem irregularidades para exportar') + '"'
                + ' title="' + (textoIrregularidades ? 'Copiar irregularidades de ' + escaparHTML(nome) : 'Sem irregularidades para exportar') + '">📋</button>';

            // Horas
            function cellHora(v) {
                if (!v) return '<span class="chip-dash">-</span>';
                if (v === '00:00') return '<span class="chip-zero">00:00</span>';
                var neg = String(v).charAt(0) === '-';
                return '<span style="color:' + (neg ? 'var(--red)' : 'var(--green)') + ';font-weight:600">' + escaparHTML(v) + '</span>';
            }

            var isExpandido = !!expandidos[nome];
            var podeDetalhar = !!d.temDetalhes;
            var botaoDetalhe = '<button type="button" class="btn-detalhe-ajuste' + (isExpandido ? ' expanded' : '') + '" data-nome="' + escaparHTML(nome) + '"'
                + (podeDetalhar ? '' : ' disabled')
                + ' aria-expanded="' + (isExpandido ? 'true' : 'false') + '"'
                + ' aria-label="' + (podeDetalhar ? 'Detalhes da linha de ' + escaparHTML(nome) : 'Sem detalhes para exibir') + '"'
                + ' title="' + (podeDetalhar ? (isExpandido ? 'Recolher detalhes da linha' : 'Expandir detalhes da linha') : 'Sem detalhes para exibir') + '">🔍</button>';

            h += '<tr class="' + trCls.join(' ') + '"' + atributosLinha + '>'
                + celulaNome
                + '<td>' + chipF + '</td>'
                + '<td>' + chipC + '</td>'
                + '<td>' + chipIrreg(d.semES.total, d.semES.dias, 'Sem Entrada/Saída') + '</td>'
                + '<td>' + chipIrreg(d.interj.total, d.interj.dias, 'Interjornada') + '</td>'
                + '<td>' + chipIrreg(d.britanica.total, d.britanica.dias, 'Marcação Britânica') + '</td>'
                + '<td>' + chipNP + '</td>'
                + '<td>' + cellHora(d.HE) + '</td>'
                + '<td>' + cellHora(d.HEF) + '</td>'
                + '<td>' + cellHora(d.HEC) + '</td>'
                + '<td>' + botaoIrregularidades + '</td>'
                + '<td>' + botaoDetalhe + '</td>'
                + '</tr>';

            if (isExpandido) {
                var textoDet = AF.modelo.textoDetalheAjuste(nome);
                h += '<tr class="detail-row" data-detalhe-de="' + escaparHTML(nome) + '">'
                    + '<td colspan="' + TOTAL_COLUNAS_TABELA + '">'
                    + '<pre class="detail-box">' + escaparHTML(textoDet) + '</pre>'
                    + '</td></tr>';
            }
        }
        return h;
    };

    // ── Cabeçalho: mês, progresso e duração da última execução ───────────

    function fmtDuracao(ms) {
        var seg = Math.max(0, Math.round(ms / 1000));
        var min = Math.floor(seg / 60);
        return min + 'min ' + String(seg % 60).padStart(2, '0') + 's';
    }

    function fmtHora(ts) {
        var d = new Date(ts);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    AF.relatorios.gerarMetaHTML = function (est, agora) {
        agora = agora || Date.now();
        var total = est.ordem.length;
        var proc = 0;
        est.ordem.forEach(function (n) { if (AF.modelo.obterDadosFunc(n).processado) proc++; });
        var rot = { 'em-andamento': 'em andamento', concluida: 'concluída', cancelada: 'cancelada', interrompida: 'interrompida' };
        var h = '<span><b>Mês:</b> ' + escaparHTML(est.mes || 'Não definido') + '</span>'
            + '<span><b>Processados:</b> ' + proc + ' / ' + total + '</span>';
        [['analise', 'Análise'], ['ajuste', 'Ajuste']].forEach(function (par) {
            var ex = est.execs && est.execs[par[0]];
            if (!ex || !ex.inicio) return;
            var andamento = ex.status === 'em-andamento';
            var dur = fmtDuracao((ex.fim || agora) - ex.inicio);
            h += '<span><b>' + par[1] + ':</b> ' + (rot[ex.status] || escaparHTML(ex.status))
                + ' • ' + dur + (andamento ? '' : ' • ' + fmtHora(ex.fim || ex.inicio)) + '</span>';
        });
        return h;
    };

    var ultimoMetaHTML = null;
    function atualizarMeta(win) {
        try {
            var el = win.document.getElementById('fpw-hdr-meta');
            if (!el) return;
            var html = AF.relatorios.gerarMetaHTML(AF.modelo.obterEstado());
            if (html !== ultimoMetaHTML) { el.innerHTML = html; ultimoMetaHTML = html; }
        } catch (e) {}
    }

    function obterNomesVisiveis(visao) {
        visao = visao || estadoVisao;
        var filtros = visao.filtros || (visao.filtro ? [visao.filtro] : []);
        var filtrados = AF.modelo.filtrar(filtros, visao.busca);
        return visao.extremo
            ? AF.modelo.ordenarPorExtremo(filtrados, visao.extremo.col, visao.extremo.modo, visao.extremo.sinal)
            : AF.modelo.ordenar(filtrados, visao.col, visao.dir);
    }

    AF.relatorios.obterNomesVisiveis = obterNomesVisiveis;

    // ── Condutor da Janela Viva ──────────────────────────────────────────

    function atualizarJanelaDOM(win, forcar) {
        if (!win || win.closed) return;
        var est = AF.modelo.obterEstado();
        if (!forcar && est.versao === ultimoVersaoJanela) return;
        ultimoVersaoJanela = est.versao;

        try {
            var doc = win.document;

            // Metadados no topo (mês, progresso e duração das execuções)
            atualizarMeta(win);

            // Cards de Resumo
            var resumo = AF.modelo.resumo();
            var cardsGrid = doc.getElementById('fpw-cards-grid');
            if (cardsGrid) {
                cardsGrid.innerHTML = AF.relatorios.gerarCardsHTML(resumo, estadoVisao.filtros, estadoVisao.extremo);
                cardsGrid.querySelectorAll('.mm[data-mm]').forEach(function (m) {
                    m.onclick = function (ev) {
                        if (ev && ev.stopPropagation) ev.stopPropagation();
                        var p = this.getAttribute('data-mm').split(':');
                        var novo = { col: p[0], modo: p[1], sinal: parseInt(p[2], 10) };
                        var ex = estadoVisao.extremo;
                        estadoVisao.extremo = (ex && ex.col === novo.col && ex.modo === novo.modo && ex.sinal === novo.sinal) ? null : novo;
                        atualizarJanelaDOM(win, true);
                    };
                });
                // Bind clique dos cards
                cardsGrid.querySelectorAll('.card[data-filtro]').forEach(function (c) {
                    c.onclick = function () {
                        var f = this.getAttribute('data-filtro');
                        var pos = estadoVisao.filtros.indexOf(f);
                        if (pos === -1) estadoVisao.filtros.push(f);
                        else estadoVisao.filtros.splice(pos, 1);
                        atualizarJanelaDOM(win, true);
                    };
                });
            }

            // Thead
            var theadTr = doc.getElementById('fpw-thead-tr');
            if (theadTr) {
                theadTr.innerHTML = AF.relatorios.gerarTheadHTML(estadoVisao.col, estadoVisao.dir);
                theadTr.querySelectorAll('th[data-col]').forEach(function (th) {
                    th.onclick = function () {
                        var col = this.getAttribute('data-col');
                        estadoVisao.extremo = null;
                        if (estadoVisao.col === col) {
                            estadoVisao.dir *= -1;
                        } else {
                            estadoVisao.col = col;
                            estadoVisao.dir = col === 'nome' ? 1 : -1;
                        }
                        atualizarJanelaDOM(win, true);
                    };
                });
            }

            // Tbody
            var ex = estadoVisao.extremo;
            var nomesOrdenados = obterNomesVisiveis();
            var tbody = doc.getElementById('fpw-tbody');
            if (tbody) {
                tbody.innerHTML = AF.relatorios.gerarTbodyHTML(nomesOrdenados, est.atual, estadoVisao.selecionado, estadoVisao.expandidos);
                // Bind clique nas linhas
                tbody.querySelectorAll('tr[data-nome]').forEach(function (tr) {
                    tr.onclick = function () {
                        var nome = this.getAttribute('data-nome');
                        estadoVisao.selecionado = nome;
                        doc.querySelectorAll('tr.active-row').forEach(function (r) { r.classList.remove('active-row'); });
                        this.classList.add('active-row');

                        // Navegação no seletor da página principal
                        var notice = doc.getElementById('fpw-notice-bar');
                        if (AF.estado && AF.estado.rodando) {
                            if (notice) {
                                notice.style.display = 'block';
                                notice.textContent = 'A navegação entre funcionários está bloqueada durante a execução.';
                                setTimeout(function () { notice.style.display = 'none'; }, 3000);
                            }
                            return;
                        }
                        if (notice) notice.style.display = 'none';

                        try {
                            var f0 = window.top.frames[0];
                            var docC = f0.document;
                            var sel = docC.getElementById('lstNome') || docC.querySelector('select[name=lstNome]');
                            if (!sel) return;
                            var nn = normSort(nome);
                            for (var i = 0; i < sel.options.length; i++) {
                                if (normSort(sel.options[i].text) === nn) {
                                    sel.selectedIndex = i;
                                    try { f0.AjustaCodEmpresaEmpregado(docC.yourform.lstNome, docC.yourform.CodEmpresaEmpregado); } catch (e) {}
                                    try { f0.AtualizaFuncionario(); } catch (e) {
                                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                    break;
                                }
                            }
                        } catch (eNaveg) {}
                    };
                });
                tbody.querySelectorAll('.btn-copy-irreg[data-nome]').forEach(function (btn) {
                    btn.onclick = function (ev) {
                        if (ev && ev.stopPropagation) ev.stopPropagation();
                        if (this.disabled) return;
                        copiarIrregularidadeFuncionario(win, this);
                    };
                });
                tbody.querySelectorAll('.btn-detalhe-ajuste[data-nome]').forEach(function (btn) {
                    btn.onclick = function (ev) {
                        if (ev && ev.stopPropagation) ev.stopPropagation();
                        if (this.disabled) return;
                        var nome = this.getAttribute('data-nome');
                        estadoVisao.expandidos = estadoVisao.expandidos || {};
                        if (estadoVisao.expandidos[nome]) {
                            delete estadoVisao.expandidos[nome];
                        } else {
                            estadoVisao.expandidos[nome] = true;
                        }
                        atualizarJanelaDOM(win, true);
                    };
                });
            }

            // Rodapé
            var rodape = doc.getElementById('fpw-rodape-contagem');
            if (rodape) {
                rodape.textContent = 'Exibindo ' + nomesOrdenados.length + ' de ' + est.ordem.length + ' funcionários'
                    + (estadoVisao.filtros.length ? ' (Filtros ativos: ' + estadoVisao.filtros.map(AF.modelo.rotuloFiltro).join(' + ') + ')' : '')
                    + (estadoVisao.busca.trim() ? ' (Busca: "' + estadoVisao.busca.trim() + '")' : '')
                    + (ex ? ' (' + (ex.modo === 'min' ? 'menores' : 'maiores') + ' ' + ex.col.toUpperCase() + ', sem zerados)' : '');
            }

        } catch (eDOM) {
            console.error('[FPW] Erro ao atualizar DOM da janela de relatório:', eDOM);
        }
    }

    function copiarTSV(win) {
        var texto = AF.modelo.tsv();
        var btn = win.document.getElementById('btn-janela-copiar');
        if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
            win.navigator.clipboard.writeText(texto).then(function () {
                if (btn) {
                    btn.classList.add('ok');
                    btn.textContent = '✓ Copiado!';
                    setTimeout(function () { btn.classList.remove('ok'); btn.textContent = '📋 Copiar TSV'; }, 2000);
                }
            }).catch(function () { alert('Falha ao copiar.'); });
        } else {
            alert('Área de transferência indisponível.');
        }
    }

    function copiarTexto(win, texto) {
        function fallback() {
            try {
                var area = win.document.createElement('textarea');
                area.value = texto;
                win.document.body.appendChild(area);
                area.select();
                var ok = win.document.execCommand('copy');
                win.document.body.removeChild(area);
                return ok;
            } catch (e) {
                return false;
            }
        }
        try {
            if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
                return win.navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return fallback(); });
            }
        } catch (e) {}
        return Promise.resolve(fallback());
    }

    function notificarFalhaCopia(win, mensagem) {
        var notice = win && win.document && win.document.getElementById('fpw-notice-bar');
        if (notice) {
            notice.style.display = 'block';
            notice.textContent = mensagem;
            if (win && typeof win.setTimeout === 'function') {
                win.setTimeout(function () { notice.style.display = 'none'; }, 3000);
            }
            return;
        }
        try {
            if (win && typeof win.alert === 'function') {
                win.alert(mensagem);
                return;
            }
            if (typeof window.alert === 'function') {
                window.alert(mensagem);
                return;
            }
        } catch (e) {}
        if (AF.log && typeof AF.log.registrar === 'function') {
            AF.log.registrar(mensagem, '#f87171');
        }
    }

    function copiarIrregularidadeFuncionario(win, botao) {
        var nome = botao.getAttribute('data-nome');
        var texto = AF.modelo.textoIrregularidades(nome);
        if (!texto) return;
        copiarTexto(win, texto).then(function (ok) {
            if (!ok) {
                notificarFalhaCopia(win, 'Não foi possível copiar as irregularidades de ' + nome + '.');
                return;
            }
            var original = botao.textContent;
            botao.textContent = '✓';
            botao.classList.add('copied');
            win.setTimeout(function () {
                botao.textContent = original;
                botao.classList.remove('copied');
            }, 2000);
        });
    }

    function htmlJanelaIrregularidades() {
        return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>FPW - Irregularidades</title>'
            + '<style>html,body{height:100%;margin:0;background:#0f1117;color:#e2e8f0;font-family:Consolas,"Courier New",monospace;font-size:12px}'
            + '.bar{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.12)}'
            + '.bar b{font-family:system-ui,sans-serif;font-size:13px;margin-right:auto}.bar span{color:#94a3b8;font:11px system-ui,sans-serif}'
            + 'button{background:#3b82f6;color:#fff;border:0;border-radius:5px;padding:5px 12px;font-size:12px;cursor:pointer}'
            + 'button.ok{background:#22c55e}#fpw-irregularidades-texto{display:block;box-sizing:border-box;margin:0;height:calc(100% - 46px);overflow:auto;padding:10px 14px;white-space:pre-wrap;word-break:break-word;line-height:1.5;user-select:text}'
            + '</style></head><body><div class="bar"><b id="fpw-irregularidades-titulo"></b>'
            + '<span id="fpw-irregularidades-horario"></span><button id="fpw-irregularidades-copiar">Copiar tudo</button></div>'
            + '<pre id="fpw-irregularidades-texto"></pre></body></html>';
    }

    function horarioGeracao(data) {
        return String(data.getDate()).padStart(2, '0') + '/' + String(data.getMonth() + 1).padStart(2, '0') + '/'
            + data.getFullYear() + ' ' + String(data.getHours()).padStart(2, '0') + ':'
            + String(data.getMinutes()).padStart(2, '0') + ':' + String(data.getSeconds()).padStart(2, '0');
    }

    function preencherJanelaIrregularidades(win, texto) {
        var doc = win.document;
        doc.getElementById('fpw-irregularidades-titulo').textContent = 'Exportar irregularidades';
        doc.getElementById('fpw-irregularidades-horario').textContent = 'Gerado em ' + horarioGeracao(new Date());
        doc.getElementById('fpw-irregularidades-texto').textContent = texto;
        win._fpwTextoIrregularidades = texto;
        var btn = doc.getElementById('fpw-irregularidades-copiar');
        if (btn) {
            btn.onclick = function () {
                copiarTexto(win, win._fpwTextoIrregularidades).then(function (ok) {
                    if (!ok) {
                        notificarFalhaCopia(win, 'Não foi possível copiar as irregularidades.');
                        return;
                    }
                    btn.textContent = 'Copiado!';
                    btn.classList.add('ok');
                    win.setTimeout(function () {
                        btn.textContent = 'Copiar tudo';
                        btn.classList.remove('ok');
                    }, 2000);
                });
            };
        }
    }

    AF.relatorios.abrirExportacaoIrregularidades = function () {
        var texto = AF.modelo.textoIrregularidadesTime(obterNomesVisiveis(), estadoVisao.filtros, estadoVisao.busca);
        if (janelaIrregularidades && !janelaIrregularidades.closed) {
            janelaIrregularidades.focus();
            preencherJanelaIrregularidades(janelaIrregularidades, texto);
            return janelaIrregularidades;
        }

        var win = window.open('', 'fpw-irregularidades', 'width=780,height=620,left=120,top=80,resizable=yes,scrollbars=yes');
        if (!win) {
            notificarFalhaCopia(janelaRelatorio, 'A janela de exportação foi bloqueada pelo navegador.');
            return null;
        }
        janelaIrregularidades = win;
        win.document.open();
        win.document.write(htmlJanelaIrregularidades());
        win.document.close();
        preencherJanelaIrregularidades(win, texto);
        return win;
    };

    AF.relatorios.abrirJanela = function () {
        if (janelaRelatorio && !janelaRelatorio.closed) {
            try { janelaRelatorio.focus(); } catch (e) {}
            atualizarJanelaDOM(janelaRelatorio, true);
            return janelaRelatorio;
        }

        var win = window.open('', 'fpw-relatorio', 'width=1100,height=750,left=60,top=40,resizable=yes,scrollbars=yes');
        if (!win) {
            if (AF.log && typeof AF.log.registrar === 'function') {
                AF.log.registrar('Popup do relatório bloqueado pelo navegador.', '#f87171');
            }
            return null;
        }

        janelaRelatorio = win;
        ultimoVersaoJanela = -1;
        ultimoMetaHTML = null;

        win.document.open();
        win.document.write(AF.relatorios.gerarEsqueletoHTML());
        win.document.close();

        // Botões estáticos do cabeçalho
        var btnLog = win.document.getElementById('btn-janela-log');
        if (btnLog) {
            btnLog.onclick = function () {
                if (AF.log && typeof AF.log.abrirJanela === 'function') {
                    AF.log.abrirJanela();
                }
            };
        }

        var btnCopiar = win.document.getElementById('btn-janela-copiar');
        if (btnCopiar) {
            btnCopiar.onclick = function () { copiarTSV(win); };
        }
        var campoBusca = win.document.getElementById('fpw-busca');
        if (campoBusca) {
            var timerBusca = null;
            campoBusca.value = estadoVisao.busca;
            campoBusca.oninput = function () {
                estadoVisao.busca = campoBusca.value;
                var aplicar = function () { atualizarJanelaDOM(win, true); };
                if (typeof win.setTimeout === 'function') {
                    if (timerBusca !== null && typeof win.clearTimeout === 'function') win.clearTimeout(timerBusca);
                    timerBusca = win.setTimeout(aplicar, 120);
                } else {
                    aplicar();
                }
            };
        }

        var btnExportar = win.document.getElementById('btn-exportar-irregularidades');
        if (btnExportar) {
            btnExportar.onclick = function () { AF.relatorios.abrirExportacaoIrregularidades(); };
        }

        atualizarJanelaDOM(win, true);

        if (typeof setInterval === 'function') {
            if (intervaloJanela) clearInterval(intervaloJanela);
            intervaloJanela = setInterval(function () {
                if (!janelaRelatorio || janelaRelatorio.closed) {
                    clearInterval(intervaloJanela);
                    intervaloJanela = null;
                    return;
                }
                atualizarMeta(janelaRelatorio);
                atualizarJanelaDOM(janelaRelatorio, false);
            }, 1000);
        }

        return win;
    };

    // Stubs para retrocompatibilidade
    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var T = '\t';
        var rel = 'RELATORIO DE ANALISE\n';
        for (var i = 0; i < (lista || []).length; i++) {
            var re = lista[i];
            if (re.lido) {
                rel += (re.nome || '').trim() + T + (re.folgas || 0) + T + (re.cod47 || 0) + T + (re.irregs || 0) + T + (re.interj || 0) + T + (re.HE || '00:00') + T + (re.HEF || '00:00') + T + (re.HEC || '00:00') + '\n';
            }
        }
        AF.estado.relatorio = rel;
        AF.estado.textoCopiavel = rel;
        AF.estado.relatorioLista = (lista || []).slice();
        if (AF.log && typeof AF.log.eventosDaExecucao === 'function') {
            AF.estado.relatorioLog = AF.log.eventosDaExecucao();
        } else {
            AF.estado.relatorioLog = (AF.estado.logBuffer || []).slice();
        }
    };

    AF.relatorios.gerarFolgas = function (relStats, relLista, tempoMs, cancelado, diagnostico) {
        var T = '\t';
        var rel = 'RELATORIO DE AJUSTE\n';
        rel += 'Status: ' + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        if (cancelado && diagnostico) {
            var detalhe = typeof diagnostico === 'string' ? diagnostico :
                (diagnostico.stage + ': ' + diagnostico.reason +
                    (diagnostico.unconfirmed ? ' (resultado nao confirmado)' : ''));
            rel += 'Motivo da interrupcao: ' + detalhe + '\n';
        }
        for (var i = 0; i < (relLista || []).length; i++) {
            var r = relLista[i];
            if (r.parcial) {
                rel += (r.nome || '').trim() + T + (r.folgasAlteradas || 0) + T + T + (r.folgasSemAlteracao || 0) + '\n';
            } else if (r.lido) {
                rel += (r.nome || '').trim() + T + (r.folgasAlteradas || 0) + T + (r.linhas47 || 0) + T + (r.folgasSemAlteracao || 0) + T + (r.irregs || 0) + T + (r.interj || 0) + T + (r.HE || '00:00') + T + (r.HEF || '00:00') + T + (r.HEC || '00:00') + '\n';
            }
        }
        AF.estado.relatorio = rel;
        AF.estado.textoCopiavel = rel;
        AF.estado.relatorioMeta = {
            titulo: 'Relatório de Ajuste',
            status: cancelado ? 'INTERROMPIDO' : 'CONCLUÍDO',
            folhas: (relStats && relStats.totalFolhas) || 0
        };
        var listaJanela = [];
        for (var j = 0; j < (relLista || []).length; j++) {
            var item = relLista[j];
            listaJanela.push({
                nome: item.nome,
                folgas: item.folgasAlteradas != null ? item.folgasAlteradas : 0,
                presas: item.folgasSemAlteracao != null ? item.folgasSemAlteracao : 0,
                lido: !!item.lido,
                parcial: !!item.parcial,
                britanica: item.britanica != null ? item.britanica : null,
                naoPreenchida: item.naoPreenchida || null,
                dias: item.dias || null
            });
        }
        AF.estado.relatorioLista = listaJanela;
    };

    console.log('[FPW] 60-relatorios carregado. v2.0 - janela de relatorio ao vivo e unificada');
})();