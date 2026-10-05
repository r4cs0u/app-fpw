(function () {
    'use strict';

	var AF = window.AutomacaoFolha;
    AF.fases = AF.fases || {};

    // ── Análise da folha atual ──────────────────────────────────────────
    // Filtra por mes alvo + semana de transição do ultimo mes

    AF.fases.analisarFolha = function () {
        if (AF.core.paginaVaziaAgora()) {
            return { marc: 0, he: 0, smES: 0, interj: 0, vazia: true };
        }

        var alvo = AF.utils.mesAlvoDaTabela();
        var inputs = Array.from(AF.core.getDoc1().querySelectorAll('input[name^="Irre"]'));
        var marc = 0, he = 0, smES = 0;

        for (var i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var dataStr = AF.mapa.obterDataDoInput(inp);
            var dataObj = AF.utils.parseDataBR(dataStr);
            if (!dataObj || !AF.utils.ehMesAlvo(dataObj, alvo)) continue;
            var v = AF.core.norm(inp.value);
            if (v.includes('marcacao irregular')) marc++;
            if (v.includes('hora extra irregular')) he++;
            if (v.includes('s/marc de entrada/saida')) smES++;
        }

        var interj = 0;
        var linhas = Array.from(AF.core.getDoc1().querySelectorAll('tr'));
        for (var j = 0; j < linhas.length; j++) {
            var txt = (linhas[j].innerText || linhas[j].textContent || '');
            var mData = txt.match(/\d{2}\/\d{2}\/\d{4}/);
            if (!mData) continue;
            var dObj = AF.utils.parseDataBR(mData[0]);
            if (!dObj || !AF.utils.ehMesAlvo(dObj, alvo)) continue;
            if (txt.includes('[Interjornada]')) interj++;
        }

        return { marc: marc, he: he, smES: smES, interj: interj, vazia: false };
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
                presas.push(rodada.presa);
                datasUsadas.add(rodada.presa.dataFolga);
                continue;
            }

            var acao = rodada.acao;
            datasUsadas.add(acao.dataOrigem);
            datasUsadas.add(acao.dataAusencia);

            AF.core.log('Fase 1: ausencia ' + acao.dataAusencia + ' <- folga ' + acao.dataOrigem, '#0043ff');
            var r = await AF.popup.executarAcaoFolga(acao, execucao);
            if (r.ok) {
                movidas++;
            } else if (r.semAlteracao) {
                presas.push({ fase: 1, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup });
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
            if (r.ok) { movidas++; continue; }
            if (r.fatal) break;
            if (rodada.tipo === 'oculta') presas.push({ fase: 2, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup });
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
        AF.core.log('\u2500\u2500 ' + nome + ' \u2500\u2500', '#c084fc');

        var entry = relListaMap[nome] || relListaMap[nome.trim()];
        var totalMovidas = 0;
        var presasFinais = [];

        function salvarProgressoParcial() {
            if (!entry) return;
            entry.parcial = true;
            entry.folgasAlteradas = totalMovidas;
            entry.folgasSemAlteracao = presasFinais.length;
            relStats.folgasAlteradas += totalMovidas;
            relStats.folgasNaoAlteradas += presasFinais.length;
        }

        if (AF.core.paginaVaziaAgora()) {
            AF.core.log('Sem marcacoes, pulando.', '#000000');
            relStats.semMarcacoes++;
            if (entry) {
                entry.lido = true;
                entry.pulada = true;
                entry.folgasAlteradas = 0; entry.folgasSemAlteracao = 0;
                entry.linhas47 = 0; entry.irregs = 0; entry.interj = 0;
                entry.HE = '00:00'; entry.HEF = '00:00'; entry.HEC = '00:00';
            }
            return;
        }

        AF.core.log('Processando folgas...', '#0043ff');
        var r1 = await AF.fases.processarFase1(execucao);
        totalMovidas += r1.movidas;
        presasFinais = presasFinais.concat(r1.presas);
        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

        var r2 = await AF.fases.processarFase2(execucao);
        totalMovidas += r2.movidas;
        presasFinais = presasFinais.concat(r2.presas);
        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

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
            if (r3.ok) totalMovidas++;
            else if (!r3.fatal) {
                presasFinais.push({
                    fase: 3,
                    semanaId: acao.semanaId,
                    dataFolga: acao.dataFolgaOriginal || acao.dataOrigem
                });
            }
            if (r3.fatal) break;
        }

        if (!execucao.isActive()) {
            salvarProgressoParcial();
            return;
        }

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

        var analise  = AF.fases.analisarFolha();
        var extras   = (AF.analisar && AF.analisar.somarHorasExtras) ? AF.analisar.somarHorasExtras() : { HE: '00:00', HEF: '00:00' };
        var saldoHEC = (AF.analisar && AF.analisar.lerSaldoHEC)      ? AF.analisar.lerSaldoHEC()      : '00:00';

        relStats.totalFolhas++;
        relStats.folgasAlteradas    += totalMovidas;
        relStats.folgasNaoAlteradas += presasFinais.length;
        relStats.irregsRestantes    += (analise.marc + analise.he + analise.smES);
        relStats.interjRestantes    += analise.interj;
        relStats.linhas47           += linhas47;

        if (entry) {
            entry.lido               = true;
            entry.pulada             = false;
            entry.folgasAlteradas    = totalMovidas;
            entry.folgasSemAlteracao = presasFinais.length;
            entry.linhas47           = linhas47;
            entry.irregs             = analise.marc + analise.he + analise.smES;
            entry.interj             = analise.interj;
            entry.HE                 = extras.HE;
            entry.HEF                = extras.HEF;
            entry.HEC                = saldoHEC;
        }

        AF.core.log('Folha concluida | Folgas: ' + totalMovidas + ' | Presas: ' + presasFinais.length + ' | 47>48: ' + linhas47 + ' | HE100%: ' + extras.HE + ' | HEF100%: ' + extras.HEF + ' | HEC70%: ' + saldoHEC, '#a6e3a1');
    };

    // ── processarTodas — loop principal ───────────────────────────────

    AF.fases.processarTodas = async function () {
        AF.estado.cancelado = false;
        var execucao = AF.core.iniciarExecucaoAjuste();
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
            for (var pi = 0; pi < sel.options.length; pi++) {
                var nomeTxt = (sel.options[pi].text || '').trim();
                if (!nomeTxt) continue;
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

                if (!AF.estado.cancelado) AF.sons.tocar('fim');
                if (execucao.ativa) {
                    execucao.cancel(AF.estado.cancelado ? 'Ajuste cancelado.' : 'Ajuste concluido.');
                }
                AF.core.setBotoes(false);
                AF.estado.rodando = false;
            }
        }
    };
	console.log('[FPW] 40-fases carregado. versão 1.4 - fix(fase1): re-mapear folha a cada rodada');
})();
