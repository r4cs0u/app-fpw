(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.detector = AF.detector || {};

    var DIA_MS = 24 * 60 * 60 * 1000;

    function norm(s) {
        return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function textoPreenchido(v) {
        return v !== null && v !== undefined && String(v).trim() !== '';
    }

    // ── Marcação: hora + origem (relógio, mobile, web ou manual) ───────

    AF.detector.parseMarcacao = function (valor) {
        var m = /^\s*(\d{1,2}):(\d{2})\s*([*MWmw])?/.exec(String(valor == null ? '' : valor));
        if (!m) return null;
        var sufixo = (m[3] || '').toUpperCase();
        var origem = sufixo === '*' ? 'manual' : sufixo === 'M' ? 'mobile' : sufixo === 'W' ? 'web' : 'relogio';
        return {
            hora: String(m[1]).padStart(2, '0') + ':' + m[2],
            minutos: m[2],
            origem: origem
        };
    };

    // ── Entrada = esquerda da 1ª linha; saída = direita da última linha com campo ──

    AF.detector.entradaSaidaDoDia = function (linhas) {
        var entrada = null;
        var saida = null;
        if (!linhas || !linhas.length) return { entrada: null, saida: null };

        entrada = AF.detector.parseMarcacao(linhas[0].marc1);
        for (var i = linhas.length - 1; i >= 0; i--) {
            var marca = AF.detector.parseMarcacao(linhas[i].marc2);
            if (marca) { saida = marca; break; }
        }
        return { entrada: entrada, saida: saida };
    };

    function sequenciasDeMinutos(itens) {
        var sequencias = [];
        var atual = [];
        for (var i = 0; i < itens.length; i++) {
            if (atual.length && atual[atual.length - 1].minutos === itens[i].minutos) {
                atual.push(itens[i]);
            } else {
                if (atual.length >= 3) sequencias.push(atual);
                atual = [itens[i]];
            }
        }
        if (atual.length >= 3) sequencias.push(atual);
        return sequencias;
    }

    function detectarBritanica(diasOrdenados) {
        var lista = [];
        var sequencias = [];
        ['entrada', 'saida'].forEach(function (campo) {
            var manuais = [];
            diasOrdenados.forEach(function (dia) {
                var marca = dia[campo];
                if (marca && marca.origem === 'manual') {
                    manuais.push({ data: dia.dataStr, minutos: marca.minutos, hora: marca.hora });
                }
            });
            sequenciasDeMinutos(manuais).forEach(function (seq) {
                sequencias.push({ campo: campo, minutos: seq[0].minutos, dias: seq.map(function (x) { return x.data; }) });
                seq.forEach(function (x) {
                    lista.push({ data: x.data, campo: campo, minutos: x.minutos, hora: x.hora });
                });
            });
        });
        return { lista: lista, sequencias: sequencias };
    }

    function avaliarNaoPreenchida(diasOrdenados, camposMarcacaoPresentes) {
        var visiveis = diasOrdenados.length;
        var base = {
            avaliada: false, flag: false, criterios: [],
            visiveis: visiveis, preenchidos: 0, pctNaoPreenchida: 0, maiorSequenciaDias: 0
        };
        if (!visiveis || !camposMarcacaoPresentes) return base;

        var preenchidos = 0;
        var maior = 0;
        var inicio = null;
        var fim = null;

        function fecharSequencia() {
            if (inicio) {
                var span = Math.round((fim - inicio) / DIA_MS) + 1;
                if (span > maior) maior = span;
            }
            inicio = null;
            fim = null;
        }

        for (var i = 0; i < diasOrdenados.length; i++) {
            var dia = diasOrdenados[i];
            if (dia.preenchido) {
                preenchidos++;
                fecharSequencia();
            } else {
                if (!inicio) inicio = dia.dataObj;
                fim = dia.dataObj;
            }
        }
        fecharSequencia();

        var criterios = [];
        if (preenchidos <= Math.floor(visiveis / 4)) criterios.push('fracao');
        if (maior >= 7) criterios.push('sequencia');

        return {
            avaliada: true,
            flag: criterios.length > 0,
            criterios: criterios,
            visiveis: visiveis,
            preenchidos: preenchidos,
            pctNaoPreenchida: Math.round(100 * (visiveis - preenchidos) / visiveis),
            maiorSequenciaDias: maior
        };
    }

    // ── Regras puras: recebe linhas estruturadas e o mês alvo ──────────

    AF.detector.detectarFolha = function (linhas, alvo) {
        linhas = linhas || [];
        var porData = {};
        var ordem = [];
        var camposMarcacaoPresentes = false;

        for (var i = 0; i < linhas.length; i++) {
            var linha = linhas[i];
            if (!linha || !linha.dataStr) continue;
            var dataObj = AF.utils.parseDataBR(linha.dataStr);
            if (!dataObj || !AF.utils.ehMesAlvo(dataObj, alvo)) continue;

            if (linha.marc1 !== null && linha.marc1 !== undefined) camposMarcacaoPresentes = true;
            if (linha.marc2 !== null && linha.marc2 !== undefined) camposMarcacaoPresentes = true;

            var dia = porData[linha.dataStr];
            if (!dia) {
                dia = { dataStr: linha.dataStr, dataObj: dataObj, cabecalho: linha.cabecalho || '', linhas: [] };
                porData[linha.dataStr] = dia;
                ordem.push(dia);
            }
            if (!dia.cabecalho && linha.cabecalho) dia.cabecalho = linha.cabecalho;
            dia.linhas.push(linha);
        }

        ordem.sort(function (a, b) { return a.dataObj - b.dataObj; });

        var semES = [];
        var interj = [];
        var entradasSaidas = [];

        for (var d = 0; d < ordem.length; d++) {
            var item = ordem[d];

            for (var l = 0; l < item.linhas.length; l++) {
                var v = norm(item.linhas[l].irre);
                if (v.indexOf('marcacao irregular') >= 0 ||
                    v.indexOf('hora extra irregular') >= 0 ||
                    v.indexOf('s/marc') >= 0) {
                    semES.push({ data: item.dataStr, texto: String(item.linhas[l].irre || '').trim() });
                }
            }

            if (norm(item.cabecalho).indexOf('interjornada') >= 0) {
                interj.push({ data: item.dataStr });
            }

            var es = AF.detector.entradaSaidaDoDia(item.linhas);
            item.entrada = es.entrada;
            item.saida = es.saida;
            item.preenchido = item.linhas.some(function (x) {
                return textoPreenchido(x.marc1) || textoPreenchido(x.marc2);
            });
            entradasSaidas.push({
                data: item.dataStr,
                entrada: es.entrada ? es.entrada.hora + (es.entrada.origem === 'manual' ? '*' : '') : null,
                saida: es.saida ? es.saida.hora + (es.saida.origem === 'manual' ? '*' : '') : null
            });
        }

        var britanica = detectarBritanica(ordem);
        var naoPreenchida = avaliarNaoPreenchida(ordem, camposMarcacaoPresentes);

        return {
            dias: { semES: semES, interj: interj, britanica: britanica.lista },
            britanicaSequencias: britanica.sequencias,
            naoPreenchida: naoPreenchida,
            contagens: {
                semES: semES.length,
                interj: interj.length,
                britanica: britanica.lista.length,
                naoPreenchida: naoPreenchida.flag ? 1 : 0
            },
            entradasSaidas: entradasSaidas,
            marcacoesAvaliadas: camposMarcacaoPresentes
        };
    };

    // ── Leitura somente leitura da página ──────────────────────────────

    function valorDoCampo(tr, doc, nome) {
        var el = tr ? tr.querySelector('[name="' + nome + '"]') : null;
        if (!el && doc) el = doc.querySelector('[name="' + nome + '"]');
        return el ? String(el.value == null ? '' : el.value) : null;
    }

    AF.detector.lerLinhasFolha = function (doc) {
        doc = doc || AF.core.getDoc1();
        var campos = Array.from(doc.querySelectorAll('input[name^="Irre"]'));
        var linhas = [];

        for (var i = 0; i < campos.length; i++) {
            var inp = campos[i];
            var n = String(inp.name || '').replace(/^Irre/, '');
            var cabecalho = AF.mapa.obterCabecalhoDoDia(inp) || '';
            var m = /(\d{2}\/\d{2}\/\d{4})/.exec(cabecalho);
            if (!m) continue;
            var tr = inp.closest('tr');

            linhas.push({
                n: n,
                dataStr: m[1],
                cabecalho: cabecalho,
                marc1: valorDoCampo(tr, doc, 'Marc1' + n),
                marc2: valorDoCampo(tr, doc, 'Marc2' + n),
                irre: String(inp.value == null ? '' : inp.value),
                codJust: valorDoCampo(tr, doc, 'CodJust' + n)
            });
        }
        return linhas;
    };

    AF.detector.lerFolhaAtual = function (doc) {
        var alvo = AF.utils.mesAlvoDaTabela();
        var resultado = AF.detector.detectarFolha(AF.detector.lerLinhasFolha(doc), alvo);
        resultado.alvo = alvo;
        return resultado;
    };

    console.log('[FPW] 25-detector carregado. v1.0 - detector de folha (linhas estruturadas + regras puras)');
})();
