(function () {
    'use strict';

	var AF = window.AutomacaoFolha;
    AF.fases = AF.fases || {};

    // ── Análise da folha atual ──────────────────────────────────────────
    // Usa o detector único (25-detector.js), somente leitura, no mês alvo.

    AF.fases.analisarFolha = function () {
        if (AF.core.paginaVaziaAgora()) {
            return { irregs: 0, semES: 0, interj: 0, britanica: 0, naoPreenchida: null, dias: null, vazia: true };
        }

        var deteccao = AF.detector.lerFolhaAtual();
        return {
            irregs: deteccao.contagens.semES,
            semES: deteccao.contagens.semES,
            interj: deteccao.contagens.interj,
            britanica: deteccao.contagens.britanica,
            naoPreenchida: deteccao.naoPreenchida,
            dias: deteccao.dias,
            vazia: false
        };
    };

    // ── Estado da folha (antes/depois) para o log ────────────────────────

    function datasUnicasOrdenadas(lista) {
        var vistas = {};
        var out = [];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i] && !vistas[lista[i]]) { vistas[lista[i]] = true; out.push(lista[i]); }
        }
        out.sort(function (a, b) {
            var da = AF.utils.parseDataBR(a), db = AF.utils.parseDataBR(b);
            return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
        });
        return out;
    }

    function datasDosItens(itens) {
        return (itens || []).map(function (x) { return typeof x === 'string' ? x : x && x.dataStr; });
    }

    function datasDaDeteccao(lista) {
        return (lista || []).map(function (x) { return x.data; });
    }

    AF.fases.montarEstadoFolha = function (mapa, deteccao, cod47Dias, folgasAMovimentar) {
        var folgas = [], ausencias = [], feriados = [], folgasOcultas = [], feriadosOcultos = [], domingosOcultos = [];
        var semanas = (mapa && mapa.semanas) || {};
        Object.keys(semanas).forEach(function (chave) {
            var sem = semanas[chave];
            folgas = folgas.concat(datasDosItens(sem.folgas));
            ausencias = ausencias.concat(datasDosItens(sem.ausencias));
            feriados = feriados.concat(datasDosItens(sem.feriados));
            folgasOcultas = folgasOcultas.concat(sem.folgasOcultas || []);
            feriadosOcultos = feriadosOcultos.concat(sem.feriadosOcultos || []);
            domingosOcultos = domingosOcultos.concat(sem.domingosOcultos || []);
        });

        var np = deteccao.naoPreenchida || {};
        return {
            folgasAMovimentar: folgasAMovimentar,
            folgas: datasUnicasOrdenadas(folgas),
            folgasOcultas: datasUnicasOrdenadas(folgasOcultas),
            ausencias: datasUnicasOrdenadas(ausencias),
            feriados: datasUnicasOrdenadas(feriados),
            feriadosOcultos: datasUnicasOrdenadas(feriadosOcultos),
            domingosOcultos: datasUnicasOrdenadas(domingosOcultos),
            cod47: datasUnicasOrdenadas(cod47Dias || []),
            irregularidades: {
                semEntradaSaida: { total: deteccao.contagens.semES, dias: datasDaDeteccao(deteccao.dias.semES) },
                interjornada: { total: deteccao.contagens.interj, dias: datasDaDeteccao(deteccao.dias.interj) },
                marcacaoBritanica: { total: deteccao.contagens.britanica, dias: datasDaDeteccao(deteccao.dias.britanica) },
                folhaNaoPreenchida: np.avaliada
                    ? { sinalizada: np.flag, pctNaoPreenchida: np.pctNaoPreenchida, criterios: np.criterios,
                        diasVisiveis: np.visiveis, diasPreenchidos: np.preenchidos }
                    : { sinalizada: false, avaliada: false }
            },
            contagens: {
                folgas: folgasAMovimentar,
                cod47: (cod47Dias || []).length,
                semES: deteccao.contagens.semES,
                interj: deteccao.contagens.interj,
                britanica: deteccao.contagens.britanica,
                naoPreenchida: np.flag ? 1 : 0
            },
            deteccao: deteccao
        };
    };

    AF.fases.capturarEstadoFolha = function () {
        var deteccao = AF.detector.lerFolhaAtual();
        var mapa = AF.mapa.mapearFolhaAtual();
        var cod47Dias = AF.analisar.coletarDiasCod47();
        return AF.fases.montarEstadoFolha(mapa, deteccao, cod47Dias, AF.analisar.contarFolgas());
    };

    // Compara o estado inicial do Ajuste com a Análise anterior do mesmo funcionário.
    AF.fases.compararComAnalise = function (contagens, anterior) {
        var campos = ['folgas', 'cod47', 'semES', 'interj', 'britanica', 'naoPreenchida'];
        var diffs = [];
        for (var i = 0; i < campos.length; i++) {
            var c = campos[i];
            if (anterior[c] !== undefined && anterior[c] !== contagens[c]) {
                diffs.push({ campo: c, analise: anterior[c], atual: contagens[c] });
            }
        }
        return diffs;
    };

    function logEvento(tipo, dados, msg, cor) {
        if (AF.log && typeof AF.log.evento === 'function') AF.log.evento(tipo, dados, msg, cor);
    }

    function iniciarLogExecucao(tipo) {
        if (AF.log && typeof AF.log.iniciarExecucao === 'function') AF.log.iniciarExecucao(tipo);
    }

    function encerrarLogExecucao(status, detalhe) {
        if (AF.log && typeof AF.log.encerrarExecucao === 'function') AF.log.encerrarExecucao(status, detalhe);
    }

    function logFase(fase) {
        if (AF.log && typeof AF.log.definirFase === 'function') AF.log.definirFase(fase);
    }

    function resumoOutcome(outcome) {
        if (!outcome) return null;
        return { status: outcome.status, stage: outcome.stage, reason: outcome.reason, unconfirmed: !!outcome.unconfirmed };
    }

    AF.fases.estadoParaLog = function (estado) {
        var copia = { coletado: true };
        Object.keys(estado).forEach(function (k) { if (k !== 'deteccao') copia[k] = estado[k]; });
        return copia;
    };

    AF.fases.registrarAcaoFolga = function (fase, acao, r, tipo) {
        var resultado = r.ok ? 'movida' : (r.fatal ? 'falha' : 'sem-alteracao');
        logEvento('acao-folga', {
            fase: fase,
            tipo: tipo || null,
            ausencia: acao.dataAusencia,
            origem: acao.dataOrigem,
            resultado: resultado,
            outcome: resumoOutcome(r.outcome)
        }, 'Fase ' + fase + ': ausencia ' + acao.dataAusencia + ' <- origem ' + acao.dataOrigem + ' => ' + resultado,
            r.ok ? '#a6e3a1' : (r.fatal ? '#f87171' : '#ffb000'));
    };
    // ── Fase 1 ─────────────────────────────────────────────────────────
    // Re-mapeia a folha a cada rodada para refletir mudanças após cada popup.

    AF.fases.processarFase1 = async function (execucao) {
        var movidas = 0;
        var presas = [];
        var datasUsadas = new Set();
        var seguranca = 0;

        while (execucao && execucao.isActive()) {
            seguranca++;
            if (seguranca > 30) { AF.core.log('Fase 1 interrompida por seguranca.', '#f87171'); break; }

            var mapa = AF.mapa.mapearFolhaAtual();
            var rodada = AF.planejamento.planejarFase1Rodada(mapa, datasUsadas);

            if (rodada.acabou) break;

            if (rodada.presa) {
                rodada.presa.motivo = 'sem destino elegivel na semana (planejador)';
                presas.push(rodada.presa);
                datasUsadas.add(rodada.presa.dataFolga);
                continue;
            }

            var acao = rodada.acao;
            datasUsadas.add(acao.dataOrigem);
            datasUsadas.add(acao.dataAusencia);

            AF.core.log('Fase 1: ausencia ' + acao.dataAusencia + ' <- folga ' + acao.dataOrigem, '#0043ff');
            var r = await AF.popup.executarAcaoFolga(acao, execucao);
            AF.fases.registrarAcaoFolga(1, acao, r, 'visivel');
            if (r.ok) {
                movidas++;
            } else if (r.semAlteracao) {
                presas.push({ fase: 1, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup,
                    motivo: 'sem alteracao no popup (destino nao aceito)' });
            }
            if (r.fatal) break;
        }

        return { movidas: movidas, presas: presas };
    };

    // ── Fase 2 ─────────────────────────────────────────────────────────

    AF.fases.processarFase2 = async function (execucao) {
        var movidas = 0;
        var presas = [];
        var historicoTentativas = {};
        var datasUsadasFase2 = new Set();
        var seguranca = 0;

        while (execucao && execucao.isActive()) {
            seguranca++;
            if (seguranca > 20) { AF.core.log('Fase 2 interrompida por seguranca.', '#f87171'); break; }

            var mapa = AF.mapa.mapearFolhaAtual();
            var rodada = AF.planejamento.planejarFase2Rodada(mapa, historicoTentativas, datasUsadasFase2);
            if (rodada.acabou) break;

            var acao = rodada.acao;
            historicoTentativas[acao.dataAusencia + '|' + acao.dataOrigem + '|' + rodada.tipo] = true;
            datasUsadasFase2.add(acao.dataAusencia);
            datasUsadasFase2.add(acao.dataOrigem);

            AF.core.log('Fase 2: ausencia ' + acao.dataAusencia + (rodada.tipo === 'visivel' ? ' <- folga ' : ' <- folga oculta ') + acao.dataOrigem, '#0043ff');

            var r = await AF.popup.executarAcaoFolga(acao, execucao);
            AF.fases.registrarAcaoFolga(2, acao, r, rodada.tipo);
            if (r.ok) { movidas++; continue; }
            if (r.fatal) break;
            if (rodada.tipo === 'oculta') presas.push({ fase: 2, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup,
                motivo: 'sem alteracao no popup (folga oculta)' });
            break;
        }

        return { movidas: movidas, presas: presas };
    };

    // ── Fase 3 ─────────────────────────────────────────────────────────

    // ── Fase 4: Alterar 47 → 48 ────────────────────────────────────────

	AF.fases.processarFase4 = function (execucao) {
		if (AF.core && typeof AF.core.exigirEstrutura === 'function') {
			if (!AF.core.exigirEstrutura('fase 4 - alteracao de campos')) {
				return [];
			}
		}

		var doc1   = AF.core.getDoc1();
		var alvo   = AF.utils.mesAlvoDaTabela();
		var ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0);
		var ultimaSemanaId = AF.utils.semanaIdBR(ultimoDia);

		var nsMarcados = [];
		var campos = Array.from(doc1.querySelectorAll('input[type=text]'));

		for (var i = 0; i < campos.length; i++) {
            if (execucao && !execucao.isActive()) break;
			var inp = campos[i];
			if (!inp.value || inp.value.trim() !== '47') continue;

			var dataStr = AF.mapa.obterDataDoInput(inp);
			var dataObj = AF.utils.parseDataBR(dataStr);
			if (!dataObj) continue;
			var semId = AF.utils.semanaIdBR(dataObj);
			var noEscopo = AF.utils.ehMesAlvo(dataObj, alvo) || semId === ultimaSemanaId;
			if (!noEscopo) continue;

			var num = (inp.name || '').replace(/\D/g, '');
			var tr = inp.closest('tr');
			if (!tr) continue;

			var sel = tr.querySelector('select[name="lstNome' + num + '"]');
			if (!sel) {
				AF.core.log('Fase 4: select nao achado para ' + (dataStr || num), '#ffb000');
				continue;
			}

			var opt48 = Array.from(sel.options).find(function (o) {
				return o.value === '48';
			});
			if (!opt48) {
				AF.core.log('Fase 4: opcao 48 nao existe para ' + (dataStr || num), '#ffb000');
				continue;
			}

			sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			sel.dispatchEvent(new Event('focus', { bubbles: true }));
			sel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			sel.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			sel.value = '48';
			sel.dispatchEvent(new Event('input', { bubbles: true }));
			sel.dispatchEvent(new Event('change', { bubbles: true }));
			sel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
			sel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			sel.dispatchEvent(new Event('blur', { bubbles: true }));

			var rad = doc1.querySelector('[name="radConfirma"]');
			if (rad) {
				rad.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
				rad.dispatchEvent(new Event('focus', { bubbles: true }));
				rad.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
				rad.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				rad.dispatchEvent(new Event('input', { bubbles: true }));
				rad.dispatchEvent(new Event('change', { bubbles: true }));
				rad.dispatchEvent(new Event('blur', { bubbles: true }));
			}

			nsMarcados.push(num);

			var cod = doc1.querySelector('[name="CodJust' + num + '"]');
			AF.core.log('Fase 4: ' + dataStr + ' | 47 → 48 | CodJust: ' + (cod ? cod.value : '-'), '#ffb000');
			logEvento('cod47', { data: dataStr, de: '47', para: '48', codJust: cod ? cod.value : null }, 'Fase 4: ' + dataStr + ' 47 -> 48', '#ffb000');
		}

		return nsMarcados;
	};

    // ── Gravar ─────────────────────────────────────────────────────────

	AF.fases.gravar = async function (nsMarcados, execucao) {
        execucao = execucao || AF.estado.execucaoAjuste;
        if (!execucao || !execucao.isActive()) return { status: 'cancelled', stage: 'footer-save' };

        if (AF.core && typeof AF.core.exigirEstrutura === 'function' &&
            !AF.core.exigirEstrutura('gravacao no rodape')) {
            return { status: 'error', stage: 'footer-save', reason: 'As pre-condicoes estruturais falharam.' };
        }

        var tentativa = { submitted: false, submittedAt: null };
        var observador;
        try {
            var doc2 = window.top.frames[2].document;
            var btn = doc2.getElementById('btnGravar');
            if (!btn) {
                return { status: 'error', stage: 'footer-save', reason: 'btnGravar ausente no rodape.' };
            }

            observador = AF.core.observarTransicaoCorpo(execucao, tentativa);
            observador.marcarEnvio();
            if (!execucao.isActive()) return { status: 'cancelled', stage: 'footer-save' };
            btn.click();

            var outcome = await AF.fases.aguardarGravacao(observador, execucao);
            if (!execucao.isActive()) {
                var cancelamento = {
                    status: 'cancelled',
                    stage: 'footer-save',
                    reason: 'Parada solicitada durante a gravacao no rodape.',
                    unconfirmed: tentativa.submitted
                };
                if (tentativa.submitted) {
                    AF.core.pararExecucaoAjuste(cancelamento, execucao);
                }
                return cancelamento;
            }
            if (outcome.status !== 'ready') {
                outcome.unconfirmed = tentativa.submitted;
                AF.core.pararExecucaoAjuste(outcome, execucao);
                return outcome;
            }

            AF.core.log('Gravacao observada: pagina principal recarregada.', '#a6e3a1');
            return outcome;
        } catch (e) {
            var error = {
                status: 'error',
                stage: 'footer-save',
                reason: e && e.message ? e.message : String(e),
                unconfirmed: tentativa.submitted
            };
            AF.core.pararExecucaoAjuste(error, execucao);
            return error;
        } finally {
            if (observador) observador.dispose();
        }
    };

    AF.fases.aguardarGravacao = async function (observador, execucao) {
        var recarga = await AF.core.aguardarTransicaoCorpo(
            execucao,
            observador,
            'footer-save-reload'
        );
        if (recarga.status !== 'ready') return recarga;

        var estabilizacao = await AF.core.esperarDelayAjuste(
            execucao,
            'footer-save-stabilization',
            5000
        );
        if (estabilizacao.status !== 'ready') return estabilizacao;
        return { status: 'ready', stage: 'footer-save-reload', value: recarga.value };
    };

    // ── Processar folha atual ──────────────────────────────────────────
    // relLista é um mapa { nome → objeto } pré-populado com todos os nomes.
    // Aqui atualizamos o registro existente em vez de fazer push.

    AF.fases.processarFolhaAtual = async function (relStats, relLista, relListaMap, execucao) {
        if (!execucao || !execucao.isActive()) return;
        var nome = AF.core.nomeAtual();
        if (AF.log && typeof AF.log.definirFuncionario === 'function') AF.log.definirFuncionario(nome);
        if (AF.modelo && typeof AF.modelo.definirAtual === 'function') AF.modelo.definirAtual(nome);
        AF.core.log('\u2500\u2500 ' + nome + ' \u2500\u2500', '#c084fc');

        var entry = relListaMap ? (relListaMap[nome] || relListaMap[nome.trim()]) : null;
        var totalMovidas = 0;
        var presasFinais = [];

        function salvarProgressoParcial() {
            logEvento('estado-depois', { coletado: false, motivo: 'folha interrompida antes de concluir' },
                'Estado depois: nao coletado (folha interrompida).', '#f97316');
            if (AF.modelo && typeof AF.modelo.registrarAjusteParcial === 'function') {
                AF.modelo.registrarAjusteParcial(nome, {
                    movidas: totalMovidas,
                    presas: presasFinais
                });
            }
            if (!entry) return;
            entry.parcial = true;
            entry.folgasAlteradas = totalMovidas;
            entry.folgasSemAlteracao = presasFinais.length;
            if (relStats) {
                relStats.folgasAlteradas += totalMovidas;
                relStats.folgasNaoAlteradas += presasFinais.length;
            }
        }

        if (AF.core.paginaVaziaAgora()) {
            AF.core.log('Sem marcacoes, pulando.', '#000000');
            if (relStats) relStats.semMarcacoes++;
            if (AF.modelo && typeof AF.modelo.registrarSemMarcacoes === 'function') {
                AF.modelo.registrarSemMarcacoes(nome, 'ajuste');
            }
            if (entry) {
                entry.lido = true;
                entry.pulada = true;
                entry.folgasAlteradas = 0; entry.folgasSemAlteracao = 0;
                entry.linhas47 = 0; entry.irregs = 0; entry.interj = 0;
                entry.HE = '00:00'; entry.HEF = '00:00'; entry.HEC = '00:00';
            }
            return;
        }

        try {
            var estadoAntes = AF.fases.capturarEstadoFolha();
            AF.estado.preAnalise = AF.estado.preAnalise || {};
            AF.estado.preAnalise[nome] = estadoAntes.contagens;
            logEvento('estado-antes', AF.fases.estadoParaLog(estadoAntes), 'Estado antes do ajuste.', '#6b7280');
            var anterior = (AF.estado.ultimaAnalise && AF.estado.ultimaAnalise[nome]) ||
                ((AF.modelo && typeof AF.modelo.contagensDaAnalise === 'function')
                    ? AF.modelo.contagensDaAnalise(nome)
                    : null);
            if (!anterior) {
                logEvento('pre-analise', { analiseAnterior: false }, 'Sem analise anterior para este funcionario; estado inicial registrado.', '#6b7280');
            } else {
                var diferencas = AF.fases.compararComAnalise(estadoAntes.contagens, anterior);
                if (diferencas.length) {
                    logEvento('divergencia-analise', { diferencas: diferencas },
                        'Estado inicial diverge da analise anterior; usando o estado atual.', '#ffb000');
                } else {
                    logEvento('pre-analise', { analiseAnterior: true, divergencia: false }, 'Estado inicial igual ao da analise anterior.', '#6b7280');
                }
            }
        } catch (erroAntes) {
            AF.core.log('Falha ao registrar o estado inicial: ' + (erroAntes && erroAntes.message ? erroAntes.message : erroAntes), '#ffb000');
        }

        logFase('fase 1');
        AF.core.log('Processando folgas...', '#0043ff');
        var r1 = await AF.fases.processarFase1(execucao);
        totalMovidas += r1.movidas;
        presasFinais = presasFinais.concat(r1.presas);
        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

        logFase('fase 2');
        var r2 = await AF.fases.processarFase2(execucao);
        totalMovidas += r2.movidas;
        presasFinais = presasFinais.concat(r2.presas);
        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

        logFase('fase 3');
        var mapaFinal = AF.mapa.mapearFolhaAtual();
        var presasBase = presasFinais.slice();
        var plano3 = AF.planejamento.planejarFase3(mapaFinal, presasBase);
        presasFinais = plano3.presasFinais.slice();

        for (var i = 0; i < plano3.acoes.length; i++) {
            if (!execucao.isActive()) break;
            var acao = plano3.acoes[i];
            var destino = acao.tipo === 'domingo_oculto' ? 'domingo oculto' : 'feriado';
            AF.core.log('Fase 3 [' + acao.tipo + ']: ausencia ' + acao.dataAusencia + ' <- ' + destino + ' ' + acao.dataOrigem, '#0043ff');
            var r3 = await AF.popup.executarAcaoFolga(acao, execucao);
            AF.fases.registrarAcaoFolga(3, acao, r3, acao.tipo);
            if (r3.ok) totalMovidas++;
            else if (!r3.fatal) {
                presasFinais.push({
                    fase: 3,
                    semanaId: acao.semanaId,
                    dataFolga: acao.dataFolgaOriginal || acao.dataOrigem,
                    motivo: 'sem alteracao no popup (fase 3)'
                });
            }
            if (r3.fatal) break;
        }

        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

        logFase('fase 4');
        var nsMarcados = AF.fases.processarFase4(execucao);
        var linhas47 = nsMarcados.length;

		if (linhas47 > 0) {
		    AF.core.log('Gravando Fase 4...', '#0043ff');
		    var resultadoGravacao = await AF.fases.gravar(nsMarcados, execucao);
            if (resultadoGravacao.status !== 'ready') {
		        if (resultadoGravacao.status !== 'cancelled') {
		            AF.core.pararExecucaoAjuste(resultadoGravacao, execucao);
		        }
		        salvarProgressoParcial();
		        return;
		    }
		} else {
		    AF.core.log('Fase 4: nada a alterar.', '#000000');
		}
		
		if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

        logFase('final');
        var estadoDepois = null;
        var contagensDepois;
        try {
            estadoDepois = AF.fases.capturarEstadoFolha();
            contagensDepois = estadoDepois.contagens;
        } catch (erroDepois) {
            AF.core.log('Falha ao registrar o estado final: ' + (erroDepois && erroDepois.message ? erroDepois.message : erroDepois), '#ffb000');
            var analise = AF.fases.analisarFolha();
            contagensDepois = {
                semES: analise.irregs, interj: analise.interj, britanica: analise.britanica,
                naoPreenchida: analise.naoPreenchida && analise.naoPreenchida.flag ? 1 : 0
            };
        }
        var extras   = (AF.analisar && AF.analisar.somarHorasExtras) ? AF.analisar.somarHorasExtras() : { HE: '00:00', HEF: '00:00' };
        var saldoHEC = (AF.analisar && AF.analisar.lerSaldoHEC)      ? AF.analisar.lerSaldoHEC()      : '00:00';

        if (relStats) {
            relStats.totalFolhas++;
            relStats.folgasAlteradas    += totalMovidas;
            relStats.folgasNaoAlteradas += presasFinais.length;
            relStats.irregsRestantes    += contagensDepois.semES;
            relStats.interjRestantes    += contagensDepois.interj;
            relStats.linhas47           += linhas47;
        }

        if (AF.modelo && typeof AF.modelo.registrarAjuste === 'function') {
            var det = estadoDepois ? estadoDepois.deteccao : null;
            AF.modelo.registrarAjuste(nome, {
                movidas: totalMovidas,
                presas: presasFinais,
                cod47Conv: linhas47,
                cod47Rest: contagensDepois.cod47 || 0,
                leitura: {
                    semES: det ? det.dias.semES : { total: contagensDepois.semES, dias: [] },
                    interj: det ? det.dias.interj : { total: contagensDepois.interj, dias: [] },
                    britanica: det ? det.dias.britanica : { total: contagensDepois.britanica, dias: [] },
                    naoPreenchida: det ? det.naoPreenchida : null,
                    HE: extras.HE,
                    HEF: extras.HEF,
                    HEC: saldoHEC
                }
            });
        }

        if (entry) {
            entry.lido               = true;
            entry.pulada             = false;
            entry.folgasAlteradas    = totalMovidas;
            entry.folgasSemAlteracao = presasFinais.length;
            entry.linhas47           = linhas47;
            entry.irregs             = contagensDepois.semES;
            entry.interj             = contagensDepois.interj;
            entry.britanica          = contagensDepois.britanica;
            entry.naoPreenchida      = estadoDepois ? estadoDepois.deteccao.naoPreenchida : null;
            entry.dias               = estadoDepois ? estadoDepois.deteccao.dias : null;
            entry.HE                 = extras.HE;
            entry.HEF                = extras.HEF;
            entry.HEC                = saldoHEC;
        }

        if (estadoDepois) {
            logEvento('estado-depois', AF.fases.estadoParaLog(estadoDepois), 'Estado depois do ajuste.', '#6b7280');
        }
        presasFinais.forEach(function (presa) {
            logEvento('folga-presa', {
                fase: presa.fase,
                data: presa.dataFolga,
                semana: presa.semanaId,
                motivo: presa.motivo || 'sem destino elegivel apos as fases 1 a 3'
            }, 'Folga presa: ' + presa.dataFolga + ' (fase ' + presa.fase + ')', '#ffb000');
        });

        AF.core.log('Folha concluida | Folgas: ' + totalMovidas + ' | Presas: ' + presasFinais.length + ' | 47>48: ' + linhas47 + ' | HE100%: ' + extras.HE + ' | HEF100%: ' + extras.HEF + ' | HEC70%: ' + saldoHEC, '#a6e3a1');
    };

    // ── processarTodas — loop principal ───────────────────────────────

    AF.fases.processarTodas = async function () {
        AF.estado.cancelado = false;
        var execucao = AF.core.iniciarExecucaoAjuste();
        iniciarLogExecucao('ajuste');
        AF.estado.falhaPrecondicao = false;
        AF.estado.falhaAjuste = null;
        AF.estado.motivoParadaAjuste = null;
        AF.estado.rodando = true;
        AF.core.setBotoes(true);
        var relStats = {
            totalFolhas: 0, semMarcacoes: 0,
            folgasAlteradas: 0, folgasNaoAlteradas: 0,
            irregsRestantes: 0, interjRestantes: 0, linhas47: 0
        };
        var relLista = null;
        var relListaMap = null;
        var inicioExec = Date.now();

        execucao.addCleanup(function () {
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            sessionStorage.removeItem('autopopupSemSucesso');
        });

        try {
            AF.core.getDocC().getElementById('log-box').innerHTML = '';
            AF.sons.tocar('inicio');
            if (!AF.core.exigirEstrutura('inicio do ajuste', null, true)) return;

            AF.core.instalarInterceptorPopup(execucao);
            var sel = AF.core.getSelNome();
            if (!sel) {
                AF.core.pararExecucaoAjuste({
                    status: 'error',
                    stage: 'employee-list',
                    reason: 'Lista de funcionarios nao encontrada.'
                }, execucao);
                return;
            }

            relLista = [];
            relListaMap = {};
            var todosNomesAjuste = [];
            for (var pi = 0; pi < sel.options.length; pi++) {
                var nomeTxt = (sel.options[pi].text || '').trim();
                if (!nomeTxt) continue;
                todosNomesAjuste.push(nomeTxt);
                var obj = {
                    nome: nomeTxt,
                    lido: false, pulada: false,
                    folgasAlteradas: null, folgasSemAlteracao: null,
                    linhas47: null, irregs: null, interj: null,
                    HE: null, HEF: null, HEC: null
                };
                relLista.push(obj);
                relListaMap[nomeTxt] = obj;
            }
            if (AF.modelo && typeof AF.modelo.iniciarExecucao === 'function') {
                AF.modelo.iniciarExecucao('ajuste', todosNomesAjuste);
            }
            var normSort = function (s) {
                return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            };
            relLista.sort(function (a, b) {
                return normSort(a.nome) < normSort(b.nome) ? -1 :
                    normSort(a.nome) > normSort(b.nome) ? 1 : 0;
            });

            var cabec = AF.core.getCabec();
            var docC = AF.core.getDocC();
            var nomeSelecionado = (sel.options[sel.selectedIndex] &&
                (sel.options[sel.selectedIndex].text || '').trim());

            if (!nomeSelecionado) {
                var primeiroValido = -1;
                for (var pi2 = 0; pi2 < sel.options.length; pi2++) {
                    if ((sel.options[pi2].text || '').trim()) { primeiroValido = pi2; break; }
                }
                if (primeiroValido < 0) {
                    AF.core.pararExecucaoAjuste({
                        status: 'error',
                        stage: 'employee-list',
                        reason: 'Nenhum funcionario encontrado.'
                    }, execucao);
                    return;
                }

                var prontidaoInicial;
                var observadorInicial;
                try {
                    observadorInicial = AF.core.observarTransicaoCorpo(execucao, {});
                    observadorInicial.armarTransicao();
                    sel.selectedIndex = primeiroValido;
                    try {
                        cabec.AjustaCodEmpresaEmpregado(docC.yourform.lstNome, docC.yourform.CodEmpresaEmpregado);
                    } catch (e) {}
                    try {
                        cabec.AtualizaFuncionario();
                    } catch (e) {
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    AF.core.log('Iniciando pelo primeiro: ' + AF.core.nomeAtual(), '#0043ff');
                    prontidaoInicial = await AF.core.aguardarTransicaoCorpo(
                        execucao,
                        observadorInicial,
                        'employee-readiness',
                        6000
                    );
                } catch (erroProntidaoInicial) {
                    prontidaoInicial = {
                        status: 'error',
                        stage: 'employee-readiness',
                        reason: erroProntidaoInicial && erroProntidaoInicial.message ?
                            erroProntidaoInicial.message : String(erroProntidaoInicial)
                    };
                } finally {
                    if (observadorInicial) observadorInicial.dispose();
                }

                if (!execucao.isActive()) return;
                if (prontidaoInicial.status !== 'ready') {
                    if (prontidaoInicial.status !== 'cancelled') {
                        AF.core.pararExecucaoAjuste(prontidaoInicial, execucao);
                    }
                    return;
                }
            } else {
                AF.core.log('Continuando de: ' + AF.core.nomeAtual(), '#0043ff');
            }

            var nomeInicial = AF.core.nomeAtual();
            while (execucao.isActive()) {
                if (!AF.core.exigirEstrutura('processamento da folha')) break;

                await AF.fases.processarFolhaAtual(relStats, relLista, relListaMap, execucao);
                if (!execucao.isActive()) break;

                var res = await AF.core.avancarFuncionario(execucao);
                if (!execucao.isActive()) break;

                if (res.status !== 'ready') {
                    if (res.status !== 'cancelled') {
                        AF.core.pararExecucaoAjuste(res, execucao);
                    }
                    break;
                }

                if (res.value === 'fim') {
                    AF.core.log('Fim da lista.', '#02ab19');
                    break;
                }
                if (AF.core.nomeAtual() === nomeInicial) {
                    AF.core.log('Concluido.', '#02ab19');
                    break;
                }
            }
        } catch (erroAjuste) {
            AF.core.pararExecucaoAjuste({
                status: 'error',
                stage: 'adjustment-orchestration',
                reason: erroAjuste && erroAjuste.message ? erroAjuste.message : String(erroAjuste)
            }, execucao);
        } finally {
            if (AF.estado.execucaoAjuste === execucao) {
                if (relLista !== null) {
                    try {
                        AF.relatorios.gerarFolgas(
                            relStats,
                            relLista,
                            Date.now() - inicioExec,
                            AF.estado.cancelado,
                            AF.estado.falhaAjuste || AF.estado.motivoParadaAjuste
                        );
                    } catch (erroRelatorio) {
                        AF.core.pararExecucaoAjuste({
                            status: 'error',
                            stage: 'partial-report',
                            reason: erroRelatorio && erroRelatorio.message ?
                                erroRelatorio.message : String(erroRelatorio)
                        }, execucao);
                        console.error('[FPW] Falha ao gerar relatorio parcial:', erroRelatorio);
                    }
                }

                var falhaFinal = AF.estado.falhaAjuste;
                var paradaFinal = AF.estado.motivoParadaAjuste;
                encerrarLogExecucao(
                    !AF.estado.cancelado ? 'concluida' : (falhaFinal ? 'interrompida' : 'cancelada'),
                    falhaFinal ? falhaFinal.stage + ': ' + falhaFinal.reason : (paradaFinal ? paradaFinal.reason : '')
                );
                if (AF.modelo && typeof AF.modelo.encerrarExecucao === 'function') {
                    AF.modelo.encerrarExecucao('ajuste', !AF.estado.cancelado ? 'concluida' : (falhaFinal ? 'interrompida' : 'cancelada'));
                }

                if (!AF.estado.cancelado) AF.sons.tocar('fim');
                if (execucao.ativa) {
                    execucao.cancel(AF.estado.cancelado ? 'Ajuste cancelado.' : 'Ajuste concluido.');
                }
                AF.core.setBotoes(false);
                AF.estado.rodando = false;
            }
        }
    };
	console.log('[FPW] 40-fases carregado. versão 1.5 - estado antes/depois, pre-analise e eventos estruturados');
})();
