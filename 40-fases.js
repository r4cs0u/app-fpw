(function () {
    'use strict';

	var AF = window.AutomacaoFolha;
    AF.fases = AF.fases || {};

    // ── Escolhe ausência priorizando domingo ───────────────────────────

    function escolherAusenciaDestino(ausencias, usadas) {
        var disponiveis = ausencias.filter(function(a) {
            return !usadas || !usadas.has(a.dataStr);
        });
        var domingo = disponiveis.filter(function(a) { return a.dataObj.getDay() === 0; })[0];
        return domingo || disponiveis[0] || null;
    }

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

    AF.fases.planejarFase1 = function (mapa) {
        var acoes = [];
        var presas = [];
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
	            if (semana.ausencias.length > 0) {
	                var aus = escolherAusenciaDestino(semana.ausencias, null);
	                acoes.push({
	                    fase: 1, tipo: 'folga_mes',
	                    semanaId: semKey,
	                    numAbrirPopup: aus.num,
	                    dataAusencia: aus.dataStr,
	                    dataOrigem: folga.dataStr,
	                    candidatos: [folga.dataStr]
	                });
	            } else {
	                presas.push({ fase: 1, semanaId: semKey, dataFolga: folga.dataStr, numFolga: folga.num });
	            }
	        }
        }
        return { acoes: acoes, presas: presas };
    };

    AF.fases.processarFase1 = async function () {
        var mapa = AF.mapa.mapearFolhaAtual();
        var plano = AF.fases.planejarFase1(mapa);
        var movidas = 0;
        var presas = plano.presas.slice();

        for (var i = 0; i < plano.acoes.length; i++) {
            if (AF.estado.cancelado) break;
            var acao = plano.acoes[i];
            AF.core.log('Fase 1: ausencia ' + acao.dataAusencia + ' <- folga ' + acao.dataOrigem, '#89b4fa');
            var r = await AF.popup.executarAcaoFolga(acao);
            if (r.ok) movidas++;
            if (r.semAlteracao) presas.push({ fase: 1, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup });
        }

        return { movidas: movidas, presas: presas };
    };

    // ── Fase 2 ─────────────────────────────────────────────────────────

    AF.fases.planejarFase2Rodada = function (mapa, historicoTentativas, datasUsadasFase2) {
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
        var ocultasUnicas = [];
        var occSet = new Set();
        for (var o = 0; o < folgasOcultas.length; o++) {
            if (occSet.has(folgasOcultas[o])) continue;
            occSet.add(folgasOcultas[o]);
            ocultasUnicas.push(folgasOcultas[o]);
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

    AF.fases.processarFase2 = async function () {
        var movidas = 0;
        var presas = [];
        var historicoTentativas = {};
        var datasUsadasFase2 = new Set();
        var seguranca = 0;

        while (!AF.estado.cancelado) {
            seguranca++;
            if (seguranca > 20) { AF.core.log('Fase 2 interrompida por seguranca.', '#f87171'); break; }

            var mapa = AF.mapa.mapearFolhaAtual();
            var rodada = AF.fases.planejarFase2Rodada(mapa, historicoTentativas, datasUsadasFase2);
            if (rodada.acabou) break;

            var acao = rodada.acao;
            historicoTentativas[acao.dataAusencia + '|' + acao.dataOrigem + '|' + rodada.tipo] = true;
            datasUsadasFase2.add(acao.dataAusencia);
            datasUsadasFase2.add(acao.dataOrigem);

            AF.core.log('Fase 2: ausencia ' + acao.dataAusencia + (rodada.tipo === 'visivel' ? ' <- folga ' : ' <- folga oculta ') + acao.dataOrigem, '#89b4fa');

            var r = await AF.popup.executarAcaoFolga(acao);
            if (r.ok) { movidas++; continue; }
            if (rodada.tipo === 'oculta') presas.push({ fase: 2, semanaId: acao.semanaId, dataFolga: acao.dataOrigem, numFolga: acao.numAbrirPopup });
            break;
        }

        return { movidas: movidas, presas: presas };
    };

    // ── Fase 3 ─────────────────────────────────────────────────────────

    AF.fases.planejarFase3 = function (mapa, presasAnteriores) {
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
                numPopup     = ausencias[0].num;
                dataAusencia = ausencias[0].dataStr;
            } else if (presa.numFolga) {
                numPopup     = presa.numFolga;
                dataAusencia = presa.dataFolga;
            } else {
                presasFinais.push(presa);
                continue;
            }

            var feriadosVisiveis = (semana.feriadosSemana || []);
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

            var feriadosOcultos = (semana.feriadosOcultos || []);
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

            presasFinais.push(presa);
        }

        return { acoes: acoes, presasFinais: presasFinais };
    };

    // ── Fase 4: Alterar 47 → 48 ────────────────────────────────────────

	AF.fases.processarFase4 = function () {
		var doc1   = AF.core.getDoc1();
		var alvo   = AF.utils.mesAlvoDaTabela();
		var ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0);
		var ultimaSemanaId = AF.utils.semanaIdBR(ultimoDia);

		var nsMarcados = [];
		var campos = Array.from(doc1.querySelectorAll('input[type=text]'));

		for (var i = 0; i < campos.length; i++) {
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
				AF.core.log('Fase 4: select nao achado para ' + (dataStr || num), '#f9e2af');
				continue;
			}

			var opt48 = Array.from(sel.options).find(function (o) {
				return o.value === '48';
			});
			if (!opt48) {
				AF.core.log('Fase 4: opcao 48 nao existe para ' + (dataStr || num), '#f9e2af');
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
			AF.core.log('Fase 4: ' + dataStr + ' | 47 → 48 | CodJust: ' + (cod ? cod.value : '-'), '#f9e2af');
		}

		return nsMarcados;
	};

    // ── Gravar ─────────────────────────────────────────────────────────

	AF.fases.gravar = async function (nsMarcados) {
	    try {
	        var doc2 = window.top.frames[2].document;
	        var btn = doc2.getElementById('btnGravar');
	        if (!btn) { AF.core.log('ERRO: btnGravar nao encontrado em frames[2].', '#f87171'); return; }
	
			btn.click();
			
			if (AF.estado.cancelado) return;
			
			await AF.fases.aguardarGravacao();
			
			AF.core.log('Gravado.', '#a6e3a1');
        } catch (e) {
            AF.core.log('ERRO ao gravar: ' + e.message, '#f87171');
        }
    };

	AF.fases.aguardarGravacao = async function () {
    var recarregou = await new Promise(function (resolve) {
        var fase = 'aguardando_sumir';
        var t = 0;
        var iv = setInterval(function () {
            t++;
            if (t > 40) { clearInterval(iv); resolve(false); return; }
            try {
                var ir = AF.core.getDoc1().querySelectorAll('input[name^="Irre"]');
                var tx = AF.core.getDoc1().querySelectorAll('input[type=text]');

                if (fase === 'aguardando_sumir') {
                    if (ir.length === 0 && tx.length === 0) {
                        fase = 'aguardando_voltar';
                    }
                } else {
                    if (ir.length > 0 || tx.length > 0 || AF.core.paginaVaziaAgora()) {
                        clearInterval(iv); resolve(true);
                    }
                }
            } catch (e) {}
        }, 300);
    });

    await AF.core.esperar(5000);
};

    // ── Processar folha atual ──────────────────────────────────────────
    // relLista é um mapa { nome → objeto } pré-populado com todos os nomes.
    // Aqui atualizamos o registro existente em vez de fazer push.

    AF.fases.processarFolhaAtual = async function (relStats, relLista, relListaMap) {
        var nome = AF.core.nomeAtual();
        AF.core.log('\u2500\u2500 ' + nome + ' \u2500\u2500', '#c084fc');

        var entry = relListaMap[nome] || relListaMap[nome.trim()];

        if (AF.core.paginaVaziaAgora()) {
            AF.core.log('Sem marcacoes, pulando.', '#4b5563');
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

        AF.core.log('Processando folgas...', '#89b4fa');
        var r1 = await AF.fases.processarFase1();
        if (AF.estado.cancelado) return;

        var r2 = await AF.fases.processarFase2();
        if (AF.estado.cancelado) return;

        var mapaFinal = AF.mapa.mapearFolhaAtual();
        var presasBase = [].concat(r1.presas).concat(r2.presas);
        var plano3 = AF.fases.planejarFase3(mapaFinal, presasBase);
        var totalMovidas = r1.movidas + r2.movidas;
        var presasFinais = plano3.presasFinais.slice();

        for (var i = 0; i < plano3.acoes.length; i++) {
            if (AF.estado.cancelado) break;
            var acao = plano3.acoes[i];
            AF.core.log('Fase 3 [' + acao.tipo + ']: ausencia ' + acao.dataAusencia + ' <- feriado ' + acao.dataOrigem, '#89b4fa');
            var r3 = await AF.popup.executarAcaoFolga(acao);
            if (r3.ok) totalMovidas++;
            else presasFinais.push({ fase: 3, semanaId: acao.semanaId, dataFolga: acao.dataFolgaOriginal || acao.dataOrigem });
        }

        if (AF.estado.cancelado) return;

        var nsMarcados = AF.fases.processarFase4();
        var linhas47 = nsMarcados.length;

		if (linhas47 > 0) {
		    AF.core.log('Gravando Fase 4...', '#89b4fa');
		    await AF.fases.gravar(nsMarcados);
		} else {
		    AF.core.log('Fase 4: nada a alterar.', '#4b5563');
		}
		
		if (AF.estado.cancelado) return;

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
		AF.estado.rodando = true;
        AF.core.setBotoes(true);
        AF.core.getDocC().getElementById('log-box').innerHTML = '';
        AF.sons.tocar('inicio');

        AF.core.instalarInterceptorPopup();

        var relStats = {
            totalFolhas: 0, semMarcacoes: 0,
            folgasAlteradas: 0, folgasNaoAlteradas: 0,
            irregsRestantes: 0, interjRestantes: 0, linhas47: 0
        };

        var sel = AF.core.getSelNome();
        if (!sel) { AF.core.log('ERRO: Lista de funcionarios nao encontrada.', '#f87171'); AF.core.setBotoes(false); return; }

        // ── snapshot de TODOS os nomes antes de iniciar o loop ──
        var relLista    = [];   // array ordenado
        var relListaMap = {};   // mapa nome → objeto (para atualização rápida)
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
        // ordenação alfabética (sem acentos) desde o início
        var normSort = function (s) {
            return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        };
        relLista.sort(function (a, b) {
            return normSort(a.nome) < normSort(b.nome) ? -1 : normSort(a.nome) > normSort(b.nome) ? 1 : 0;
        });

        var cabec = AF.core.getCabec();
        var docC  = AF.core.getDocC();

        var nomeSelecionado = (sel.options[sel.selectedIndex] && (sel.options[sel.selectedIndex].text || '').trim());
        if (!nomeSelecionado) {
            var primeiroValido = -1;
            for (var pi2 = 0; pi2 < sel.options.length; pi2++) {
                if ((sel.options[pi2].text || '').trim()) { primeiroValido = pi2; break; }
            }
            if (primeiroValido < 0) { AF.core.log('ERRO: Nenhum funcionario encontrado.', '#f87171'); AF.core.setBotoes(false); return; }

            sel.selectedIndex = primeiroValido;
            try { cabec.AjustaCodEmpresaEmpregado(docC.yourform.lstNome, docC.yourform.CodEmpresaEmpregado); } catch (e) {}
            try { cabec.AtualizaFuncionario(); } catch (e) { sel.dispatchEvent(new Event('change', { bubbles: true })); }

            AF.core.log('Iniciando pelo primeiro: ' + AF.core.nomeAtual(), '#89b4fa');
            await AF.core.esperar(6000);

            await new Promise(function (resolve) {
                var t = 0;
                var iv = setInterval(function () {
                    t++;
                    if (t > 20) { clearInterval(iv); resolve(); return; }
                    try {
                        var tx = AF.core.getDoc1().querySelectorAll('input[type=text]');
                        var ir = AF.core.getDoc1().querySelectorAll('input[name^="Irre"]');
                        if (tx.length > 0 || ir.length > 0 || AF.core.paginaVaziaAgora()) { clearInterval(iv); resolve(); }
                    } catch (e) {}
                }, 500);
            });
        } else {
            AF.core.log('Continuando de: ' + AF.core.nomeAtual(), '#89b4fa');
        }

        var nomeInicial = AF.core.nomeAtual();
        var total       = 0;
        var inicioExec  = Date.now();

        while (true) {
            if (AF.estado.cancelado) break;

            await AF.fases.processarFolhaAtual(relStats, relLista, relListaMap);
            total++;

            if (AF.estado.cancelado) break;

            var res = await AF.core.avancarFuncionario();
            if (AF.estado.cancelado) break;

            if (res === 'fim') { AF.core.log('Fim da lista.', '#a3e635'); break; }
            if (AF.core.nomeAtual() === nomeInicial) { AF.core.log('Concluido.', '#a3e635'); break; }
        }

        var tempoMs = Date.now() - inicioExec;
        AF.relatorios.gerarFolgas(relStats, relLista, tempoMs, AF.estado.cancelado);

        if (!AF.estado.cancelado) AF.sons.tocar('fim');

        AF.core.setBotoes(false);
		AF.estado.rodando = false;
    };
	console.log('[FPW] 40-fases carregado.versão 1.2 - Log loading message for 40-fases version 1.2');
})();
