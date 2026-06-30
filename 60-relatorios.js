(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    // ── Utilitário: formatar minutos em HH:MM ──────────────────────

    function fmtMin(t) {
        return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }

    // ── Normalizar hora: garante formato HH:MM ─────────────────────

    function normHora(v) {
        var s = String(v || '00:00').trim();
        var neg = s.charAt(0) === '-';
        var base = neg ? s.slice(1) : s;
        var partes = base.split(':');
        var h   = (partes[0] || '00').padStart(2, '0');
        var min = (partes[1] || '00').padStart(2, '0');
        return (neg ? '-' : '') + h + ':' + min;
    }

    // ── Escapar para Excel: prefixo ' em valores negativos ───────────

    function xls(v) {
        var s = String(v);
        return s.charAt(0) === '-' ? "'" + s : s;
    }

    // ── Abreviar nome ─────────────────────────────────────────────

    function abrevNome(nome) {
        var clean = nome.replace(/\s+\d+$/, '');
        var parts = clean.split(' ');
        if (parts.length <= 2) return parts.join(' ');
        var skip = ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'];
        var primeiro = parts[0];
        var ultimo   = parts[parts.length - 1];
        var meio = parts.slice(1, -1).map(function (p) {
            return skip.indexOf(p) >= 0 ? p : p.charAt(0) + '.';
        }).join(' ');
        return primeiro + ' ' + meio + ' ' + ultimo;
    }

    // ── Habilitar botão copiar ─────────────────────────────────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) { btn.disabled = false; btn.title = titulo || 'Relatório'; }
        } catch (e) {}
    };

    // ── Normalização para ordenação ──────────────────────────────

    function normSort(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    // ── Relatório do Executar (40-fases) — TSV ─────────────────────

    AF.relatorios.gerarFolgas = function (relStats, relLista, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var minutos    = Math.floor(tempoTotal / 60);
        var segundos   = tempoTotal % 60;

        var rel = 'RELATORIO DE AJUSTE\n';
        rel += 'Status: '                    + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '                 + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '               + minutos + 'min ' + segundos + 's\n';
        rel += 'Folhas processadas: '        + relStats.totalFolhas + '\n';
        rel += 'Folhas sem marcacoes: '      + relStats.semMarcacoes + '\n';
        rel += 'Folgas Mov.: '               + relStats.folgasAlteradas + '\n';
        rel += 'Cod 47 Ajust.: '             + relStats.linhas47 + '\n';
        rel += 'Folgas Presas: '             + relStats.folgasNaoAlteradas + '\n';
        rel += 'Irregularidades restantes: ' + relStats.irregsRestantes + '\n';
        rel += 'Interjornadas restantes: '   + relStats.interjRestantes + '\n\n';

        var T = '\t';
        rel += 'Nome' + T + 'Folgas Mov.' + T + 'Cod 47 Ajust.' + T + 'Presas' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < relLista.length; ri++) {
            var re = relLista[ri];
            if (!re.lido) continue;
            if (re.pulada) continue;
            var he  = normHora(re.HE);
            var hef = normHora(re.HEF);
            var hec = normHora(re.HEC);
            var temAlgo = re.folgasAlteradas || re.folgasSemAlteracao || re.linhas47 ||
                          re.irregs || re.interj || he !== '00:00' || hef !== '00:00';
            if (!temAlgo) continue;
            rel += re.nome.trim()        + T
                +  re.folgasAlteradas    + T
                +  re.linhas47           + T
                +  re.folgasSemAlteracao + T
                +  re.irregs             + T
                +  re.interj             + T
                +  xls(he)               + T
                +  xls(hef)              + T
                +  xls(hec)              + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');

        // ── listaJanela: usa relLista já ordenado (vem ordenado de 40-fases) ──
        var listaJanela = [];
        for (var ji = 0; ji < relLista.length; ji++) {
            var jr = relLista[ji];
            if (!jr.nome || !jr.nome.trim()) continue;
            var foiLido = jr.lido === true && !jr.pulada;
            var jhe  = foiLido ? normHora(jr.HE)  : null;
            var jhef = foiLido ? normHora(jr.HEF) : null;
            var jhec = foiLido ? normHora(jr.HEC) : null;
            listaJanela.push({
                nome:   jr.nome.trim(),
                folgas: foiLido ? (jr.folgasAlteradas    != null ? jr.folgasAlteradas    : 0) : null,
                cod47:  foiLido ? (jr.linhas47           != null ? jr.linhas47           : 0) : null,
                presas: foiLido ? (jr.folgasSemAlteracao != null ? jr.folgasSemAlteracao : 0) : null,
                irregs: foiLido ? (jr.irregs             != null ? jr.irregs             : 0) : null,
                interj: foiLido ? (jr.interj             != null ? jr.interj             : 0) : null,
                he: jhe, hef: jhef, hec: jhec,
                lido: foiLido
            });
        }

        AF.estado.relatorioLista = listaJanela;
        AF.estado.relatorioTipo  = 'execucao';
        AF.estado.relatorioMeta  = {
            titulo:  'Relatório de Ajuste',
            status:  cancelado ? 'INTERROMPIDO' : 'CONCLUÍDO',
            folhas:  relStats.totalFolhas,
            tempo:   minutos + 'min ' + segundos + 's',
            gerado:  new Date().toLocaleString('pt-BR')
        };
        AF.estado.relatorioLog = (AF.estado.logBuffer || []).slice();

        AF.relatorios.habilitarCopiar('Relatório de Ajuste');

        AF.core.log('──────────────────', '#374151');
        AF.core.log('RELATORIO DE AJUSTE', '#f9fafb');
        AF.core.log('Tempo: ' + minutos + 'min ' + segundos + 's', '#0043ff');
        AF.core.log('Folgas Mov.: ' + relStats.folgasAlteradas + ' | Cod 47 Ajust.: ' + relStats.linhas47 + ' | Presas: ' + relStats.folgasNaoAlteradas, '#0043ff');
        AF.core.log('Irregularidades: ' + relStats.irregsRestantes + ' | Interjornada: ' + relStats.interjRestantes, '#0043ff');
        AF.core.log('──────────────────', '#374151');
        AF.core.log('Relatorio pronto.', '#02ab19');
    };

    // ── Relatório do Analisar (50-analisar) — TSV ───────────────────

    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var min = Math.floor(tempoTotal / 60);
        var seg = tempoTotal % 60;

        var totalHEstr  = fmtMin(stats.HEmin);
        var totalHEFstr = fmtMin(stats.HEFmin);

        var rel = 'RELATORIO DE ANALISE - ' + nomeMesStr + '\n';
        rel += 'Status: '               + (cancelado ? 'INTERROMPIDO' : 'CONCLUIDO') + '\n';
        rel += 'Gerado em: '            + new Date().toLocaleString('pt-BR') + '\n';
        rel += 'Tempo total: '          + min + 'min ' + seg + 's\n';
        rel += 'Folhas analisadas: '    + (stats.totalFolhas + stats.vazias) + '\n';
        rel += 'Folhas sem marcacoes: ' + stats.vazias + '\n';
        rel += 'Total Folgas p/ Mov.: '      + stats.folgasMoviveis + '\n';
        rel += 'Total Cod 47 p/ Ajustar: '   + stats.cod47 + '\n';
        rel += 'Total Irregularidades: '     + stats.irregs + '\n';
        rel += 'Total Interjornada: '        + stats.interj + '\n';
        rel += 'Total HE100%: '              + totalHEstr + '\n';
        rel += 'Total HEF100%: '             + totalHEFstr + '\n\n';

        var T = '\t';
        rel += 'Nome' + T + 'Folgas p/ Mov.' + T + 'Cod 47 p/ Ajustar' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < lista.length; ri++) {
            var re = lista[ri];
            if (!re.nome || !re.nome.trim()) continue;
            if (!re.lido) continue;
            var folgas = re.folgas != null ? re.folgas : 0;
            var irregs = re.irregs != null ? re.irregs : 0;
            var interj = re.interj != null ? re.interj : 0;
            var cod47  = re.cod47  != null ? re.cod47  : 0;
            var he     = normHora(re.HE);
            var hef    = normHora(re.HEF);
            var hec    = normHora(re.HEC);
            rel += re.nome.trim() + T + folgas + T + cod47 + T + irregs + T + interj + T + xls(he) + T + xls(hef) + T + xls(hec) + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');

        // ── listaJanela: TODOS os nomes, ordenados, com lido=false onde não foi analisado ──
        var listaJanela = [];
        for (var ji = 0; ji < lista.length; ji++) {
            var jr = lista[ji];
            if (!jr.nome || !jr.nome.trim()) continue;
            var foiLido = jr.lido !== false;
            listaJanela.push({
                nome:   jr.nome.trim(),
                folgas: foiLido && jr.folgas != null ? jr.folgas : (foiLido ? 0 : null),
                cod47:  foiLido && jr.cod47  != null ? jr.cod47  : (foiLido ? 0 : null),
                presas: null,
                irregs: foiLido && jr.irregs != null ? jr.irregs : (foiLido ? 0 : null),
                interj: foiLido && jr.interj != null ? jr.interj : (foiLido ? 0 : null),
                he:  foiLido ? normHora(jr.HE)  : null,
                hef: foiLido ? normHora(jr.HEF) : null,
                hec: foiLido ? normHora(jr.HEC) : null,
                lido: foiLido
            });
        }
        // ordenação alfabética (sem acentos)
        listaJanela.sort(function (a, b) {
            return normSort(a.nome) < normSort(b.nome) ? -1 : normSort(a.nome) > normSort(b.nome) ? 1 : 0;
        });

        AF.estado.relatorioLista = listaJanela;
        AF.estado.relatorioTipo  = 'analise';
        AF.estado.relatorioMeta  = {
            titulo:  'Relatório de Análise \u2014 ' + nomeMesStr,
            status:  cancelado ? 'INTERROMPIDO' : 'CONCLUÍDO',
            folhas:  stats.totalFolhas + stats.vazias,
            tempo:   min + 'min ' + seg + 's',
            gerado:  new Date().toLocaleString('pt-BR')
        };
        AF.estado.relatorioLog = (AF.estado.logBuffer || []).slice();

        AF.relatorios.habilitarCopiar('Relatório de Análise');

        AF.core.log('──────────────────', '#374151');
        AF.core.log('ANALISE CONCLUIDA', '#f9fafb');
        AF.core.log('Tempo: ' + min + 'min ' + seg + 's', '#0043ff');
        AF.core.log('Folgas p/ Mov.: ' + stats.folgasMoviveis + ' | Cod 47 p/ Ajustar: ' + stats.cod47 + ' | Irregularidades: ' + stats.irregs + ' | Interjornada: ' + stats.interj, '#0043ff');
        AF.core.log('HE100%: ' + totalHEstr + ' | HEF100%: ' + totalHEFstr, '#0043ff');
        AF.core.log('──────────────────', '#374151');
        AF.core.log('Relatorio pronto.', '#02ab19');
    };

    // ── Parser do logBuffer → grupos por funcionário ───────────────

    function parsearLogPorFuncionario(buffer) {
        var grupos   = [];
        var atual    = null;
        var sepRe    = /^\u2500+ (.+?) \u2500+$/;

        for (var i = 0; i < buffer.length; i++) {
            var item = buffer[i];
            var match = sepRe.exec(item.msg);
            if (match) {
                atual = { nome: match[1].trim(), linhas: [] };
                grupos.push(atual);
            } else if (atual) {
                atual.linhas.push(item);
            }
        }
        return grupos;
    }

    // ── Gerar HTML da janela ───────────────────────────────────────

    function gerarHTML(lista, meta, tipo, tsv, logBuffer) {
        var temPressa = tipo === 'execucao';

        // ── escalas de cor ──
        var maxIrregs = 1, maxInterj = 1, maxFolgas = 1, maxCod47 = 1, maxPressa = 1;
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].lido === false) continue;
            if ((lista[i].irregs || 0) > maxIrregs) maxIrregs = lista[i].irregs;
            if ((lista[i].interj || 0) > maxInterj) maxInterj = lista[i].interj;
            if ((lista[i].folgas || 0) > maxFolgas) maxFolgas = lista[i].folgas;
            if ((lista[i].cod47  || 0) > maxCod47)  maxCod47  = lista[i].cod47;
            if (temPressa && (lista[i].presas || 0) > maxPressa) maxPressa = lista[i].presas;
        }

        var chipRed = function (val, mx) {
            if (val === null || val === undefined) return '<span class="cell-dash">-</span>';
            if (!val) return '<span class="cell-zero">0</span>';
            var r = val / mx;
            var bg = r <= 0.2 ? 'rgba(239,68,68,.10)' : r <= 0.4 ? 'rgba(239,68,68,.20)' : r <= 0.6 ? 'rgba(239,68,68,.32)' : r <= 0.8 ? 'rgba(239,68,68,.48)' : 'rgba(239,68,68,.68)';
            var fg = r <= 0.8 ? '#fca5a5' : '#fff';
            return '<span style="background:' + bg + ';color:' + fg + ';padding:1px 6px;border-radius:4px;font-weight:600">' + val + '</span>';
        };
        var chipOra = function (val, mx) {
            if (val === null || val === undefined) return '<span class="cell-dash">-</span>';
            if (!val) return '<span class="cell-zero">0</span>';
            var r = val / mx;
            var bg = r <= 0.2 ? 'rgba(249,115,22,.10)' : r <= 0.4 ? 'rgba(249,115,22,.20)' : r <= 0.6 ? 'rgba(249,115,22,.32)' : r <= 0.8 ? 'rgba(249,115,22,.48)' : 'rgba(249,115,22,.68)';
            var fg = r <= 0.8 ? '#fdba74' : '#fff';
            return '<span style="background:' + bg + ';color:' + fg + ';padding:1px 6px;border-radius:4px;font-weight:600">' + val + '</span>';
        };
        var heToMin = function (str) {
            if (str === null || str === undefined) return null;
            var s = String(str || '00:00').trim().replace(/^'/, '');
            var neg = s.charAt(0) === '-';
            var b = neg ? s.slice(1) : s;
            var p = b.split(':');
            var m = parseInt(p[0] || 0) * 60 + parseInt(p[1] || 0);
            return neg ? -m : m;
        };
        var minToHe = function (m) {
            var neg = m < 0, abs = Math.abs(m);
            return (neg ? '-' : '') + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0');
        };
        var cellHe = function (val) {
            if (val === null || val === undefined) return '<span class="cell-dash">-</span>';
            var s = String(val || '00:00').replace(/^'/, '');
            var m = heToMin(s);
            if (m > 0) return '<span style="color:#22c55e;font-weight:600">' + s + '</span>';
            if (m < 0) return '<span style="color:#ef4444;font-weight:600">' + s + '</span>';
            return '<span class="cell-zero">00:00</span>';
        };

        // ── totais (apenas lidos) ──
        var tF = 0, tC = 0, tP = 0, tI = 0, tJ = 0, tHE = 0, tHEF = 0, tHECpos = 0, tHECneg = 0;
        for (var ti = 0; ti < lista.length; ti++) {
            var d = lista[ti];
            if (d.lido === false) continue;
            tF  += d.folgas || 0;
            tC  += d.cod47  || 0;
            tP  += d.presas || 0;
            tI  += d.irregs || 0;
            tJ  += d.interj || 0;
            tHE  += heToMin(d.he)  || 0;
            tHEF += heToMin(d.hef) || 0;
            var hecMin = heToMin(d.hec) || 0;
            if (hecMin >= 0) tHECpos += hecMin; else tHECneg += hecMin;
        }
        var hecTotalHtml = '<span style="color:#22c55e;font-weight:700">+' + minToHe(tHECpos) + '</span>'
                         + '<span style="color:var(--text-faint);margin:0 3px">/</span>'
                         + '<span style="color:#ef4444;font-weight:700">' + minToHe(tHECneg) + '</span>';

        // ── linhas da tabela (TODOS os nomes, já ordenados) ──
        var rows = '';
        for (var ri = 0; ri < lista.length; ri++) {
            var d = lista[ri];
            var naoLido = d.lido === false;
            var pressaCell = temPressa
                ? '<td style="text-align:right;padding:5px 10px">' + chipOra(d.presas, maxPressa) + '</td>'
                : '';
            rows += '<tr class="fpw-row' + (naoLido ? ' row-unread' : '') + '" data-nome="' + d.nome + '">'
                + '<td class="col-nome" title="' + d.nome + '">' + abrevNome(d.nome) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + chipOra(d.folgas, maxFolgas) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + chipOra(d.cod47, maxCod47) + '</td>'
                + pressaCell
                + '<td style="text-align:right;padding:5px 10px">' + chipRed(d.irregs, maxIrregs) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + chipRed(d.interj, maxInterj) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + cellHe(d.he) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + cellHe(d.hef) + '</td>'
                + '<td style="text-align:right;padding:5px 10px">' + cellHe(d.hec) + '</td>'
                + '</tr>';
        }

        var pressaTh  = temPressa ? '<th style="text-align:right">Presas</th>' : '';
        var pressaTot = temPressa ? '<td style="text-align:right;padding:8px 10px">' + tP + '</td>' : '';

        var statusColor  = meta.status === 'CONCLUÍDO' ? '#22c55e' : '#f97316';
        var badgeStatus  = '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:rgba(34,197,94,.12);color:' + statusColor + ';border:1px solid rgba(34,197,94,.2);text-transform:uppercase;letter-spacing:.04em">' + meta.status + '</span>';

        var grupos = parsearLogPorFuncionario(logBuffer || []);

        var opcoesSelect = '<option value="__todos__">Todos os funcionários</option>';
        for (var gi = 0; gi < grupos.length; gi++) {
            opcoesSelect += '<option value="' + gi + '">' + abrevNome(grupos[gi].nome) + '</option>';
        }

        var gruposJson      = JSON.stringify(grupos.map(function(g) { return { nome: g.nome, linhas: g.linhas }; }));
        var logCompletoJson = JSON.stringify(logBuffer || []);
        var tsvEsc = JSON.stringify(tsv);
        var hasLog = grupos.length > 0;

        return '<!DOCTYPE html><html lang="pt-BR" data-theme="light"><head><meta charset="UTF-8">'
            + '<title>FPW \u2014 ' + meta.titulo + '</title>'
            + '<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">'
            + '<style>'
            + ':root,[data-theme="light"]{'
            + '--bg:#f8fafc;--surface:#ffffff;--surface2:#f1f5f9;'
            + '--border:rgba(0,0,0,.09);'
            + '--text:#0f172a;--text-muted:#334155;--text-faint:#64748b;'
            + '--hdr-bg:#ffffff;--hdr-border:rgba(0,0,0,.08);'
            + '--tbl-head:#f1f5f9;--tbl-head-txt:#334155;'
            + '--tbl-row-hover:rgba(0,0,0,.025);'
            + '--tbl-row-active:rgba(59,130,246,.08);--tbl-row-active-outline:rgba(59,130,246,.25);'
            + '--tbl-total-bg:rgba(59,130,246,.05);--tbl-total-border:#3b82f6;--tbl-total-txt:#1e40af;'
            + '--action-bg:#f8fafc;'
            + '--log-bg:#f1f5f9;--log-hdr-bg:#ffffff;--log-sel-bg:#f8fafc;--log-sel-border:rgba(0,0,0,.15);'
            + '--log-empty:#64748b;--log-sep:#cbd5e1;'
            + '--scroll-thumb:rgba(0,0,0,.12);'
            + '--cell-dash:#475569;--cell-zero:#475569;'
            + '--row-name:#0f172a;'
            + '}'
            + '[data-theme="dark"]{'
            + '--bg:#0f1117;--surface:#161b22;--surface2:#0d1117;'
            + '--border:rgba(255,255,255,.08);'
            + '--text:#e2e8f0;--text-muted:#94a3b8;--text-faint:#64748b;'
            + '--hdr-bg:#0d1117;--hdr-border:rgba(255,255,255,.12);'
            + '--tbl-head:#0d1117;--tbl-head-txt:#94a3b8;'
            + '--tbl-row-hover:rgba(255,255,255,.04);'
            + '--tbl-row-active:rgba(59,130,246,.12);--tbl-row-active-outline:rgba(59,130,246,.3);'
            + '--tbl-total-bg:rgba(59,130,246,.07);--tbl-total-border:#3b82f6;--tbl-total-txt:#3b82f6;'
            + '--action-bg:#0d1117;'
            + '--log-bg:#0f1117;--log-hdr-bg:#0d1117;--log-sel-bg:#161b22;--log-sel-border:rgba(255,255,255,.12);'
            + '--log-empty:#64748b;--log-sep:#1f2937;'
            + '--scroll-thumb:rgba(255,255,255,.12);'
            + '--cell-dash:#94a3b8;--cell-zero:#94a3b8;'
            + '--row-name:#e2e8f0;'
            + '}'
            + '*{box-sizing:border-box;margin:0;padding:0}'
            + 'html,body{background:var(--bg);color:var(--text);font-family:"Satoshi","Inter",sans-serif;font-size:12px;height:100%;overflow:hidden;transition:background .2s,color .2s}'
            + '.frame{display:flex;flex-direction:column;height:100vh;border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.15)}'
            + '.hdr{background:var(--hdr-bg);border-bottom:1px solid var(--hdr-border);padding:10px 16px;flex-shrink:0}'
            + '.hdr-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}'
            + '.hdr-title{font-size:14px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:8px;color:var(--text)}'
            + '.hdr-meta{display:flex;flex-wrap:wrap;gap:4px 20px;font-size:11px;color:var(--text-muted)}'
            + '.meta-lbl{color:var(--text-faint)}.meta-val{color:var(--text-muted);font-weight:500}.meta-hi{color:#3b82f6;font-weight:700}'
            + '.body-scroll{flex:1;overflow-y:auto;overflow-x:hidden}'
            + '.body-scroll::-webkit-scrollbar{width:5px}.body-scroll::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border-radius:99px}'
            + '.sec{padding:0}'
            + '.sec-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-faint);padding:10px 16px 4px;border-top:1px solid var(--border)}'
            + '.tbl-wrap{overflow-x:auto}'
            + '.tbl-wrap::-webkit-scrollbar{height:4px}.tbl-wrap::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border-radius:99px}'
            + 'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
            + 'thead th{background:var(--tbl-head);color:var(--tbl-head-txt);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:6px 10px;border-bottom:1px solid var(--border);white-space:nowrap;text-align:right;position:sticky;top:0;z-index:5}'
            + 'thead th:first-child{text-align:left;width:180px}'
            + 'tbody tr:hover{background:var(--tbl-row-hover)}'
            + 'tbody tr.active-row{background:var(--tbl-row-active)!important;outline:1px solid var(--tbl-row-active-outline)}'
            + '.row-unread{opacity:.5}'
            + '.row-total{background:var(--tbl-total-bg)!important;border-top:2px solid var(--tbl-total-border)!important}'
            + '.row-total td{font-weight:700;color:var(--text)!important;padding:7px 10px;font-size:11px}'
            + '.row-total td:first-child{color:var(--tbl-total-txt)!important;font-size:10px;text-transform:uppercase;letter-spacing:.05em}'
            + '.col-nome{padding:5px 10px;color:var(--row-name);font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
            + '.cell-dash{color:var(--cell-dash)}.cell-zero{color:var(--cell-zero)}'
            + '.action-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 14px;background:var(--action-bg);border-top:1px solid var(--border);flex-shrink:0}'
            + '.hint{font-size:10px;color:var(--text-faint)}'
            + '.log-header{display:flex;align-items:center;gap:8px;padding:8px 14px 6px;background:var(--log-hdr-bg);border-top:2px solid var(--border);flex-shrink:0;flex-wrap:nowrap}'
            + '.log-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);white-space:nowrap}'
            + 'select.log-sel{background:var(--log-sel-bg);color:var(--text);border:1px solid var(--log-sel-border);border-radius:5px;padding:3px 8px;font-size:11px;font-family:inherit;cursor:pointer;flex:1;min-width:0}'
            + 'select.log-sel:focus{outline:none;border-color:#3b82f6}'
            + '.log-box{flex:1;overflow-y:auto;padding:6px 14px 10px;font-size:11px;line-height:1.55;min-height:120px;max-height:260px;background:var(--log-bg)}'
            + '.log-box::-webkit-scrollbar{width:4px}.log-box::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border-radius:99px}'
            + '.log-line{margin-top:2px;white-space:pre-wrap;word-break:break-all}'
            + '.log-sep{color:var(--log-sep);margin:4px 0;font-size:10px;letter-spacing:.03em}'
            + '.log-empty{color:var(--log-empty);font-style:italic;padding:8px 0}'
            + '.btn{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:5px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:.02em;transition:filter .15s}'
            + '.btn-blue{background:#3b82f6;color:#fff}.btn-blue:hover{filter:brightness(1.15)}.btn-blue.ok{background:#22c55e}'
            + '.btn-gray{background:rgba(128,128,128,.12);color:var(--text-muted);border:1px solid var(--border)}.btn-gray:hover{background:rgba(128,128,128,.2)}'
            + '.theme-toggle{background:none;border:1px solid var(--border);border-radius:5px;padding:3px 8px;cursor:pointer;color:var(--text-muted);font-size:13px;line-height:1;font-family:inherit;flex-shrink:0}'
            + '.theme-toggle:hover{background:rgba(128,128,128,.1)}'
            + '</style></head><body>'
            + '<div class="frame">'
            + '<div class="hdr">'
            +   '<div class="hdr-row1">'
            +     '<div class="hdr-title">\uD83D\uDCCB ' + meta.titulo + ' ' + badgeStatus + '</div>'
            +     '<button class="theme-toggle" id="btn-theme" title="Alternar tema">\u2600\uFE0F</button>'
            +   '</div>'
            +   '<div class="hdr-meta">'
            +     '<span class="meta-lbl">Folhas:&nbsp;</span><span class="meta-hi">' + meta.folhas + '</span>'
            +     '<span class="meta-lbl">Dura\u00E7\u00E3o:&nbsp;</span><span class="meta-hi">' + meta.tempo + '</span>'
            +     '<span class="meta-lbl">Gerado em:&nbsp;</span><span class="meta-val">' + meta.gerado + '</span>'
            +   '</div>'
            + '</div>'
            + '<div class="body-scroll">'
            + '<div class="sec">'
            + '<div class="sec-label">\uD83D\uDCCA Tabela de resultados</div>'
            + '<div class="tbl-wrap"><table>'
            +   '<thead><tr>'
            +     '<th style="text-align:left">Nome</th>'
            +     '<th>Folgas Mov.</th><th>C\u00F3d 47</th>'
            +     pressaTh
            +     '<th>Irregularidades</th><th>Interjornada</th>'
            +     '<th>HE100%</th><th>HEF100%</th><th>HEC70%</th>'
            +   '</tr></thead>'
            +   '<tbody>' + rows + '</tbody>'
            +   '<tfoot><tr class="row-total">'
            +     '<td>\u25B8 TOTAIS</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + tF + '</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + tC + '</td>'
            +     pressaTot
            +     '<td style="text-align:right;padding:7px 10px">' + tI + '</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + tJ + '</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + cellHe(minToHe(tHE)) + '</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + cellHe(minToHe(tHEF)) + '</td>'
            +     '<td style="text-align:right;padding:7px 10px">' + hecTotalHtml + '</td>'
            +   '</tr></tfoot>'
            + '</table></div>'
            + '</div>'
            + '<div class="action-bar">'
            +   '<span class="hint">\uD83D\uDC46 Clique em uma linha para navegar at\u00E9 o funcion\u00E1rio</span>'
            +   '<button class="btn btn-blue" id="btn-tsv">\uD83D\uDCCB Copiar Relat\u00F3rio</button>'
            + '</div>'
            + (hasLog
                ? '<div class="log-header">'
                +   '<span class="log-title">\uD83D\uDCC4 Log</span>'
                +   '<select class="log-sel" id="log-sel">' + opcoesSelect + '</select>'
                +   '<button class="btn btn-gray" id="btn-log-copy">\uD83D\uDCCB Copiar Log</button>'
                + '</div>'
                + '<div class="log-box" id="log-box"></div>'
                : '')
            + '</div>'
            + '</div>'
            + '<script>'
            + '(function(){'
            + 'var html=document.documentElement;'
            + 'var btn=document.getElementById("btn-theme");'
            + 'html.setAttribute("data-theme","light");'
            + 'btn.addEventListener("click",function(){'
            +   'var t=html.getAttribute("data-theme")==="dark"?"light":"dark";'
            +   'html.setAttribute("data-theme",t);'
            +   'btn.textContent=t==="dark"?"\uD83C\uDF19":"\u2600\uFE0F";'
            + '});'
            + '})();'
            + 'var _tsv=' + tsvEsc + ';'
            + 'var _grupos=' + gruposJson + ';'
            + 'var _logCompleto=' + logCompletoJson + ';'
            + 'document.getElementById("btn-tsv").onclick=function(){'
            +   'navigator.clipboard.writeText(_tsv).then(function(){'
            +     'var b=document.getElementById("btn-tsv");'
            +     'b.classList.add("ok");b.textContent="\u2713 Copiado!";'
            +     'setTimeout(function(){b.classList.remove("ok");b.innerHTML="\uD83D\uDCCB Copiar Relat\u00F3rio";},2500);'
            +   '}).catch(function(){alert("Erro ao copiar.");});'
            + '};'
            + (hasLog
                ? 'function renderLog(grupos,filtro){'
                +   'var box=document.getElementById("log-box");'
                +   'if(!box)return;'
                +   'box.innerHTML="";'
                +   'if(filtro==="__todos__"){'
                +     'for(var gi=0;gi<grupos.length;gi++){'
                +       'var sep=document.createElement("div");'
                +       'sep.className="log-line log-sep";'
                +       'sep.textContent="\u2500\u2500 "+grupos[gi].nome+" "+"\u2500".repeat(10);'
                +       'box.appendChild(sep);'
                +       'for(var li=0;li<grupos[gi].linhas.length;li++){renderLinha(box,grupos[gi].linhas[li]);}'
                +     '}'
                +   '}else{'
                +     'var g=grupos[parseInt(filtro)];'
                +     'if(g){for(var li=0;li<g.linhas.length;li++){renderLinha(box,g.linhas[li]);}}'
                +   '}'
                +   'if(!box.firstChild){var e=document.createElement("div");e.className="log-empty";e.textContent="Nenhum log para este funcion\u00E1rio.";box.appendChild(e);}'
                +   'box.scrollTop=0;'
                + '}'
                + 'function renderLinha(box,item){'
                +   'var d=document.createElement("div");'
                +   'd.className="log-line";'
                +   'd.style.color=item.cor||"var(--text)";'
                +   'd.textContent="* "+item.msg;'
                +   'box.appendChild(d);'
                + '}'
                + 'document.getElementById("log-sel").onchange=function(){renderLog(_grupos,this.value);};'
                + 'renderLog(_grupos,"__todos__");'
                + 'document.getElementById("btn-log-copy").onclick=function(){'
                +   'var sel=document.getElementById("log-sel").value;'
                +   'var txt="";'
                +   'if(sel==="__todos__"){'
                +     'for(var gi=0;gi<_grupos.length;gi++){txt+="\u2500\u2500 "+_grupos[gi].nome+" \u2500\u2500\\n";for(var li=0;li<_grupos[gi].linhas.length;li++){txt+="* "+_grupos[gi].linhas[li].msg+"\\n";}txt+="\\n";}'
                +   '}else{var g=_grupos[parseInt(sel)];if(g){txt+="\u2500\u2500 "+g.nome+" \u2500\u2500\\n";for(var li=0;li<g.linhas.length;li++){txt+="* "+g.linhas[li].msg+"\\n";}}}'
                +   'navigator.clipboard.writeText(txt).then(function(){'
                +     'var b=document.getElementById("btn-log-copy");'
                +     'b.classList.add("ok");b.classList.remove("btn-gray");b.textContent="\u2713 Copiado!";'
                +     'setTimeout(function(){b.classList.remove("ok");b.classList.add("btn-gray");b.textContent="\uD83D\uDCCB Copiar Log";},2500);'
                +   '}).catch(function(){alert("Erro ao copiar.");});'
                + '};'
                : '')
            + 'document.querySelectorAll(".fpw-row").forEach(function(tr){'
            +   'tr.addEventListener("click",function(){'
            +     'document.querySelectorAll(".fpw-row").forEach(function(r){r.classList.remove("active-row");});'
            +     'this.classList.add("active-row");'
            +     'var nome=this.getAttribute("data-nome");'
            +     'try{'
            +       'var f0=window.opener.top.frames[0];'
            +       'var docC=f0.document;'
            +       'var sel=docC.getElementById("lstNome")||docC.querySelector("select[name=lstNome]");'
            +       'if(!sel)return;'
            +       'var norm=function(s){return(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().trim();};'
            +       'var nn=norm(nome.replace(/\\s+\\d+$/,""));'
            +       'for(var i=0;i<sel.options.length;i++){'
            +         'if(norm(sel.options[i].text.replace(/\\s+\\d+$/,""))===nn){'
            +           'sel.selectedIndex=i;'
            +           'try{f0.AjustaCodEmpresaEmpregado(docC.yourform.lstNome,docC.yourform.CodEmpresaEmpregado);}catch(e){}'
            +           'try{f0.AtualizaFuncionario();}catch(e){}'
            +           'break;'
            +         '}'
            +       '}'
            +     '}catch(e){}'
            +   '});'
            + '});'
            + '<\/script>'
            + '</body></html>';
    }

    // ── Abrir / atualizar janela popup ─────────────────────────────

    AF.relatorios.abrirJanela = function () {
        var lista    = AF.estado.relatorioLista || [];
        var meta     = AF.estado.relatorioMeta  || {};
        var tipo     = AF.estado.relatorioTipo  || 'analise';
        var tsv      = AF.estado.textoCopiavel  || '';
        var logBuf   = AF.estado.relatorioLog   || [];

        if (AF.estado.winRelatorio && !AF.estado.winRelatorio.closed) {
            AF.estado.winRelatorio.focus();
            AF.estado.winRelatorio._fpwAtualizar &&
                AF.estado.winRelatorio._fpwAtualizar(lista, meta, tipo, tsv, logBuf);
            return;
        }

        var win = window.open('', 'fpw-relatorio',
            'width=1000,height=680,left=80,top=60,resizable=yes,scrollbars=no');
        if (!win) { AF.core.log('Popup bloqueado pelo navegador.', '#f87171'); return; }
        AF.estado.winRelatorio = win;

        var html = gerarHTML(lista, meta, tipo, tsv, logBuf);
        win.document.open();
        win.document.write(html);
        win.document.close();

        win._fpwAtualizar = function (l, m, t, ts, lb) {
            var h = gerarHTML(l, m, t, ts, lb);
            win.document.open();
            win.document.write(h);
            win.document.close();
        };
    };

    console.log('[FPW] 60-relatorios carregado | v1.2');
})();
