(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.mapa = AF.mapa || {};

    function obterTextoDaLinhaComData(el) {
        if (!el) return '';

        var tag = String(el.tagName || '').toUpperCase();
        if (tag === 'TR') {
            var textoLinha = String(el.innerText || el.textContent || '');
            return /\d{2}\/\d{2}\/\d{4}/.test(textoLinha) ? textoLinha : '';
        }

        var linhas = typeof el.querySelectorAll === 'function'
            ? el.querySelectorAll('tr')
            : [];
        for (var i = linhas.length - 1; i >= 0; i--) {
            var texto = String(linhas[i].innerText || linhas[i].textContent || '');
            if (/\d{2}\/\d{2}\/\d{4}/.test(texto)) return texto;
        }
        return '';
    }

    AF.mapa.obterDataDoInput = function (inp) {
        var texto = AF.mapa.obterCabecalhoDoDia(inp);
        var m = String(texto || '').match(/(\d{2}\/\d{2}\/\d{4})/);
        return m ? m[1] : null;
    };

    AF.mapa.obterCabecalhoDoDia = function (inp) {
        var el = inp.closest('tr');
        while (el) {
            var anterior = el.previousElementSibling;
            if (anterior) {
                var texto = obterTextoDaLinhaComData(anterior);
                if (texto) return texto;
                el = anterior;
                continue;
            }
            var pai = el.parentElement;
            if (!pai) break;
            var paiAnterior = pai.previousElementSibling;
            if (paiAnterior) {
                var texto2 = obterTextoDaLinhaComData(paiAnterior);
                if (texto2) return texto2;
                var filhos = typeof paiAnterior.querySelectorAll === 'function'
                    ? paiAnterior.querySelectorAll('tr')
                    : [];
                if (filhos.length > 0) {
                    el = filhos[filhos.length - 1];
                    continue;
                }
            }
            el = pai;
        }
        return '';
    };

    AF.mapa.construirMapaFolha = function (dataAlvo, itens) {
        dataAlvo = dataAlvo || new Date();
        itens = itens || [];

        var ultimoDia = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth() + 1, 0);
        var ultimaSemanaId = AF.utils.semanaIdBR(ultimoDia);
        var inicioUltimaSemana = AF.utils.inicioSemanaBR(ultimoDia);

        var semanas = {};
        var lista = [];

        for (var i = 0; i < itens.length; i++) {
            var rawItem = itens[i];
            if (!rawItem) continue;

            var dataStr = rawItem.dataStr;
            if (!dataStr) continue;

            var dataObj = rawItem.dataObj || AF.utils.parseDataBR(dataStr);
            if (!dataObj) continue;

            var ehMesAlvo = AF.utils.ehMesAlvo(dataObj, dataAlvo);
            var semId = AF.utils.semanaIdBR(dataObj);
            var ehUltimaSem = semId === ultimaSemanaId;

            if (!ehMesAlvo && !ehUltimaSem) continue;

            if (!semanas[semId]) {
                semanas[semId] = {
                    registros: [],
                    folgas: [],
                    folgasVisiveis: [],
                    folgasOcultas: [],
                    domingosOcultos: [],
                    ausencias: [],
                    ausenciasMes: [],
                    feriados: [],
                    feriadosSemana: [],
                    feriadosOcultos: []
                };
            }

            var item = {
                inp: rawItem.inp,
                num: String(rawItem.num != null ? rawItem.num : (rawItem.name || '').replace('Irre', '')),
                dataStr: dataStr,
                dataObj: dataObj,
                valor: String(rawItem.valor != null ? rawItem.valor : (rawItem.value || '')).trim(),
                cabecalho: String(rawItem.cabecalho || ''),
                semanaId: semId,
                foraDoMes: !ehMesAlvo
            };

            semanas[semId].registros.push(item);
            semanas[semId].datasRegistradas = semanas[semId].datasRegistradas || {};
            semanas[semId].datasRegistradas[item.dataStr] = true;
            lista.push(item);

            if (AF.utils.ehFolgaCabecalho(item.cabecalho)) {
                semanas[semId].folgas.push(item);
                semanas[semId].folgasVisiveis.push(item);
            } else if (AF.utils.ehFeriadoCabecalho(item.cabecalho)) {
                semanas[semId].feriados.push(item);
                semanas[semId].feriadosSemana.push(item);
            } else if (AF.utils.ehAusenciaValor(item.valor)) {
                semanas[semId].ausencias.push(item);
                if (ehMesAlvo) semanas[semId].ausenciasMes.push(item);
            }
        }

        // ── folgasOcultas da última semana (comportamento original mantido) ──
        if (inicioUltimaSemana && semanas[ultimaSemanaId]) {
            var semUltima = semanas[ultimaSemanaId];
            for (var d = 0; d < 7; d++) {
                var dt = new Date(
                    inicioUltimaSemana.getFullYear(),
                    inicioUltimaSemana.getMonth(),
                    inicioUltimaSemana.getDate() + d
                );
                var dtStr = AF.utils.fmtDataBR(dt);
                if (!semUltima.datasRegistradas[dtStr]) {
                    semUltima.folgasOcultas.push(dtStr);
                }
            }
        }

        // ── feriadosOcultos: dias não visíveis no DOM que são feriados RJ ──
        var feriadosRJ = AF.utils.calcularFeriadosRJ(dataAlvo.getFullYear());
        var chavesSemanas = Object.keys(semanas);
        for (var s = 0; s < chavesSemanas.length; s++) {
            var semKey = chavesSemanas[s];
            var sem = semanas[semKey];
            var inicioSem = AF.utils.inicioSemanaBR(AF.utils.parseDataBR(semKey));
            if (!inicioSem) continue;
            sem.datasRegistradas = sem.datasRegistradas || {};
            for (var dd = 0; dd < 7; dd++) {
                var ddt = new Date(
                    inicioSem.getFullYear(),
                    inicioSem.getMonth(),
                    inicioSem.getDate() + dd
                );
                var ddtStr = AF.utils.fmtDataBR(ddt);
                if (ddt.getDay() === 0 && !sem.datasRegistradas[ddtStr]) {
                    sem.domingosOcultos.push(ddtStr);
                }
                if (!sem.datasRegistradas[ddtStr] && feriadosRJ.has(ddtStr)) {
                    sem.feriadosOcultos.push(ddtStr);
                }
            }
        }

        return {
            alvo: dataAlvo,
            ultimaSemanaId: ultimaSemanaId,
            semanas: semanas,
            lista: lista
        };
    };

    AF.mapa.coletarItensFolha = function () {
        var itens = [];
        var inputs = Array.from(AF.core.getDoc1().querySelectorAll('input[name^="Irre"]'));

        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var dataStr = AF.mapa.obterDataDoInput(inp);
            if (!dataStr) continue;

            itens.push({
                inp: inp,
                num: (inp.name || '').replace('Irre', ''),
                dataStr: dataStr,
                valor: String(inp.value || '').trim(),
                cabecalho: AF.mapa.obterCabecalhoDoDia(inp) || ''
            });
        }
        return itens;
    };

    AF.mapa.mapearFolhaAtual = function () {
        var dataAlvo = AF.utils.mesAlvoDaTabela();
        var itens = AF.mapa.coletarItensFolha();
        return AF.mapa.construirMapaFolha(dataAlvo, itens);
    };

    console.log('[FPW] 20-mapa carregado.versão 1.2 - Log loading message for 20-mapa version 1.2');
})();
