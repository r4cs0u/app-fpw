(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    var janelaRelatorio = null;
    var intervaloJanela = null;
    var ultimoVersaoJanela = -1;
    var estadoVisao = {
        col: 'nome',
        dir: 1,
        filtro: null,
        selecionado: null
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
            + '.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;padding:10px 16px;background:var(--surface2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}'
            + '.card{background:var(--card-bg);border:1px solid var(--card-border);border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:border-color .15s,background .15s;user-select:none}'
            + '.card:hover{border-color:var(--blue)}'
            + '.card.card-active{border-color:var(--blue);background:rgba(59,130,246,.12);box-shadow:0 0 0 1px var(--blue)}'
            + '.card-static{cursor:default}.card-static:hover{border-color:var(--card-border)}'
            + '.card-title{font-size:10px;font-weight:600;text-transform:uppercase;color:var(--text-faint);letter-spacing:.04em;display:flex;justify-content:space-between}'
            + '.card-val{font-size:16px;font-weight:700;color:var(--text);line-height:1.2}'
            + '.card-sub{font-size:10px;color:var(--text-muted);display:flex;gap:6px}'
            + '.tbl-wrap{flex:1;overflow:auto}'
            + 'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
            + 'thead th{background:var(--tbl-head);color:var(--tbl-head-txt);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5;user-select:none;text-align:right}'
            + 'thead th:first-child{text-align:left;width:180px}'
            + 'thead th[data-col]{cursor:pointer}'
            + 'thead th.sort-active{color:var(--blue)}'
            + 'tbody tr{cursor:pointer;transition:background .1s}'
            + 'tbody tr:hover{background:var(--tbl-row-hover)}'
            + 'tbody tr.active-row{background:var(--tbl-row-active)!important;outline:1px solid var(--tbl-row-active-outline)}'
            + 'tbody tr.row-unread{opacity:.45}'
            + 'tbody tr.row-processing{background:rgba(59,130,246,.08);font-weight:500}'
            + 'td{padding:5px 10px;text-align:right;border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
            + 'td:first-child{text-align:left}'
            + '.cell-chip{display:inline-block;padding:1px 6px;border-radius:4px;font-weight:600;font-size:11px}'
            + '.chip-blue{background:rgba(59,130,246,.15);color:#93c5fd}'
            + '.chip-orange{background:rgba(249,115,22,.15);color:#fdba74}'
            + '.chip-red{background:rgba(239,68,68,.18);color:#fca5a5}'
            + '.chip-zero{color:var(--text-faint)}'
            + '.chip-dash{color:var(--text-faint)}'
            + '.badge{font-size:9px;padding:1px 5px;border-radius:99px;font-weight:600;margin-left:4px;vertical-align:middle}'
            + '.badge-parcial{background:rgba(249,115,22,.2);color:#fdba74}'
            + '.badge-vazia{background:rgba(148,163,184,.15);color:#94a3b8}'
            + '.badge-proc{background:rgba(59,130,246,.25);color:#93c5fd;animation:pulse 1.5s infinite}'
            + '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}'
            + '.action-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 14px;background:var(--surface2);border-top:1px solid var(--border);flex-shrink:0}'
            + '.btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:5px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}'
            + '.btn-blue{background:#3b82f6;color:#fff}.btn-blue:hover{filter:brightness(1.15)}.btn-blue.ok{background:#22c55e}'
            + '.btn-gray{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border)}.btn-gray:hover{background:rgba(255,255,255,.14)}'
            + '.notice-bar{display:none;background:#7c2d12;color:#ffedd5;padding:4px 12px;font-size:11px;text-align:center}'
            + '</style></head><body>'
            + '<div class="frame">'
            + '<div class="hdr">'
            +   '<div class="hdr-row1">'
            +     '<div class="hdr-title" id="fpw-hdr-title">📊 Relatório do Time</div>'
            +     '<div class="hdr-actions">'
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
            + '</div>'
            + '</div></body></html>';
    };

    // ── Renderização dos Cards (Big Numbers) ──────────────────────────────

    AF.relatorios.gerarCardsHTML = function (resumo, filtroAtivo) {
        var h = '';

        function card(id, titulo, valor, sub, clickavel, extraClass) {
            var ativo = filtroAtivo === id;
            var cls = 'card ' + (clickavel ? '' : 'card-static ') + (ativo ? 'card-active ' : '') + (extraClass || '');
            var dataAttr = clickavel ? ' data-filtro="' + id + '"' : '';
            return '<div class="' + cls + '"' + dataAttr + '>'
                + '<div class="card-title"><span>' + escaparHTML(titulo) + '</span>' + (ativo ? '<span style="color:var(--blue)">●</span>' : '') + '</div>'
                + '<div class="card-val">' + valor + '</div>'
                + (sub ? '<div class="card-sub">' + sub + '</div>' : '')
                + '</div>';
        }

        // Folgas
        var fMov = resumo.folgas.fracaoTexto;
        var subFolgas = '<span title="Folgas pendentes de movimentação">Pend: ' + resumo.folgas.pendentes + '</span>'
                      + '<span title="Folgas presas" style="color:' + (resumo.folgas.presas > 0 ? 'var(--orange)' : 'inherit') + '">Presas: ' + resumo.folgas.presas + '</span>';
        h += card('presas', 'Folgas Movimentadas', fMov, subFolgas, true);

        // Irregularidades
        h += card('semES', 'Sem Entrada/Saída', String(resumo.irregularidades.semES.total),
            '<span>' + resumo.irregularidades.semES.funcs + ' func.</span>', true);

        h += card('interj', 'Interjornada', String(resumo.irregularidades.interj.total),
            '<span>' + resumo.irregularidades.interj.funcs + ' func.</span>', true);

        h += card('britanica', 'Marc. Britânicas', String(resumo.irregularidades.britanica.total),
            '<span>' + resumo.irregularidades.britanica.funcs + ' func.</span>', true);

        h += card('naoPreenchida', 'Folhas Não Preenchidas', String(resumo.irregularidades.naoPreenchida.total),
            '<span>' + resumo.irregularidades.naoPreenchida.funcs + ' folhas</span>', true);

        // Horas Extras (estáticos com tooltip)
        function subHora(o) {
            if (o.min === '-' && o.max === '-') return '<span>Nenhum saldo</span>';
            var tMin = o.minNome ? ' title="Mínimo: ' + escaparHTML(o.minNome) + '"' : '';
            var tMax = o.maxNome ? ' title="Máximo: ' + escaparHTML(o.maxNome) + '"' : '';
            return '<span' + tMin + '>Mín: ' + o.min + '</span><span' + tMax + '>Máx: ' + o.max + '</span>';
        }

        h += card(null, 'HE 100%', resumo.he.total, subHora(resumo.he), false);
        h += card(null, 'HEF 100%', resumo.hef.total, subHora(resumo.hef), false);

        var subHec = '<span style="color:var(--green)">+' + resumo.hecPos.total + '</span> / <span style="color:var(--red)">' + resumo.hecNeg.total + '</span>';
        h += card(null, 'HEC 70%', subHec, subHora(resumo.hecNeg), false);

        return h;
    };

    // ── Renderização do Cabeçalho da Tabela ───────────────────────────────

    AF.relatorios.gerarTheadHTML = function (sortCol, sortDir) {
        var colunas = [
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

        var h = '';
        for (var i = 0; i < colunas.length; i++) {
            var c = colunas[i];
            var ativo = sortCol === c.id;
            var seta = ativo ? (sortDir === 1 ? ' ↑' : ' ↓') : '';
            var cls = ativo ? ' class="sort-active"' : '';
            h += '<th data-col="' + c.id + '"' + cls + ' style="text-align:' + c.align + '">'
                + escaparHTML(c.label) + '<span style="opacity:.6;font-size:9px;">' + seta + '</span></th>';
        }
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

    AF.relatorios.gerarTbodyHTML = function (nomes, atualEmExecucao, selecionado) {
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
            if (ehAtual) badges += '<span class="badge badge-proc">processando</span>';
            if (d.parcial) badges += '<span class="badge badge-parcial">parcial</span>';
            if (d.vazia) badges += '<span class="badge badge-vazia">s/ marcações</span>';

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

            // Horas
            function cellHora(v) {
                if (!v) return '<span class="chip-dash">-</span>';
                if (v === '00:00') return '<span class="chip-zero">00:00</span>';
                var neg = String(v).charAt(0) === '-';
                return '<span style="color:' + (neg ? 'var(--red)' : 'var(--green)') + ';font-weight:600">' + escaparHTML(v) + '</span>';
            }

            h += '<tr class="' + trCls.join(' ') + '" data-nome="' + escaparHTML(nome) + '">'
                + '<td title="' + escaparHTML(nome) + '">' + escaparHTML(abrevNome(nome)) + badges + '</td>'
                + '<td>' + chipF + '</td>'
                + '<td>' + chipC + '</td>'
                + '<td>' + chipIrreg(d.semES.total, d.semES.dias, 'Sem Entrada/Saída') + '</td>'
                + '<td>' + chipIrreg(d.interj.total, d.interj.dias, 'Interjornada') + '</td>'
                + '<td>' + chipIrreg(d.britanica.total, d.britanica.dias, 'Marcação Britânica') + '</td>'
                + '<td>' + chipNP + '</td>'
                + '<td>' + cellHora(d.HE) + '</td>'
                + '<td>' + cellHora(d.HEF) + '</td>'
                + '<td>' + cellHora(d.HEC) + '</td>'
                + '</tr>';
        }
        return h;
    };

    // ── Condutor da Janela Viva ──────────────────────────────────────────

    function atualizarJanelaDOM(win, forcar) {
        if (!win || win.closed) return;
        var est = AF.modelo.obterEstado();
        if (!forcar && est.versao === ultimoVersaoJanela) return;
        ultimoVersaoJanela = est.versao;

        try {
            var doc = win.document;

            // Metadados no topo
            var metaEl = doc.getElementById('fpw-hdr-meta');
            if (metaEl) {
                var totalOrdem = est.ordem.length;
                var proc = 0;
                est.ordem.forEach(function (n) { if (AF.modelo.obterDadosFunc(n).processado) proc++; });
                metaEl.innerHTML = '<span><b>Mês:</b> ' + (est.mes || 'Não definido') + '</span>'
                    + '<span><b>Processados:</b> ' + proc + ' / ' + totalOrdem + '</span>';
            }

            // Cards de Resumo
            var resumo = AF.modelo.resumo();
            var cardsGrid = doc.getElementById('fpw-cards-grid');
            if (cardsGrid) {
                cardsGrid.innerHTML = AF.relatorios.gerarCardsHTML(resumo, estadoVisao.filtro);
                // Bind clique dos cards
                cardsGrid.querySelectorAll('.card[data-filtro]').forEach(function (c) {
                    c.onclick = function () {
                        var f = this.getAttribute('data-filtro');
                        estadoVisao.filtro = estadoVisao.filtro === f ? null : f;
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
            var nomesFiltrados = AF.modelo.filtrar(estadoVisao.filtro);
            var nomesOrdenados = AF.modelo.ordenar(nomesFiltrados, estadoVisao.col, estadoVisao.dir);
            var tbody = doc.getElementById('fpw-tbody');
            if (tbody) {
                tbody.innerHTML = AF.relatorios.gerarTbodyHTML(nomesOrdenados, est.atual, estadoVisao.selecionado);
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
            }

            // Rodapé
            var rodape = doc.getElementById('fpw-rodape-contagem');
            if (rodape) {
                rodape.textContent = 'Exibindo ' + nomesOrdenados.length + ' de ' + est.ordem.length + ' funcionários'
                    + (estadoVisao.filtro ? ' (Filtro ativo: ' + estadoVisao.filtro + ')' : '');
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

        atualizarJanelaDOM(win, true);

        if (typeof setInterval === 'function') {
            if (intervaloJanela) clearInterval(intervaloJanela);
            intervaloJanela = setInterval(function () {
                if (!janelaRelatorio || janelaRelatorio.closed) {
                    clearInterval(intervaloJanela);
                    intervaloJanela = null;
                    return;
                }
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