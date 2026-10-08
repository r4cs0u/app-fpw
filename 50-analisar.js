(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.analisar = AF.analisar || {};

    // ── Conta folgas a movimentar ──────────────────────────────────────────

    AF.analisar.contarFolgas = function () {
        var mapa = AF.mapa.mapearFolhaAtual();
        var alvo = AF.utils.mesAlvoDaTabela();
        return AF.regras.contarFolgasAMovimentar(mapa, alvo);
    };

    // ── Dias com código 47 ───────────────────────────────────────────────
    // Por padrão inclui o mês alvo e a semana de transição (mesmo escopo da Fase 4 do Ajuste).
    // Opção somenteMesAlvo: true restringe estritamente ao mês alvo.

    AF.analisar.coletarDiasCod47 = function (opcoes) {
        opcoes = opcoes || {};
        var alvo = AF.utils.mesAlvoDaTabela();
        var campos = Array.from(AF.core.getDoc1().querySelectorAll('input[type=text]'));
        var entradas = campos.map(function (inp) {
            return {
                name: inp.name,
                value: inp.value,
                dataStr: inp.value && inp.value.trim() === '47'
                    ? AF.mapa.obterDataDoInput(inp)
                    : null
            };
        });
        return AF.regras.selecionarDiasCod47(entradas, alvo, opcoes);
    };

    // ── Conta códigos 47 ─────────────────────────────────────────────────────────

    AF.analisar.contarCod47 = function () {
        return AF.analisar.coletarDiasCod47().length;
    };
    // ── Soma HE (cod 2) e HEF (cod 27) ─────────────────────────────────────

    AF.analisar.somarHorasExtras = function () {
        try {
            var doc1 = AF.core.getDoc1();
            var alvo = AF.utils.mesAlvoDaTabela();
            var lancamentos = [];
            Array.from(doc1.querySelectorAll('select[id^="lstNome"]')).forEach(function (sel) {
                var opt = sel.options[sel.selectedIndex];
                if (!opt) return;
                var cod = opt.value;
                var isHEP = cod === '2';
                var isHEF = cod === '27';
                if (!isHEP && !isHEF) return;

                var n = sel.id.replace('lstNome', '');

                var inpData = doc1.querySelector('input[name="Data' + n + '"]') ||
                              doc1.querySelector('input[id="Data' + n + '"]');
                if (inpData) {
                    var dataStr = inpData.value || AF.mapa.obterDataDoInput(inpData);
                } else {
                    dataStr = null;
                }

                var inp = doc1.querySelector('input[name="HorasInf' + n + '"]');
                lancamentos.push({
                    codigo: cod,
                    temData: !!inpData,
                    dataStr: dataStr,
                    horasTexto: inp ? inp.value : ''
                });
            });

            return AF.regras.somarHorasExtras(lancamentos, alvo);
        } catch (e) {
            return { HE: '00:00', HEF: '00:00', HEmin: 0, HEFmin: 0 };
        }
    };

    // ── Lê saldo de compensação ───────────────────────────────────────────────

    AF.analisar.lerSaldoHEC = function () {
        try {
            var doc2 = window.top.frames[2].document;
            var inp = doc2.getElementById('txtSaldo');
            if (!inp) return '00:00';
            return AF.regras.interpretarSaldoHEC(inp.value);
        } catch (e) {
            return '00:00';
        }
    };

    // ── Análise completa de uma folha ───────────────────────────────────────

    AF.analisar.analisarFolhaAtual = function () {
        if (AF.core.paginaVaziaAgora()) {
            return {
                vazia: true, folgas: 0, irregs: 0, interj: 0, cod47: 0, cod47Dias: [],
                britanica: 0, naoPreenchida: null, dias: null,
                HE: '00:00', HEF: '00:00', HEC: '00:00', HEmin: 0, HEFmin: 0
            };
        }

        var deteccao = AF.detector.lerFolhaAtual();
        var cod47Dias = AF.analisar.coletarDiasCod47();
        var extras    = AF.analisar.somarHorasExtras();
        var saldoHEC  = AF.analisar.lerSaldoHEC();

        return {
            vazia:  false,
            folgas: AF.analisar.contarFolgas(),
            irregs: deteccao.contagens.semES,
            interj: deteccao.contagens.interj,
            cod47:  cod47Dias.length,
            cod47Dias: cod47Dias,
            britanica: deteccao.contagens.britanica,
            naoPreenchida: deteccao.naoPreenchida,
            dias: deteccao.dias,
            HE:     extras.HE,
            HEF:    extras.HEF,
            HEC:    saldoHEC,
            HEmin:  extras.HEmin,
            HEFmin: extras.HEFmin
        };
    };

    function logExecucao(acao, a, b) {
        if (AF.log && typeof AF.log[acao] === 'function') AF.log[acao](a, b);
    }

    AF.analisar.registrarEventoAnalise = registrarEventoAnalise;

    function datasDe(lista) {
        return (lista || []).map(function (x) { return x.data; });
    }

    function registrarEventoAnalise(nome, r) {
        if (!AF.log || typeof AF.log.evento !== 'function') return;
        if (r.vazia) {
            AF.log.evento('analise-folha', { vazia: true }, 'Sem marcacoes.', '#000000');
            return;
        }
        var np = r.naoPreenchida || {};
        AF.log.evento('analise-folha', {
            folgasAMovimentar: r.folgas,
            cod47: { total: r.cod47, dias: r.cod47Dias },
            semEntradaSaida: { total: r.irregs, dias: datasDe(r.dias && r.dias.semES) },
            interjornada: { total: r.interj, dias: datasDe(r.dias && r.dias.interj) },
            marcacaoBritanica: { total: r.britanica, dias: datasDe(r.dias && r.dias.britanica) },
            folhaNaoPreenchida: np.avaliada
                ? { sinalizada: np.flag, pctNaoPreenchida: np.pctNaoPreenchida, criterios: np.criterios,
                    diasVisiveis: np.visiveis, diasPreenchidos: np.preenchidos }
                : { sinalizada: false, avaliada: false },
            horasExtras: { HE100: r.HE, HEF100: r.HEF, saldoHEC70: r.HEC }
        }, 'Analise da folha.', '#6b7280');
    }
    // ── Loop principal de análise ───────────────────────────────────────────

    AF.analisar.analisarTodas = async function () {
        AF.estado.cancelado = false;
        AF.estado.falhaAjuste = null;
        AF.estado.falhaPrecondicao = false;
        AF.estado.motivoParadaAjuste = null;
        AF.estado.rodando = true;
        AF.core.setBotoes(true);
        AF.core.getDocC().getElementById('log-box').innerHTML = '';

        var alvo = AF.utils.mesAlvoDaTabela
            ? (function () {
                try { return AF.utils.mesAlvoDaTabela(); } catch (e) { return new Date(); }
            })()
            : new Date();

        var nomeMesStr = AF.utils.nomeMes[alvo.getMonth()] + ' ' + alvo.getFullYear();
        logExecucao('iniciarExecucao', 'analise');
        if (AF.modelo && typeof AF.modelo.iniciarExecucao === 'function') {
            AF.modelo.iniciarExecucao('analise', todosNomes, nomeMesStr);
        }
        AF.estado.ultimaAnalise = AF.estado.ultimaAnalise || {};
        AF.core.log('Analisando ' + nomeMesStr + '...', '#0043ff');

        var stats = {
            totalFolhas: 0,
            vazias: 0,
            folgasMoviveis: 0,
            irregs: 0,
            interj: 0,
            britanica: 0,
            naoPreenchidas: 0,
            cod47: 0,
            HEmin: 0,
            HEFmin: 0
        };
        var lista = [];

        var sel = AF.core.getSelNome();
        if (!sel) {
            AF.core.log('ERRO: Lista de funcionarios nao encontrada.', '#f87171');
            logExecucao('encerrarExecucao', 'interrompida', 'lista de funcionarios nao encontrada');
            AF.sons.tocar('falha');
            AF.estado.rodando = false;
            AF.core.setBotoes(false);
            return;
        }
        AF.sons.tocar('inicio');

        // ── Snapshot de TODOS os nomes antes de iniciar o loop ──
        var todosNomes = [];
        for (var ti = 0; ti < sel.options.length; ti++) {
            var optTxt = (sel.options[ti].text || '').trim();
            if (optTxt) todosNomes.push(optTxt);
        }

        var nomeInicial = AF.core.nomeAtual();
        var inicioExec  = Date.now();
        var total       = 0;

        while (true) {
            if (AF.estado.cancelado) break;

            var nome = AF.core.nomeAtual();
            logExecucao('definirFuncionario', nome);
            if (AF.modelo && typeof AF.modelo.definirAtual === 'function') {
                AF.modelo.definirAtual(nome);
            }
            var r    = AF.analisar.analisarFolhaAtual();
            total++;
            registrarEventoAnalise(nome, r);

            if (r.vazia) {
                stats.vazias++;
                if (AF.modelo && typeof AF.modelo.registrarSemMarcacoes === 'function') {
                    AF.modelo.registrarSemMarcacoes(nome, 'analise');
                }
                AF.core.log('- ' + nome, '#000000');
            } else {
                stats.totalFolhas++;
                if (AF.modelo && typeof AF.modelo.registrarAnalise === 'function') {
                    AF.modelo.registrarAnalise(nome, r);
                }
                stats.folgasMoviveis += r.folgas;
                stats.irregs         += r.irregs;
                stats.interj         += r.interj;
                stats.cod47          += r.cod47;
                stats.britanica      += r.britanica;
                if (r.naoPreenchida && r.naoPreenchida.flag) stats.naoPreenchidas++;
                stats.HEmin          += r.HEmin;
                stats.HEFmin         += r.HEFmin;

                var naoPreench = !!(r.naoPreenchida && r.naoPreenchida.flag);
                var temAlgo = r.folgas || r.irregs || r.interj || r.cod47 || r.britanica || naoPreench ||
                              r.HE !== '00:00' || r.HEF !== '00:00';
                if (temAlgo) {
                    var partes = [];
                    if (r.folgas)            partes.push('Folgas:' + r.folgas);
                    partes.push('Irreg:'  + r.irregs);
                    partes.push('Interj:' + r.interj);
                    if (r.britanica)         partes.push('Brit:'    + r.britanica);
                    if (naoPreench)          partes.push('NaoPreench:' + r.naoPreenchida.pctNaoPreenchida + '%');
                    if (r.cod47)             partes.push('Cod47:'   + r.cod47);
                    if (r.HE  !== '00:00')   partes.push('HE100%:'  + r.HE);
                    if (r.HEF !== '00:00')   partes.push('HEF100%:' + r.HEF);
                    if (r.HEC !== '00:00')   partes.push('HEC70%:'  + r.HEC);
                    AF.core.log('! ' + nome + ' | ' + partes.join(' | '), '#facc15');
                } else {
                    AF.core.log('OK ' + nome, '#6b7280');
                }

                lista.push({
                    nome:   nome,
                    lido:   true,
                    folgas: r.folgas,
                    irregs: r.irregs,
                    interj: r.interj,
                    cod47:  r.cod47,
                    HE:     r.HE,
                    HEF:    r.HEF,
                    HEC:    r.HEC,
                    britanica:     r.britanica,
                    naoPreenchida: r.naoPreenchida,
                    dias:          r.dias
                });

                AF.estado.ultimaAnalise[nome] = {
                    folgas: r.folgas,
                    cod47:  r.cod47,
                    semES:  r.irregs,
                    interj: r.interj,
                    britanica: r.britanica,
                    naoPreenchida: naoPreench ? 1 : 0
                };
            }

            if (AF.estado.cancelado) break;

            var res = await AF.core.avancarFuncionario();
            if (AF.estado.cancelado) break;
            if (res === 'fim') { AF.core.log('Fim da lista.', '#02ab19'); break; }
            if (AF.core.nomeAtual() === nomeInicial) { AF.core.log('Concluido.', '#02ab19'); break; }
        }

        // ── Completar lista com nomes não visitados ──
        var nomesLidos = {};
        for (var ni = 0; ni < lista.length; ni++) {
            nomesLidos[lista[ni].nome] = true;
        }
        for (var tn = 0; tn < todosNomes.length; tn++) {
            if (!nomesLidos[todosNomes[tn]]) {
                lista.push({
                    nome:   todosNomes[tn],
                    lido:   false,
                    folgas: null,
                    irregs: null,
                    interj: null,
                    cod47:  null,
                    HE:     null,
                    HEF:    null,
                    HEC:    null
                });
            }
        }

        var tempoMs = Date.now() - inicioExec;
        AF.relatorios.gerarAnalise(stats, lista, nomeMesStr, tempoMs, AF.estado.cancelado);
        logExecucao('encerrarExecucao', AF.estado.cancelado ? 'cancelada' : 'concluida');
        if (AF.modelo && typeof AF.modelo.encerrarExecucao === 'function') {
            AF.modelo.encerrarExecucao('analise', AF.estado.cancelado ? 'cancelada' : 'concluida');
        }

        if (!AF.estado.cancelado) AF.sons.tocar('fim');

        // O painel deriva o bloqueio dos botões de AF.estado.rodando; limpá-lo antes de liberar.
        AF.estado.rodando = false;
        AF.core.setBotoes(false);
        if (AF.relatorios && typeof AF.relatorios.habilitarCopiar === 'function') {
            AF.relatorios.habilitarCopiar('Relat\u00F3rio de An\u00E1lise');
        }
    };
    console.log('[FPW] 50-analisar carregado. versão 1.4 - detector unificado e log estruturado');
})();
