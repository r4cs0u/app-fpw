(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.planejamento = AF.planejamento || {};

    function escolherAusenciaDestino(ausencias, usadas) {
        var disponiveis = ausencias.filter(function (a) {
            return !usadas || !usadas.has(a.dataStr);
        });
        var domingo = disponiveis.filter(function (a) { return a.dataObj.getDay() === 0; })[0];
        return domingo || disponiveis[0] || null;
    }

    AF.planejamento.planejarFase1Rodada = function (mapa, datasUsadas) {
        var chaves = Object.keys(mapa.semanas);
        for (var i = 0; i < chaves.length; i++) {
            var semKey = chaves[i];
            var semana = mapa.semanas[semKey];
            if (!semana.folgas.length) continue;

            var datasFolgaVistas = {};
            for (var j = 0; j < semana.folgas.length; j++) {
                var folga = semana.folgas[j];
                if (datasFolgaVistas[folga.dataStr]) continue;
                datasFolgaVistas[folga.dataStr] = true;
                if (datasUsadas.has(folga.dataStr)) continue;

                if (semana.ausencias.length > 0) {
                    var aus = escolherAusenciaDestino(semana.ausencias, datasUsadas);
                    if (!aus) continue;
                    return {
                        acabou: false,
                        presa: null,
                        acao: {
                            fase: 1, tipo: 'folga_mes',
                            semanaId: semKey,
                            numAbrirPopup: aus.num,
                            dataAusencia: aus.dataStr,
                            dataOrigem: folga.dataStr,
                            candidatos: [folga.dataStr]
                        }
                    };
                } else {
                    return {
                        acabou: false,
                        presa: { fase: 1, semanaId: semKey, dataFolga: folga.dataStr, numFolga: folga.num },
                        acao: null
                    };
                }
            }
        }
        return { acabou: true };
    };

    AF.planejamento.planejarFase2Rodada = function (mapa, historicoTentativas, datasUsadasFase2) {
        var ultimaSemanaId = mapa.ultimaSemanaId || AF.utils.semanaIdBR(new Date(mapa.alvo.getFullYear(), mapa.alvo.getMonth() + 1, 0));
        var semana = mapa.semanas[ultimaSemanaId];

        if (!semana) return { acabou: true, motivo: 'sem_ultima_semana' };

        var ausencias = (semana.ausenciasMes || []).slice().sort(function (a, b) { return a.dataObj - b.dataObj; });
        if (!ausencias.length) return { acabou: true, motivo: 'sem_ausencia_no_mes' };

        var usadas = datasUsadasFase2 || new Set();
        var ausenciaDestino = escolherAusenciaDestino(ausencias, usadas);
        if (!ausenciaDestino) return { acabou: true, motivo: 'sem_ausencia_disponivel' };

        var chaveBase = ausenciaDestino.dataStr + '|';
        var folgasVisiveis = (semana.folgasVisiveis || []).slice();
        var visiveisUnicas = [];
        var visSet = new Set();
        for (var i = 0; i < folgasVisiveis.length; i++) {
            if (visSet.has(folgasVisiveis[i].dataStr)) continue;
            visSet.add(folgasVisiveis[i].dataStr);
            visiveisUnicas.push(folgasVisiveis[i]);
        }

        for (var v = 0; v < visiveisUnicas.length; v++) {
            var fv = visiveisUnicas[v];
            if (usadas.has(fv.dataStr)) continue;
            var chaveV = chaveBase + fv.dataStr + '|visivel';
            if (historicoTentativas[chaveV]) continue;
            return { acabou: false, tipo: 'visivel', acao: { fase: 2, tipo: 'folga_visivel_ultima_semana', semanaId: ultimaSemanaId, numAbrirPopup: ausenciaDestino.num, dataAusencia: ausenciaDestino.dataStr, dataOrigem: fv.dataStr, candidatos: [fv.dataStr] } };
        }

        var folgasOcultas = (semana.folgasOcultas || []).slice();
        var elegiveisSet = new Set((semana.domingosOcultos || []).concat(semana.feriadosOcultos || []));
        var ocultasUnicas = [];
        var occSet = new Set();
        for (var o = 0; o < folgasOcultas.length; o++) {
            var dataOculta = folgasOcultas[o];
            if (!elegiveisSet.has(dataOculta)) continue;
            if (occSet.has(dataOculta)) continue;
            occSet.add(dataOculta);
            ocultasUnicas.push(dataOculta);
        }

        for (var j = 0; j < ocultasUnicas.length; j++) {
            var fo = ocultasUnicas[j];
            if (usadas.has(fo)) continue;
            var chaveO = chaveBase + fo + '|oculta';
            if (historicoTentativas[chaveO]) continue;
            return { acabou: false, tipo: 'oculta', acao: { fase: 2, tipo: 'folga_oculta', semanaId: ultimaSemanaId, numAbrirPopup: ausenciaDestino.num, dataAusencia: ausenciaDestino.dataStr, dataOrigem: fo, candidatos: ocultasUnicas.slice() } };
        }

        return { acabou: true, motivo: 'sem_folga_oculta_valida' };
    };

    AF.planejamento.planejarFase3 = function (mapa, presasAnteriores) {
        var acoes = [];
        var presasFinais = [];
        var presasVistas = {};

        for (var i = 0; i < presasAnteriores.length; i++) {
            var presa = presasAnteriores[i];
            var chavePresa = presa.semanaId + '|' + presa.dataFolga;
            if (presasVistas[chavePresa]) continue;
            presasVistas[chavePresa] = true;

            var semana = mapa.semanas[presa.semanaId];
            if (!semana) { presasFinais.push(presa); continue; }

            var ausencias = (semana.ausenciasMes || []).slice();
            var numPopup, dataAusencia;
            if (ausencias.length) {
                numPopup = ausencias[0].num;
                dataAusencia = ausencias[0].dataStr;
            } else if (presa.numFolga) {
                numPopup = presa.numFolga;
                dataAusencia = presa.dataFolga;
            } else {
                presasFinais.push(presa);
                continue;
            }

            var feriadosVisiveis = (semana.feriadosSemana || []).filter(function (feriado) {
                return !presa.dataFolga || feriado.dataStr !== presa.dataFolga;
            });
            if (feriadosVisiveis.length > 0) {
                acoes.push({
                    fase: 3, tipo: 'feriado_visivel',
                    semanaId: presa.semanaId,
                    numAbrirPopup: numPopup,
                    dataAusencia: dataAusencia,
                    dataOrigem: feriadosVisiveis[0].dataStr,
                    candidatos: [feriadosVisiveis[0].dataStr],
                    dataFolgaOriginal: presa.dataFolga
                });
                continue;
            }

            var feriadosOcultos = (semana.feriadosOcultos || []).filter(function (data) {
                return !presa.dataFolga || data !== presa.dataFolga;
            });
            if (feriadosOcultos.length > 0) {
                acoes.push({
                    fase: 3, tipo: 'feriado_oculto',
                    semanaId: presa.semanaId,
                    numAbrirPopup: numPopup,
                    dataAusencia: dataAusencia,
                    dataOrigem: feriadosOcultos[0],
                    candidatos: feriadosOcultos.slice(),
                    dataFolgaOriginal: presa.dataFolga
                });
                continue;
            }

            var domingosOcultos = (semana.domingosOcultos || []).filter(function (data) {
                return !presa.dataFolga || data !== presa.dataFolga;
            });
            if (domingosOcultos.length > 0) {
                acoes.push({
                    fase: 3, tipo: 'domingo_oculto',
                    semanaId: presa.semanaId,
                    numAbrirPopup: numPopup,
                    dataAusencia: dataAusencia,
                    dataOrigem: domingosOcultos[0],
                    candidatos: domingosOcultos.slice(),
                    dataFolgaOriginal: presa.dataFolga
                });
                continue;
            }

            presasFinais.push(presa);
        }

        return { acoes: acoes, presasFinais: presasFinais };
    };

    console.log('[FPW] 35-planejamento carregado.');
})();
