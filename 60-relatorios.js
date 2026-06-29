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

    // ── Habilitar botão copiar ─────────────────────────────────

    AF.relatorios.habilitarCopiar = function (titulo) {
        try {
            var btn = AF.core.getDocC().getElementById('btn-copiar');
            if (btn) { btn.disabled = false; btn.title = titulo || 'Relatório'; }
        } catch (e) {}
    };

    // ── Relatório do Executar (40-fases) — TSV ─────────────────────
    //
    // relStats: { totalFolhas, semMarcacoes, folgasAlteradas,
    //             folgasNaoAlteradas, irregsRestantes, interjRestantes, linhas47 }
    // relLista: [{ nome, folgasAlteradas, folgasSemAlteracao, linhas47,
    //              irregs, interj, HE, HEF, HEC, pulada }]
    //
    // Ordem das colunas: Folgas Mov. | Cod 47 Ajust. | Presas | Irregularidades | Interjornada

    AF.relatorios.gerarFolgas = function (relStats, relLista, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var minutos    = Math.floor(tempoTotal / 60);
        var segundos   = tempoTotal % 60;

        // ── Cabeçalho corrido ────────────────────────────────────
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

        // ── Tabela TSV ─────────────────────────────────────────────
        var T = '\t';
        rel += 'Nome' + T + 'Folgas Mov.' + T + 'Cod 47 Ajust.' + T + 'Presas' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < relLista.length; ri++) {
            var re = relLista[ri];
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

        // ── Montar lista normalizada para a janela ────────────────
        var listaJanela = [];
        for (var ji = 0; ji < relLista.length; ji++) {
            var jr = relLista[ji];
            if (jr.pulada) continue;
            var jhe  = normHora(jr.HE);
            var jhef = normHora(jr.HEF);
            var jhec = normHora(jr.HEC);
            var temJ = jr.folgasAlteradas || jr.folgasSemAlteracao || jr.linhas47 ||
                       jr.irregs || jr.interj || jhe !== '00:00' || jhef !== '00:00';
            if (!temJ) continue;
            listaJanela.push({
                nome:   jr.nome.trim(),
                folgas: jr.folgasAlteradas    || 0,
                cod47:  jr.linhas47           || 0,
                presas: jr.folgasSemAlteracao || 0,
                irregs: jr.irregs             || 0,
                interj: jr.interj             || 0,
                he: jhe, hef: jhef, hec: jhec
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

        AF.relatorios.habilitarCopiar('Relatório de Ajuste');

        // ── Log resumo ───────────────────────────────────────────────
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('RELATORIO DE AJUSTE', '#f9fafb');
        AF.core.log('Tempo: ' + minutos + 'min ' + segundos + 's', '#89b4fa');
        AF.core.log('Folgas Mov.: ' + relStats.folgasAlteradas + ' | Cod 47 Ajust.: ' + relStats.linhas47 + ' | Presas: ' + relStats.folgasNaoAlteradas, '#89b4fa');
        AF.core.log('Irregularidades: ' + relStats.irregsRestantes + ' | Interjornada: ' + relStats.interjRestantes, '#89b4fa');
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        for (var li = 0; li < relLista.length; li++) {
            var le = relLista[li];
            if (le.pulada) continue;
            var lhe  = normHora(le.HE);
            var lhef = normHora(le.HEF);
            var lhec = normHora(le.HEC);
            var temAlgoL = le.folgasAlteradas || le.folgasSemAlteracao || le.linhas47 ||
                           le.irregs || le.interj || lhe !== '00:00' || lhef !== '00:00';
            if (!temAlgoL) continue;
            var p = [];
            p.push('Folgas Mov.:'    + le.folgasAlteradas);
            p.push('Cod 47 Ajust.:' + le.linhas47);
            p.push('Presas:'        + le.folgasSemAlteracao);
            p.push('Irregularidades:' + le.irregs);
            p.push('Interjornada:'  + le.interj);
            if (lhe  !== '00:00') p.push('HE100%:'  + lhe);
            if (lhef !== '00:00') p.push('HEF100%:' + lhef);
            if (lhec !== '00:00') p.push('HEC70%:'  + lhec);
            AF.core.log('! ' + le.nome.trim() + ' | ' + p.join(' | '), '#facc15');
        }

        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        var linhasRel = rel.split('\n');
        for (var ki = 0; ki < linhasRel.length; ki++) {
            if (linhasRel[ki].trim()) AF.core.log(linhasRel[ki], '#6b7280');
        }
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('Relatorio pronto.', '#a3e635');
    };

    // ── Relatório do Analisar (50-analisar) — TSV ───────────────────
    //
    // stats: { totalFolhas, vazias, folgasMoviveis, irregs, interj, cod47, HEmin, HEFmin }
    // lista: [{ nome, folgas, irregs, interj, cod47, HE, HEF, HEC }]

    AF.relatorios.gerarAnalise = function (stats, lista, nomeMesStr, tempoMs, cancelado) {
        var tempoTotal = Math.round(tempoMs / 1000);
        var min = Math.floor(tempoTotal / 60);
        var seg = tempoTotal % 60;

        var totalHEstr  = fmtMin(stats.HEmin);
        var totalHEFstr = fmtMin(stats.HEFmin);

        // ── Cabeçalho corrido ────────────────────────────────────
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

        // ── Tabela TSV ─────────────────────────────────────────────
        var T = '\t';
        rel += 'Nome' + T + 'Folgas p/ Mov.' + T + 'Cod 47 p/ Ajustar' + T + 'Irregularidades' + T + 'Interjornada' + T + 'HE100%' + T + 'HEF100%' + T + 'HEC70%' + '\n';

        for (var ri = 0; ri < lista.length; ri++) {
            var re = lista[ri];
            if (!re.nome || !re.nome.trim()) continue;

            var folgas = re.folgas != null ? re.folgas : 0;
            var irregs = re.irregs != null ? re.irregs : 0;
            var interj = re.interj != null ? re.interj : 0;
            var cod47  = re.cod47  != null ? re.cod47  : 0;
            var he     = normHora(re.HE);
            var hef    = normHora(re.HEF);
            var hec    = normHora(re.HEC);

            rel += re.nome.trim() + T
                +  folgas         + T
                +  cod47          + T
                +  irregs         + T
                +  interj         + T
                +  xls(he)        + T
                +  xls(hef)       + T
                +  xls(hec)       + '\n';
        }

        AF.estado.relatorio     = rel;
        AF.estado.textoCopiavel = rel.replace(/\n/g, '\r\n');

        // ── Montar lista normalizada para a janela ────────────────
        var listaJanela = [];
        for (var ji = 0; ji < lista.length; ji++) {
            var jr = lista[ji];
            if (!jr.nome || !jr.nome.trim()) continue;
            listaJanela.push({
                nome:   jr.nome.trim(),
                folgas: jr.folgas != null ? jr.folgas : 0,
                cod47:  jr.cod47  != null ? jr.cod47  : 0,
                presas: null,
                irregs: jr.irregs != null ? jr.irregs : 0,
                interj: jr.interj != null ? jr.interj : 0,
                he:  normHora(jr.HE),
                hef: normHora(jr.HEF),
                hec: normHora(jr.HEC)
            });
        }

        AF.estado.relatorioLista = listaJanela;
        AF.estado.relatorioTipo  = 'analise';
        AF.estado.relatorioMeta  = {
            titulo:  'Relatório de Análise — ' + nomeMesStr,
            status:  cancelado ? 'INTERROMPIDO' : 'CONCLUÍDO',
            folhas:  stats.totalFolhas + stats.vazias,
            tempo:   min + 'min ' + seg + 's',
            gerado:  new Date().toLocaleString('pt-BR')
        };

        AF.relatorios.habilitarCopiar('Relatório de Análise');

        // ── Log resumo por pessoa ─────────────────────────────────
        for (var li = 0; li < lista.length; li++) {
            var le = lista[li];
            if (!le.nome || !le.nome.trim()) continue;
            var lf   = le.folgas != null ? le.folgas : 0;
            var li2  = le.irregs != null ? le.irregs : 0;
            var lt   = le.interj != null ? le.interj : 0;
            var lc   = le.cod47  != null ? le.cod47  : 0;
            var lhe  = normHora(le.HE);
            var lhef = normHora(le.HEF);
            var lhec = normHora(le.HEC);
            var p = [];
            if (lf) p.push('Folgas p/ Mov.:'     + lf);
            if (lc) p.push('Cod 47 p/ Ajustar:' + lc);
            p.push('Irregularidades:' + li2);
            p.push('Interjornada:'    + lt);
            if (lhe  !== '00:00') p.push('HE100%:'  + lhe);
            if (lhef !== '00:00') p.push('HEF100%:' + lhef);
            if (lhec !== '00:00') p.push('HEC70%:'  + lhec);
            AF.core.log('! ' + le.nome.trim() + ' | ' + p.join(' | '), '#facc15');
        }

        // ── Log encerramento ─────────────────────────────────────
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('ANALISE CONCLUIDA', '#f9fafb');
        AF.core.log('Tempo: ' + min + 'min ' + seg + 's', '#89b4fa');
        AF.core.log('Folgas p/ Mov.: ' + stats.folgasMoviveis + ' | Cod 47 p/ Ajustar: ' + stats.cod47 + ' | Irregularidades: ' + stats.irregs + ' | Interjornada: ' + stats.interj, '#89b4fa');
        AF.core.log('HE100%: ' + totalHEstr + ' | HEF100%: ' + totalHEFstr, '#89b4fa');
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');

        var linhasRel = rel.split('\n');
        for (var ki = 0; ki < linhasRel.length; ki++) {
            if (linhasRel[ki].trim()) AF.core.log(linhasRel[ki], '#6b7280');
        }
        AF.core.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#374151');
        AF.core.log('Relatorio pronto.', '#a3e635');
    };

    // ── Abrir janela popup com tabela visual ───────────────────────

    AF.relatorios.abrirJanela = function () {
        var lista = AF.estado.relatorioLista || [];
        var meta  = AF.estado.relatorioMeta  || {};
        var tipo  = AF.estado.relatorioTipo  || 'analise';
        var tsv   = AF.estado.textoCopiavel  || '';

        if (AF.estado.winRelatorio && !AF.estado.winRelatorio.closed) {
            AF.estado.winRelatorio.focus();
            AF.estado.winRelatorio._fpwAtualizar && AF.estado.winRelatorio._fpwAtualizar(lista, meta, tipo, tsv);
            return;
        }

        var win = window.open('', 'fpw-relatorio',
            'width=980,height=620,left=80,top=60,resizable=yes,scrollbars=no');
        if (!win) {
            AF.core.log('Popup bloqueado pelo navegador.', '#f87171');
            return;
        }
        AF.estado.winRelatorio = win;

        var heToMin = function (str) {
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

        var abrevNome = function (nome) {
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
        };

        var gerarHTML = function (lista, meta, tipo, tsv) {
            var temPressa = tipo === 'execucao';

            var maxIrregs = 1, maxInterj = 1, maxFolgas = 1, maxCod47 = 1, maxPressa = 1;
            for (var i = 0; i < lista.length; i++) {
                if (lista[i].irregs > maxIrregs) maxIrregs = lista[i].irregs;
                if (lista[i].interj > maxInterj) maxInterj = lista[i].interj;
                if (lista[i].folgas > maxFolgas) maxFolgas = lista[i].folgas;
                if (lista[i].cod47  > maxCod47)  maxCod47  = lista[i].cod47;
                if (temPressa && lista[i].presas > maxPressa) maxPressa = lista[i].presas;
            }

            var chipRed = function (val, mx) {
                if (!val) return '<span style="color:#4a5568">0</span>';
                var r = val / mx;
                var bg = r <= 0.2 ? 'rgba(239,68,68,.10)' : r <= 0.4 ? 'rgba(239,68,68,.20)' : r <= 0.6 ? 'rgba(239,68,68,.32)' : r <= 0.8 ? 'rgba(239,68,68,.48)' : 'rgba(239,68,68,.68)';
                var fg = r <= 0.8 ? '#fca5a5' : '#fff';
                return '<span style="background:' + bg + ';color:' + fg + ';padding:1px 6px;border-radius:4px;font-weight:600">' + val + '</span>';
            };
            var chipOra = function (val, mx) {
                if (!val) return '<span style="color:#4a5568">0</span>';
                var r = val / mx;
                var bg = r <= 0.2 ? 'rgba(249,115,22,.10)' : r <= 0.4 ? 'rgba(249,115,22,.20)' : r <= 0.6 ? 'rgba(249,115,22,.32)' : r <= 0.8 ? 'rgba(249,115,22,.48)' : 'rgba(249,115,22,.68)';
                var fg = r <= 0.8 ? '#fdba74' : '#fff';
                return '<span style="background:' + bg + ';color:' + fg + ';padding:1px 6px;border-radius:4px;font-weight:600">' + val + '</span>';
            };
            var cellHe = function (val) {
                var s = String(val || '00:00').replace(/^'/, '');
                var m = heToMin(s);
                if (m > 0) return '<span style="color:#22c55e;font-weight:600">' + s + '</span>';
                if (m < 0) return '<span style="color:#ef4444;font-weight:600">' + s + '</span>';
                return '<span style="color:#374151">00:00</span>';
            };

            var tF = 0, tC = 0, tP = 0, tI = 0, tJ = 0, tHE = 0, tHEF = 0, tHECpos = 0, tHECneg = 0;
            for (var ti = 0; ti < lista.length; ti++) {
                var d = lista[ti];
                tF  += d.folgas || 0;
                tC  += d.cod47  || 0;
                tP  += d.presas || 0;
                tI  += d.irregs || 0;
                tJ  += d.interj || 0;
                tHE  += heToMin(d.he);
                tHEF += heToMin(d.hef);
                var hecMin = heToMin(d.hec);
                if (hecMin >= 0) tHECpos += hecMin; else tHECneg += hecMin;
            }
            var hecTotalHtml = '<span style="color:#22c55e;font-weight:700">+' + minToHe(tHECpos) + '</span>'
                             + '<span style="color:#4a5568;margin:0 3px">/</span>'
                             + '<span style="color:#ef4444;font-weight:700">' + minToHe(tHECneg) + '</span>';

            var rows = '';
            for (var ri = 0; ri < lista.length; ri++) {
                var d = lista[ri];
                var pressaCell = temPressa
                    ? '<td style="text-align:right;padding:5px 10px">' + chipOra(d.presas, maxPressa) + '</td>'
                    : '<td style="text-align:center;padding:5px 10px;color:#374151">—</td>';
                rows += '<tr class="fpw-row" data-nome="' + d.nome + '" style="border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer">'
                    + '<td style="padding:5px 10px;color:#e2e8f0;font-weight:500;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + d.nome + '">' + abrevNome(d.nome) + '</td>'
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

            var pressaTh  = temPressa ? '<th style="text-align:right">Presas</th>'  : '<th style="text-align:center">Presas</th>';
            var pressaTot = temPressa ? '<td style="text-align:right;padding:8px 10px">' + tP + '</td>' : '<td style="text-align:center;padding:8px 10px;color:#374151">—</td>';

            var statusColor = meta.status === 'CONCLUÍDO' ? '#22c55e' : '#f97316';
            var badgeStatus = '<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;background:rgba(34,197,94,.12);color:' + statusColor + ';border:1px solid rgba(34,197,94,.2);text-transform:uppercase;letter-spacing:.04em">' + meta.status + '</span>';

            var tsvEsc = JSON.stringify(tsv);

            return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
                + '<title>FPW — ' + meta.titulo + '</title>'
                + '<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">'
                + '<style>'
                + '*{box-sizing:border-box;margin:0;padding:0}'
                + 'html,body{background:#0f1117;color:#e2e8f0;font-family:"Satoshi","Inter",sans-serif;font-size:12px;height:100%;overflow:hidden}'
                + '.frame{display:flex;flex-direction:column;height:100vh;border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.5)}'
                + '.hdr{background:#0d1117;border-bottom:1px solid rgba(255,255,255,.12);padding:10px 16px;flex-shrink:0}'
                + '.hdr-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}'
                + '.hdr-title{font-size:14px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}'
                + '.hdr-meta{display:flex;flex-wrap:wrap;gap:4px 20px;font-size:11px;color:#6b7280}'
                + '.meta-lbl{color:#374151}.meta-val{color:#8b95a5;font-weight:500}.meta-hi{color:#3b82f6;font-weight:700}'
                + '.tbl-wrap{overflow-x:auto;overflow-y:auto;flex:1}'
                + '.tbl-wrap::-webkit-scrollbar{width:5px;height:5px}'
                + '.tbl-wrap::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:99px}'
                + 'table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}'
                + 'thead{position:sticky;top:0;z-index:10}'
                + 'thead th{background:#0d1117;color:#6b7280;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.12);white-space:nowrap;text-align:right}'
                + 'thead th:first-child{text-align:left;width:185px}'
                + 'tbody tr:hover{background:rgba(255,255,255,.04)}'
                + 'tbody tr.active-row{background:rgba(59,130,246,.12)!important;outline:1px solid rgba(59,130,246,.3)}'
                + '.row-total{background:rgba(59,130,246,.07)!important;border-top:2px solid #3b82f6!important}'
                + '.row-total td{font-weight:700;color:#e2e8f0!important;padding:8px 10px;font-size:11px}'
                + '.row-total td:first-child{color:#3b82f6!important;font-size:10px;text-transform:uppercase;letter-spacing:.05em}'
                + '.ftr{background:#0d1117;border-top:1px solid rgba(255,255,255,.08);padding:8px 16px;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0}'
                + '.btn-copy{display:flex;align-items:center;gap:6px;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:.02em;transition:filter .15s}'
                + '.btn-copy:hover{filter:brightness(1.2)}.btn-copy.ok{background:#22c55e}'
                + '.hint{font-size:10px;color:#374151}.nav-hint{font-size:10px;color:#4a5568;display:flex;align-items:center;gap:4px}'
                + '</style></head><body>'
                + '<div class="frame">'
                + '<div class="hdr">'
                +   '<div class="hdr-row1"><div class="hdr-title">📋 ' + meta.titulo + ' ' + badgeStatus + '</div></div>'
                +   '<div class="hdr-meta">'
                +     '<span class="meta-lbl">Folhas:&nbsp;</span><span class="meta-hi">' + meta.folhas + '</span>'
                +     '<span class="meta-lbl">Duração:&nbsp;</span><span class="meta-hi">' + meta.tempo + '</span>'
                +     '<span class="meta-lbl">Gerado em:&nbsp;</span><span class="meta-val">' + meta.gerado + '</span>'
                +   '</div>'
                + '</div>'
                + '<div class="tbl-wrap"><table>'
                +   '<thead><tr>'
                +     '<th style="text-align:left">Nome</th>'
                +     '<th style="text-align:right">Folgas Mov.</th>'
                +     '<th style="text-align:right">Cód 47</th>'
                +     pressaTh
                +     '<th style="text-align:right">Irregularidades</th>'
                +     '<th style="text-align:right">Interjornada</th>'
                +     '<th style="text-align:right">HE100%</th>'
                +     '<th style="text-align:right">HEF100%</th>'
                +     '<th style="text-align:right">HEC70%</th>'
                +   '</tr></thead>'
                +   '<tbody>' + rows + '</tbody>'
                +   '<tfoot><tr class="row-total">'
                +     '<td>▸ TOTAIS</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + tF + '</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + tC + '</td>'
                +     pressaTot
                +     '<td style="text-align:right;padding:8px 10px">' + tI + '</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + tJ + '</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + cellHe(minToHe(tHE)) + '</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + cellHe(minToHe(tHEF)) + '</td>'
                +     '<td style="text-align:right;padding:8px 10px">' + hecTotalHtml + '</td>'
                +   '</tr></tfoot>'
                + '</table></div>'
                + '<div class="ftr">'
                +   '<span class="nav-hint">👆 Clique em uma linha para navegar até o funcionário</span>'
                +   '<span class="hint">Copia TSV para Excel / Sheets</span>'
                +   '<button class="btn-copy" id="btn-tsv">📋 Copiar TSV</button>'
                + '</div>'
                + '</div>'
                + '<script>'
                + 'var _tsv=' + tsvEsc + ';'
                + 'document.getElementById("btn-tsv").onclick=function(){'
                +   'navigator.clipboard.writeText(_tsv).then(function(){'
                +     'var b=document.getElementById("btn-tsv");'
                +     'b.classList.add("ok");b.textContent="✓ Copiado!";'
                +     'setTimeout(function(){b.classList.remove("ok");b.innerHTML="📋 Copiar TSV";},2500);'
                +   '}).catch(function(){alert("Erro ao copiar.");});'
                + '};'
                + 'document.querySelectorAll(".fpw-row").forEach(function(tr){'
                +   'tr.addEventListener("mouseenter",function(){this.style.background="rgba(255,255,255,.05)";});'
                +   'tr.addEventListener("mouseleave",function(){if(!this.classList.contains("active-row"))this.style.background="";});'
                +   'tr.addEventListener("click",function(){'
                +     'document.querySelectorAll(".fpw-row").forEach(function(r){r.classList.remove("active-row");r.style.background="";});'
                +     'this.classList.add("active-row");'
                +     'var nome=this.getAttribute("data-nome");'
                +     'try{'
                +       'var f0=window.opener.top.frames[0];'
                +       'var docC=f0.document;'
                +       'var sel=docC.getElementById("lstNome")||docC.querySelector("select[name=lstNome]");'
                +       'if(!sel)return;'
                +       'var norm=function(s){return(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().trim();};'
                +       'var nn=norm(nome);'
                +       'for(var i=0;i<sel.options.length;i++){'
                +         'if(norm(sel.options[i].text.replace(/\\s+\\d+$/,""))===nn){'
                +           'sel.selectedIndex=i;'
                +           'try{f0.AjustaCodEmpresaEmpregado(docC.yourform.lstNome,docC.yourform.CodEmpresaEmpregado);}catch(e){}'
                +           'try{f0.AtualizaFuncionario();}catch(e){sel.dispatchEvent(new Event("change",{bubbles:true}));}'
                +           'break;'
                +         '}'
                +       '}'
                +     '}catch(e){}'
                +   '});'
                + '});'
                + '<\/script>'
                + '</body></html>';
        };

        var html = gerarHTML(lista, meta, tipo, tsv);
        win.document.open();
        win.document.write(html);
        win.document.close();

        win._fpwAtualizar = function (l, m, t, ts) {
            var h = gerarHTML(l, m, t, ts);
            win.document.open();
            win.document.write(h);
            win.document.close();
        };
    };

})();
