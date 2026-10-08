(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.preanalise = AF.preanalise || {};

    function parseDataBR(s) {
        if (!s) return null;
        var m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!m) return null;
        return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    }

    function fmtDataBR(d) {
        if (!d) return '';
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

    function inicioSemanaBR(d) {
        if (!d) return null;
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var dia = x.getDay();
        var diff = dia === 0 ? -6 : 1 - dia;
        x.setDate(x.getDate() + diff);
        return x;
    }

    function nomeParaExibicao(nome) {
        return String(nome || '').replace(/\s+\d+$/, '').trim();
    }

    function ordenarDatasUnicas(lista) {
        var vistas = Object.create(null);
        var validas = [];
        (lista || []).forEach(function (item) {
            var s = typeof item === 'object' && item ? (item.data || item.dataStr) : item;
            var txt = String(s == null ? '' : s).trim();
            if (!txt || vistas[txt]) return;
            vistas[txt] = true;
            var d = parseDataBR(txt);
            if (d) {
                validas.push({ txt: fmtDataBR(d), time: d.getTime() });
            } else {
                validas.push({ txt: txt, time: 0 });
            }
        });
        validas.sort(function (a, b) { return a.time - b.time; });
        return validas.map(function (x) { return x.txt; });
    }

    AF.preanalise.intervalo = function (alvo) {
        alvo = alvo || new Date();
        var inicio = new Date(alvo.getFullYear(), alvo.getMonth(), 1);
        var ultimoDiaMes = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0);

        var seg = inicioSemanaBR(ultimoDiaMes);
        var fim = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);

        var totalDias = Math.round((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        var inicioStr = fmtDataBR(inicio);
        var fimStr = fmtDataBR(fim);
        var texto = inicioStr + ' até ' + fimStr + ' (' + totalDias + ' dias)';

        return {
            inicio: inicio,
            fim: fim,
            inicioStr: inicioStr,
            fimStr: fimStr,
            totalDias: totalDias,
            texto: texto
        };
    };

    AF.preanalise.montar = function (leitura, alvo) {
        leitura = leitura || {};
        alvo = alvo || new Date();
        var inter = AF.preanalise.intervalo(alvo);
        var nomeLimpo = nomeParaExibicao(leitura.nome || '');

        if (leitura.vazia) {
            return {
                nome: nomeLimpo,
                vazia: true,
                intervalo: inter,
                folgas: { total: 0, dias: [] },
                cod47: { total: 0, dias: [] },
                irregularidades: { semES: 0, interj: 0, britanica: 0, naoPreenchida: null },
                horas: { HE: '00:00', HEF: '00:00', HEC: '00:00' }
            };
        }

        var folgasDias = ordenarDatasUnicas(leitura.folgasDias || []);
        var cod47Dias = ordenarDatasUnicas(leitura.cod47Dias || []);

        var np = leitura.naoPreenchida || null;
        var npSinalizada = !!(np && np.flag);
        var npPct = npSinalizada ? (np.pctNaoPreenchida != null ? np.pctNaoPreenchida : 0) : null;

        return {
            nome: nomeLimpo,
            vazia: false,
            intervalo: inter,
            folgas: {
                total: leitura.folgasTotal != null ? leitura.folgasTotal : folgasDias.length,
                dias: folgasDias
            },
            cod47: {
                total: leitura.cod47Total != null ? leitura.cod47Total : cod47Dias.length,
                dias: cod47Dias
            },
            irregularidades: {
                semES: Number(leitura.semES != null ? (leitura.semES.total != null ? leitura.semES.total : leitura.semES) : 0),
                interj: Number(leitura.interj != null ? (leitura.interj.total != null ? leitura.interj.total : leitura.interj) : 0),
                britanica: Number(leitura.britanica != null ? (leitura.britanica.total != null ? leitura.britanica.total : leitura.britanica) : 0),
                naoPreenchida: {
                    sinalizada: npSinalizada,
                    pct: npPct
                }
            },
            horas: {
                HE: String(leitura.HE || '00:00'),
                HEF: String(leitura.HEF || '00:00'),
                HEC: String(leitura.HEC || '00:00')
            }
        };
    };

    AF.preanalise.texto = function (resumo) {
        if (!resumo) return '';
        var linhas = [];
        linhas.push('Nome: ' + (resumo.nome || ''));

        if (resumo.vazia) {
            linhas.push('Folha sem marcações indicadas. Não há ajustes previstos.');
            return linhas.join('\n');
        }

        linhas.push('Range da análise: ' + (resumo.intervalo ? resumo.intervalo.texto : ''));
        linhas.push('');
        linhas.push('Ajustes previstos na folha atual');

        var folgasStr = resumo.folgas.total + (resumo.folgas.dias.length ? ' (dias: ' + resumo.folgas.dias.join(', ') + ')' : '');
        linhas.push('Folgas a movimentar: ' + folgasStr);

        var cod47Str = resumo.cod47.total + (resumo.cod47.dias.length ? ' (dias: ' + resumo.cod47.dias.join(', ') + ')' : '');
        linhas.push('Códigos 47 a ajustar: ' + cod47Str);

        linhas.push('');
        linhas.push('Resumo das irregularidades');
        linhas.push('- Sem E/S - ' + resumo.irregularidades.semES);
        linhas.push('- Interj. - ' + resumo.irregularidades.interj);
        linhas.push('- Britânicas - ' + resumo.irregularidades.britanica);
        var npTexto = resumo.irregularidades.naoPreenchida && resumo.irregularidades.naoPreenchida.sinalizada
            ? resumo.irregularidades.naoPreenchida.pct + '%'
            : 'não sinalizada';
        linhas.push('- % Não preenchida - ' + npTexto);

        linhas.push('');
        linhas.push('Resumo de horas');
        linhas.push('- 100% (Acima das 10h): ' + resumo.horas.HE);
        linhas.push('- 100% (Feriado): ' + resumo.horas.HEF);
        linhas.push('- 70% (Compensável): ' + resumo.horas.HEC);

        linhas.push('');
        linhas.push('*Após os ajustes, todos os valores acima podem mudar.');

        return linhas.join('\n');
    };

    AF.preanalise.lerFolhaAtual = function () {
        var nome = (AF.core && typeof AF.core.nomeAtual === 'function') ? AF.core.nomeAtual() : '';
        if (AF.core && typeof AF.core.paginaVaziaAgora === 'function' && AF.core.paginaVaziaAgora()) {
            return AF.preanalise.montar({ nome: nome, vazia: true });
        }

        var alvo = (AF.utils && typeof AF.utils.mesAlvoDaTabela === 'function')
            ? AF.utils.mesAlvoDaTabela()
            : new Date();

        var mapa = (AF.mapa && typeof AF.mapa.mapearFolhaAtual === 'function')
            ? AF.mapa.mapearFolhaAtual()
            : { semanas: {} };

        var folgasDias = (AF.regras && typeof AF.regras.listarFolgasAMovimentar === 'function')
            ? AF.regras.listarFolgasAMovimentar(mapa, alvo)
            : [];

        var analise = (AF.analisar && typeof AF.analisar.analisarFolhaAtual === 'function')
            ? AF.analisar.analisarFolhaAtual()
            : {};

        if (analise.vazia) {
            return AF.preanalise.montar({ nome: nome, vazia: true }, alvo);
        }

        var leitura = {
            nome: nome,
            vazia: false,
            folgasDias: folgasDias,
            folgasTotal: folgasDias.length,
            cod47Dias: analise.cod47Dias || [],
            cod47Total: (analise.cod47Dias || []).length,
            semES: analise.irregs,
            interj: analise.interj,
            britanica: analise.britanica,
            naoPreenchida: analise.naoPreenchida,
            HE: analise.HE,
            HEF: analise.HEF,
            HEC: analise.HEC
        };

        return AF.preanalise.montar(leitura, alvo);
    };

    console.log('[FPW] 38-preanalise carregado. v1.0 - resumo previo puro da folha para ajuste supervisionado');
})();
