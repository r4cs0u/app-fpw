(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.regras = AF.regras || {};

    AF.regras.contarFolgasAMovimentar = function (mapa, alvo) {
        var chaves = Object.keys(mapa.semanas);
        var total = 0;

        for (var i = 0; i < chaves.length; i++) {
            var semana = mapa.semanas[chaves[i]];
            var semanaValida = false;
            var todasFolgas = (semana.folgas || [])
                .concat(semana.folgasVisiveis || [])
                .concat(semana.folgasOcultas || []);

            for (var k = 0; k < todasFolgas.length; k++) {
                var dataObj = AF.utils.parseDataBR(todasFolgas[k].dataStr);
                if (dataObj && AF.utils.ehMesAlvo(dataObj, alvo)) {
                    semanaValida = true;
                    break;
                }
            }
            if (!semanaValida) {
                var todasDatas = (semana.ausencias || [])
                    .concat(semana.ausenciasMes || [])
                    .concat(semana.feriados || []);
                for (var m = 0; m < todasDatas.length; m++) {
                    var dObj = AF.utils.parseDataBR(todasDatas[m].dataStr);
                    if (dObj && AF.utils.ehMesAlvo(dObj, alvo)) {
                        semanaValida = true;
                        break;
                    }
                }
            }

            if (!semanaValida) continue;

            for (var j = 0; j < semana.folgas.length; j++) {
                var folga = semana.folgas[j];
                var fDataObj = AF.utils.parseDataBR(folga.dataStr);
                if (!fDataObj || !AF.utils.ehMesAlvo(fDataObj, alvo)) continue;
                if (semana.ausencias.length > 0 || semana.feriados.length > 0) {
                    total++;
                }
            }

            var temAusenciaMes = (semana.ausenciasMes && semana.ausenciasMes.length > 0);
            if (temAusenciaMes) {
                var fv = (semana.folgasVisiveis || []).filter(function (f) {
                    var fd = AF.utils.parseDataBR(f.dataStr);
                    return fd && AF.utils.ehMesAlvo(fd, alvo) && f.foraDoMes;
                });
                total += fv.length;
                total += (semana.folgasOcultas || []).filter(function (f) {
                    var fd = AF.utils.parseDataBR(f.dataStr);
                    return fd && AF.utils.ehMesAlvo(fd, alvo);
                }).length;
            }
        }

        return total;
    };

    AF.regras.selecionarDiasCod47 = function (campos, alvo, opcoes) {
        opcoes = opcoes || {};
        var ultimaSemanaId = '';
        var incluirTransicao = !opcoes.somenteMesAlvo;
        if (incluirTransicao) {
            ultimaSemanaId = AF.utils.semanaIdBR(new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0));
        }
        var dias = [];

        for (var i = 0; i < campos.length; i++) {
            var campo = campos[i];
            if (!campo.value || campo.value.trim() !== '47') continue;
            var dataStr = campo.dataStr;
            var dataObj = AF.utils.parseDataBR(dataStr);
            if (!dataObj) continue;
            var noEscopo = AF.utils.ehMesAlvo(dataObj, alvo) ||
                (ultimaSemanaId && AF.utils.semanaIdBR(dataObj) === ultimaSemanaId);
            if (noEscopo) dias.push(dataStr);
        }

        return dias;
    };

    AF.regras.somarHorasExtras = function (lancamentos, alvo) {
        var totalHEmin = 0;
        var totalHEFmin = 0;

        for (var i = 0; i < lancamentos.length; i++) {
            var lancamento = lancamentos[i];
            var isHEP = lancamento.codigo === '2';
            var isHEF = lancamento.codigo === '27';
            if (!isHEP && !isHEF) continue;

            if (lancamento.temData) {
                var dataObj = AF.utils.parseDataBR(lancamento.dataStr);
                if (!dataObj || !AF.utils.ehMesAlvo(dataObj, alvo)) continue;
            }

            var raw = lancamento.horasTexto === undefined
                ? ''
                : lancamento.horasTexto.replace('*', '').trim();
            var match = raw.match(/^(\d+):(\d+)(?::\d+)?$/);
            if (!match) continue;
            var minutos = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
            if (isHEF) totalHEFmin += minutos;
            else totalHEmin += minutos;
        }

        function formatarMinutos(total) {
            return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
        }

        return {
            HE: formatarMinutos(totalHEmin),
            HEF: formatarMinutos(totalHEFmin),
            HEmin: totalHEmin,
            HEFmin: totalHEFmin
        };
    };

    AF.regras.interpretarSaldoHEC = function (texto) {
        if (texto == null) return '00:00';
        var raw = texto.trim();
        var negativo = raw.charAt(0) === '-';
        var match = raw.replace('-', '').replace('*', '').trim().match(/^(\d+):(\d+)(?::\d+)?$/);
        if (!match) return '00:00';
        var horas = String(parseInt(match[1], 10)).padStart(2, '0');
        var minutos = String(parseInt(match[2], 10)).padStart(2, '0');
        return (negativo ? '-' : '') + horas + ':' + minutos;
    };
})();
