window.AutomacaoFolha = window.AutomacaoFolha || {
    ambiente: 'main',
    versao: '10.0',
    meta: {
        nome: 'app-fpw',
        ambiente: 'main',
        versao: '10.0'
    },
    estado: {
        cancelado: false,
        rodando: false,
        keepAliveTimer: null,
        ultimoPopup: null,
        relatorio: '',
        textoCopiavel: '',
        winOpenOriginal: null,
        falhaPrecondicao: false,
        logBuffer: []
    },
    core: {},
    utils: {},
    mapa: {},
    popup: {},
    fases: {}
};

(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.core = AF.core || {};

    AF.core.getDocC = function () {
        return window.top.frames[0].document;
    };

    AF.core.getDoc1 = function () {
        return window.top.frames[1].document;
    };

    AF.core.getCabec = function () {
        return window.top.frames[0];
    };

    AF.core.validarEstrutura = function (estrutura, incluirPopup, permitirSelecaoInicialVazia) {
        var erros = [];

        function exigir(condicao, mensagem) {
            if (!condicao) erros.push(mensagem);
        }

        function caminhoTerminaEm(caminho, trecho) {
            return typeof caminho === 'string' &&
                caminho.toLowerCase().replace(/\/+$/, '').endsWith(trecho.toLowerCase());
        }

        var frames = estrutura && estrutura.frames;
        var cabec = frames && frames[0];
        var corpo = frames && frames[1];
        var rodape = frames && frames[2];
        var corpoInicialVazio = !!(
            permitirSelecaoInicialVazia &&
            cabec &&
            cabec.employeeSelectionEmpty === true &&
            corpo &&
            corpo.name === 'mainFrame' &&
            caminhoTerminaEm(corpo.path, '/WebPonto/blank.htm') &&
            corpo.readyState === 'complete' &&
            !String(corpo.bodyClass || '').trim() &&
            corpo.hasSelectedRecords === false &&
            (!corpo.form || (
                corpo.form.name === 'myForm' &&
                corpo.form.method === 'post' &&
                caminhoTerminaEm(corpo.form.action, 'blank.htm')
            ))
        );

        exigir(caminhoTerminaEm(estrutura && estrutura.entryPath, '/WebPonto/just_user/justuser.asp'),
            'a pagina principal nao e justuser.asp');
        exigir(!!cabec, 'frame topFrame indisponivel');
        exigir(!!corpo, 'frame mainFrame indisponivel');
        exigir(!!rodape, 'frame bottomFrame indisponivel');

        if (cabec) {
            exigir(cabec.name === 'topFrame', 'frame 0 nao corresponde a topFrame');
            exigir(caminhoTerminaEm(cabec.path, '/WebPonto/just_user/justuser_cabec.asp'),
                'caminho do topFrame inesperado');
            exigir(cabec.readyState === 'complete', 'documento topFrame ainda nao carregou');
            exigir(cabec.bodyClass === 'Painel', 'estrutura do body de topFrame inesperada');
            exigir(!!cabec.form && cabec.form.name === 'yourform', 'form yourform ausente no topFrame');
            exigir(!!cabec.form && cabec.form.method === 'post', 'metodo do form yourform nao e POST');
            exigir(!!cabec.employeeSelector, 'seletor de funcionario ausente no topFrame');
        }

        if (corpo) {
            exigir(corpo.name === 'mainFrame', 'frame 1 nao corresponde a mainFrame');
            if (!corpoInicialVazio) {
                exigir(caminhoTerminaEm(corpo.path, '/WebPonto/just_user/justuser_corpo.asp'),
                    'caminho do mainFrame inesperado');
                exigir(corpo.readyState === 'complete', 'documento mainFrame ainda nao carregou');
                exigir(corpo.bodyClass === 'Tudo', 'estrutura do body de mainFrame inesperada');
                exigir(!!corpo.form && corpo.form.name === 'myForm', 'form myForm ausente no mainFrame');
                exigir(!!corpo.form && corpo.form.method === 'post', 'metodo do form myForm nao e POST');
                exigir(!!corpo.form && caminhoTerminaEm(corpo.form.action, 'justuser_corpo.asp'),
                    'acao do form myForm inesperada');
            }
        }

        if (rodape) {
            exigir(rodape.name === 'bottomFrame', 'frame 2 nao corresponde a bottomFrame');
            exigir(caminhoTerminaEm(rodape.path, '/WebPonto/just_user/justuser_rodape.asp'),
                'caminho do bottomFrame inesperado');
            exigir(rodape.readyState === 'complete', 'documento bottomFrame ainda nao carregou');
            exigir(rodape.bodyClass === 'Painel', 'estrutura do body de bottomFrame inesperada');
            exigir(!!rodape.saveControl, 'controle btnGravar ausente no bottomFrame');
        }

        if (incluirPopup) {
            var popup = estrutura && estrutura.popup;
            exigir(!!popup, 'popup de Ajuste Jornada Plan indisponivel');
            if (popup) {
                exigir(caminhoTerminaEm(popup.path,
                    '/WebPontoDotNet/Justificativa/TrocarHorario.aspx'),
                    'caminho do popup de Ajuste Jornada Plan inesperado');
                exigir(popup.readyState === 'complete', 'documento do popup ainda nao carregou');
                exigir(!!popup.form, 'form form1 ausente no popup');
                exigir(!!popup.dateSelector, 'seletor de periodo ausente no popup');
                exigir(!!popup.saveControl, 'controle btnGravar ausente no popup');
            }
        }

        return { ok: erros.length === 0, erros: erros };
    };

    AF.core.coletarEstrutura = function (popupWindow) {
        var topWindow = window.top;
        var estrutura = { entryPath: '', frames: [] };

        try {
            estrutura.entryPath = topWindow.location.pathname;
        } catch (e) {
            estrutura.entryPath = '';
        }

        function descreverFrame(indice) {
            try {
                var frame = topWindow.frames[indice];
                var doc = frame && frame.document;
                if (!frame || !doc) return null;

                var descricao = {
                    name: frame.name,
                    path: frame.location.pathname,
                    readyState: doc.readyState,
                    bodyClass: doc.body ? doc.body.className : '',
                    form: null,
                    employeeSelector: false,
                    employeeSelectionEmpty: false,
                    hasSelectedRecords: false,
                    saveControl: false
                };

                if (indice === 0) {
                    var formCabec = doc.querySelector('form[name="yourform"]');
                    if (formCabec) {
                        descricao.form = {
                            name: formCabec.name,
                            method: (formCabec.method || '').toLowerCase(),
                            action: formCabec.getAttribute('action') || '',
                            target: formCabec.target
                        };
                    }
                    var seletorFuncionario = doc.querySelector('select#lstNome[name="lstNome"]');
                    descricao.employeeSelector = !!seletorFuncionario;
                    if (seletorFuncionario) {
                        var opcaoSelecionada = seletorFuncionario.options[seletorFuncionario.selectedIndex];
                        descricao.employeeSelectionEmpty = !opcaoSelecionada ||
                            !(opcaoSelecionada.text || '').trim();
                    }
                } else if (indice === 1) {
                    descricao.hasSelectedRecords =
                        !!doc.querySelector('input[name^="Selecionado"]:checked');
                    var formCorpo = doc.querySelector('form[name="myForm"]');
                    if (formCorpo) {
                        descricao.form = {
                            name: formCorpo.name,
                            method: (formCorpo.method || '').toLowerCase(),
                            action: formCorpo.getAttribute('action') || ''
                        };
                    }
                } else if (indice === 2) {
                    descricao.saveControl = !!doc.getElementById('btnGravar');
                }
                return descricao;
            } catch (e) {
                return null;
            }
        }

        for (var i = 0; i < 3; i++) estrutura.frames.push(descreverFrame(i));

        if (popupWindow) {
            try {
                var popupDoc = popupWindow.document;
                estrutura.popup = {
                    path: popupWindow.location.pathname,
                    readyState: popupDoc.readyState,
                    form: !!popupDoc.querySelector('form#form1'),
                    dateSelector: !!popupDoc.getElementById('rpnPeriodo_ddlDatas'),
                    saveControl: !!popupDoc.querySelector('input[name="btnGravar"]')
                };
            } catch (e) {
                estrutura.popup = null;
            }
        }

        return estrutura;
    };

    AF.core.exigirEstrutura = function (etapa, popupWindow, permitirSelecaoInicialVazia) {
        var resultado;
        try {
            resultado = AF.core.validarEstrutura(
                AF.core.coletarEstrutura(popupWindow),
                !!popupWindow,
                !!permitirSelecaoInicialVazia
            );
        } catch (e) {
            resultado = { ok: false, erros: ['nao foi possivel inspecionar a estrutura atual'] };
        }

        if (resultado.ok) return true;

        AF.estado.falhaPrecondicao = true;
        AF.estado.cancelado = true;
        var diagnostico = resultado.erros.join('; ');
        if (typeof AF.core.pararExecucaoAjuste === 'function') {
            AF.core.pararExecucaoAjuste({
                status: 'error',
                stage: etapa,
                reason: diagnostico
            });
        } else {
            AF.core.log('AJUSTE INTERROMPIDO (' + etapa + '): ' + diagnostico, '#f87171');
            if (AF.painel && typeof AF.painel.setStatus === 'function') {
                AF.painel.setStatus('Interrompido: ' + diagnostico, '#f87171');
            }
        }
        return false;
    };

    AF.core.esperar = function (ms) {
        if (AF.estado && AF.estado.cancelado) return Promise.resolve();
        return new Promise(function (resolve) {
            var decorrido = 0;
            var intervalo = 50;
            var iv = setInterval(function () {
                decorrido += intervalo;
                if (decorrido >= ms || (AF.estado && AF.estado.cancelado)) {
                    clearInterval(iv);
                    resolve();
                }
            }, intervalo);
        });
    };

    AF.core.prazosEsperaAjuste = {
        popupReadiness: { deadlineMs: 18300, pollIntervalMs: 300 },
        popupCompletion: { deadlineMs: 36300, pollIntervalMs: 300 },
        bodyReload: { deadlineMs: 24600, pollIntervalMs: 300 },
        employeeReadiness: { deadlineMs: 16500, pollIntervalMs: 500 }
    };
    AF.core.prazosEsperaAjuste.footerReload = { deadlineMs: 12300, pollIntervalMs: 300 };

    AF.core.esperarAjuste = function (opcoes) {
        if (!opcoes || typeof opcoes.inspecionar !== 'function') {
            throw new Error('A espera de ajuste requer uma funcao de inspecao.');
        }

        var limite = opcoes.deadlineMs;
        var intervalo = opcoes.pollIntervalMs;
        var minimo = opcoes.minimumWaitMs === undefined ? 0 : opcoes.minimumWaitMs;
        if (!isFinite(limite) || limite <= 0 ||
            !isFinite(intervalo) || intervalo <= 0 ||
            !isFinite(minimo) || minimo < 0 || minimo > limite) {
            throw new Error('Configuracao de espera de ajuste invalida.');
        }

        return new Promise(function (resolve) {
            var iniciadoEm = Date.now();
            var timerIntervalo = null;
            var timerLimite = null;
            var removerCancelamento = null;
            var resolvida = false;
            var observouPronto = false;
            var valorPronto;
            var ultimoMotivo = '';

            function concluir(resultado) {
                if (resolvida) return;
                resolvida = true;
                if (timerIntervalo !== null) clearInterval(timerIntervalo);
                if (timerLimite !== null) clearTimeout(timerLimite);
                if (removerCancelamento) removerCancelamento();
                resolve(resultado);
            }

            function cancelada() {
                concluir({
                    status: 'cancelled',
                    stage: opcoes.stage || 'adjustment-wait',
                    reason: 'Execucao cancelada pelo usuario.'
                });
            }

            function inspecionar() {
                if (resolvida) return;

                try {
                    if (opcoes.isCancelled && opcoes.isCancelled()) {
                        cancelada();
                        return;
                    }

                    var observacao = opcoes.inspecionar();
                    if (observacao === true || (observacao && observacao.ready === true)) {
                        observouPronto = true;
                        if (observacao !== true) valorPronto = observacao.value;
                        if (Date.now() - iniciadoEm >= minimo) {
                            concluir({
                                status: 'ready',
                                stage: opcoes.stage || 'adjustment-wait',
                                value: valorPronto
                            });
                        }
                    } else if (observacao && observacao.reason) {
                        ultimoMotivo = String(observacao.reason);
                    }
                } catch (erro) {
                    concluir({
                        status: 'error',
                        stage: opcoes.stage || 'adjustment-wait',
                        reason: erro && erro.message ? erro.message : String(erro)
                    });
                }
            }

            if (opcoes.onCancel) {
                try {
                    var detach = opcoes.onCancel(cancelada);
                    if (typeof detach === 'function') {
                        removerCancelamento = detach;
                        if (resolvida) removerCancelamento();
                    }
                } catch (erroCancelamento) {
                    concluir({
                        status: 'error',
                        stage: opcoes.stage || 'adjustment-wait',
                        reason: erroCancelamento && erroCancelamento.message ?
                            erroCancelamento.message : String(erroCancelamento)
                    });
                    return;
                }
            }

            if (resolvida) return;
            timerLimite = setTimeout(function () {
                inspecionar();
                if (!resolvida) {
                    concluir({
                        status: 'timeout',
                        stage: opcoes.stage || 'adjustment-wait',
                        reason: ultimoMotivo || 'Prazo maximo de seguranca excedido sem confirmacao.'
                    });
                }
            }, limite);

            inspecionar();
            if (!resolvida) {
                timerIntervalo = setInterval(function () {
                    inspecionar();
                    if (!resolvida || !observouPronto || Date.now() - iniciadoEm < minimo) return;
                    concluir({
                        status: 'ready',
                        stage: opcoes.stage || 'adjustment-wait',
                        value: valorPronto
                    });
                }, intervalo);
            }
        });
    };

    AF.core.esperarDelayAjuste = function (execucao, etapa, duracaoMs) {
        if (!execucao || !execucao.isActive()) {
            return Promise.resolve({
                status: 'cancelled',
                stage: etapa,
                reason: 'Execucao de ajuste inativa.'
            });
        }

        if (!isFinite(duracaoMs) || duracaoMs < 0) {
            throw new Error('Duracao de estabilizacao invalida.');
        }

        var limite = Math.max(duracaoMs + 1, 1);
        return AF.core.esperarAjuste({
            stage: etapa,
            deadlineMs: limite,
            pollIntervalMs: limite,
            minimumWaitMs: duracaoMs,
            isCancelled: function () { return !execucao.isActive(); },
            onCancel: function (callback) { return execucao.onCancel(callback); },
            inspecionar: function () { return true; }
        });
    };

    AF.core.observarTransicaoCorpo = function (execucao, tentativa) {
        var documentoReferencia = AF.core.getDoc1();
        var geracaoLoad = 0;
        var geracaoReferencia = 0;
        var documentoReferenciaTransicao = documentoReferencia;
        var frameElemento = window.top.document.querySelector('frame[name="mainFrame"]');
        var ativo = true;

        function registrarLoad() {
            geracaoLoad++;
        }

        if (frameElemento && typeof frameElemento.addEventListener === 'function') {
            frameElemento.addEventListener('load', registrarLoad);
        } else {
            frameElemento = null;
        }

        function removerObservador() {
            if (!ativo) return;
            ativo = false;
            if (frameElemento) frameElemento.removeEventListener('load', registrarLoad);
        }

        var removerLimpeza = execucao.addCleanup(removerObservador);
        var observador = {
            armarTransicao: function () {
                documentoReferenciaTransicao = AF.core.getDoc1();
                geracaoReferencia = geracaoLoad;
            },
            marcarEnvio: function () {
                if (tentativa) {
                    tentativa.submitted = true;
                    tentativa.submittedAt = Date.now();
                }
                observador.armarTransicao();
            },
            inspecionar: function () {
                var frame = window.top.frames[1];
                var doc = frame.document;
                var transicao = doc !== documentoReferenciaTransicao || geracaoLoad > geracaoReferencia;
                if (!transicao) {
                    return { ready: false, reason: 'A transicao da pagina principal ainda nao foi observada.' };
                }
                if (doc.readyState !== 'complete') {
                    return { ready: false, reason: 'Documento principal apos transicao ainda carregando.' };
                }

                var caminho = frame.location.pathname.toLowerCase().replace(/\/+$/, '');
                var body = doc.body;
                var form = doc.querySelector('form[name="myForm"]');
                if (!caminho.endsWith('/webponto/just_user/justuser_corpo.asp') ||
                    !body || body.className !== 'Tudo' || !form ||
                    (form.method || '').toLowerCase() !== 'post' ||
                    !String(form.getAttribute('action') || '').toLowerCase().endsWith('justuser_corpo.asp')) {
                    return { ready: false, reason: 'Estrutura suportada do corpo apos transicao ainda incompleta.' };
                }
                return { ready: true, value: { document: doc, generation: geracaoLoad } };
            },
            dispose: function () {
                removerObservador();
                removerLimpeza();
            }
        };
        return observador;
    };

    AF.core.aguardarTransicaoCorpo = function (execucao, observador, etapa, estabilizacaoMs) {
        var nomePrazo = etapa === 'employee-readiness' ? 'employeeReadiness' :
            etapa === 'footer-save-reload' ? 'footerReload' : 'bodyReload';
        var prazo = AF.core.prazosEsperaAjuste[nomePrazo];
        return AF.core.esperarAjuste({
            stage: etapa,
            deadlineMs: prazo.deadlineMs,
            pollIntervalMs: prazo.pollIntervalMs,
            minimumWaitMs: estabilizacaoMs || 0,
            isCancelled: function () { return !execucao.isActive(); },
            onCancel: function (callback) { return execucao.onCancel(callback); },
            inspecionar: function () { return observador.inspecionar(); }
        });
    };

    AF.core.iniciarExecucaoAjuste = function () {
        var anterior = AF.estado.execucaoAjuste;
        if (anterior && anterior.isActive()) anterior.cancel('Substituida por nova execucao.');

        AF.estado.proximaExecucaoAjusteId = (AF.estado.proximaExecucaoAjusteId || 0) + 1;
        var execucao = {
            id: AF.estado.proximaExecucaoAjusteId,
            ativa: true,
            cancelada: false,
            motivoCancelamento: '',
            timers: [],
            ouvintesCancelamento: [],
            limpezas: []
        };

        function removerTimer(id) {
            for (var i = execucao.timers.length - 1; i >= 0; i--) {
                if (execucao.timers[i].id === id) execucao.timers.splice(i, 1);
            }
        }

        execucao.isActive = function () {
            return execucao.ativa &&
                !execucao.cancelada &&
                AF.estado.execucaoAjuste === execucao &&
                !AF.estado.cancelado;
        };

        execucao.onCancel = function (callback) {
            if (typeof callback !== 'function') throw new Error('O ouvinte de cancelamento deve ser uma funcao.');
            if (!execucao.isActive()) {
                callback();
                return function () {};
            }
            execucao.ouvintesCancelamento.push(callback);
            return function () {
                var indice = execucao.ouvintesCancelamento.indexOf(callback);
                if (indice >= 0) execucao.ouvintesCancelamento.splice(indice, 1);
            };
        };

        execucao.setTimeout = function (callback, delay) {
            if (typeof callback !== 'function') throw new Error('O callback do temporizador deve ser uma funcao.');
            if (!execucao.isActive()) return null;
            var id = setTimeout(function () {
                removerTimer(id);
                if (execucao.isActive()) callback();
            }, delay);
            execucao.timers.push({ id: id, interval: false });
            return id;
        };

        execucao.setInterval = function (callback, delay) {
            if (typeof callback !== 'function') throw new Error('O callback do temporizador deve ser uma funcao.');
            if (!execucao.isActive()) return null;
            var id = setInterval(function () {
                if (execucao.isActive()) callback();
            }, delay);
            execucao.timers.push({ id: id, interval: true });
            return id;
        };

        execucao.clearTimer = function (id) {
            for (var i = execucao.timers.length - 1; i >= 0; i--) {
                var timer = execucao.timers[i];
                if (timer.id !== id) continue;
                if (timer.interval) clearInterval(id);
                else clearTimeout(id);
                execucao.timers.splice(i, 1);
            }
        };

        execucao.addCleanup = function (callback) {
            if (typeof callback !== 'function') throw new Error('A limpeza deve ser uma funcao.');
            if (!execucao.isActive()) {
                callback();
                return function () {};
            }
            execucao.limpezas.push(callback);
            return function () {
                var indice = execucao.limpezas.indexOf(callback);
                if (indice >= 0) execucao.limpezas.splice(indice, 1);
            };
        };

        execucao.cancel = function (motivo) {
            if (!execucao.ativa) return;
            execucao.cancelada = true;
            execucao.ativa = false;
            execucao.motivoCancelamento = motivo || 'Execucao encerrada.';

            var timers = execucao.timers.slice();
            execucao.timers.length = 0;
            for (var ti = 0; ti < timers.length; ti++) {
                if (timers[ti].interval) clearInterval(timers[ti].id);
                else clearTimeout(timers[ti].id);
            }

            var ouvintes = execucao.ouvintesCancelamento.slice();
            execucao.ouvintesCancelamento.length = 0;
            for (var oi = 0; oi < ouvintes.length; oi++) {
                try {
                    ouvintes[oi]();
                } catch (erroOuvinte) {
                    console.error('[FPW] Falha ao notificar cancelamento do ajuste:', erroOuvinte);
                }
            }

            var limpezas = execucao.limpezas.slice();
            execucao.limpezas.length = 0;
            for (var li = 0; li < limpezas.length; li++) {
                try {
                    limpezas[li]();
                } catch (erroLimpeza) {
                    console.error('[FPW] Falha na limpeza da execucao de ajuste:', erroLimpeza);
                }
            }
        };

        AF.estado.execucaoAjuste = execucao;
        return execucao;
    };

    AF.core.norm = function (s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    AF.core.log = function (msg, cor, opcoes) {
        // Acumula no log estruturado (05-log.js); sem ele, mantém o buffer simples
        if (AF.log && typeof AF.log.registrar === 'function') {
            AF.log.registrar(msg, cor, opcoes);
        } else {
            AF.estado.logBuffer = AF.estado.logBuffer || [];
            AF.estado.logBuffer.push({ msg: msg, cor: cor || '#f9fafb' });
        }

        try {
            var docC = AF.core.getDocC();
            var b = docC.getElementById('log-box');
            if (!b) return;
            var d = docC.createElement('div');
            d.style.marginTop = '3px';
            d.style.color = cor || '#f9fafb';
            d.textContent = '* ' + msg;
            b.appendChild(d);
            b.scrollTop = b.scrollHeight;
        } catch (e) {}
    };

    AF.core.limparLogBuffer = function () {
        AF.estado.logBuffer = [];
    };

    AF.core.setBotoes = function (rodando) {
        try {
            var docC = AF.core.getDocC();
            var btnA = docC.getElementById('btn-analisar');
            var btnE = docC.getElementById('btn-executar');
            var btnP = docC.getElementById('btn-parar');
            if (btnA) btnA.disabled = rodando;
            if (btnE) btnE.disabled = rodando;
            if (btnP) btnP.disabled = !rodando;
        } catch (e) {}
    };

    AF.core.pararExecucaoAjuste = function (outcome, execucao) {
        var atual = AF.estado.execucaoAjuste;
        if (execucao && atual !== execucao) return false;
        var estavaAtiva = !!(atual && atual.ativa);

        outcome = outcome || {
            status: 'cancelled',
            stage: 'user-stop',
            reason: 'Parada solicitada pelo usuario.'
        };
        AF.estado.cancelado = true;

        var texto;
        if (outcome.status === 'cancelled') {
            AF.estado.motivoParadaAjuste = {
                stage: outcome.stage || 'user-stop',
                reason: outcome.reason || 'Parada solicitada pelo usuario.',
                unconfirmed: !!outcome.unconfirmed
            };
            texto = 'Parado: ' + AF.estado.motivoParadaAjuste.reason;
            if (AF.estado.motivoParadaAjuste.unconfirmed) {
                texto += ' (resultado nao confirmado)';
            }
        } else {
            AF.estado.falhaAjuste = {
                stage: outcome.stage || 'adjustment',
                reason: outcome.reason || 'Falha sem diagnostico adicional.',
                unconfirmed: !!outcome.unconfirmed
            };
            texto = 'Interrompido (' + AF.estado.falhaAjuste.stage + '): ' +
                AF.estado.falhaAjuste.reason;
            if (AF.estado.falhaAjuste.unconfirmed) texto += ' (resultado nao confirmado)';
        }

        AF.core.log(texto, outcome.status === 'cancelled' ? '#f97316' : '#f87171', {
            tipo: outcome.status === 'cancelled' ? 'parada' : 'falha',
            dados: {
                status: outcome.status,
                stage: outcome.stage || null,
                reason: outcome.reason || null,
                unconfirmed: !!outcome.unconfirmed
            }
        });
        if (AF.painel && typeof AF.painel.setStatus === 'function') {
            AF.painel.setStatus(texto, outcome.status === 'cancelled' ? '#f97316' : '#f87171');
        }
        if (outcome.status !== 'cancelled' && estavaAtiva && AF.sons && typeof AF.sons.tocar === 'function') {
            AF.sons.tocar('falha');
        }
        AF.estado.rodando = false;
        AF.core.setBotoes(false);

        if (atual && atual.ativa) {
            atual.cancel(texto);
        }
        try {
            if (AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed) {
                AF.estado.ultimoPopup.close();
            }
        } catch (erroFecharPopup) {
            console.error('[FPW] Falha ao fechar o popup da execucao interrompida:', erroFecharPopup);
        }
        AF.estado.ultimoPopup = null;
        AF.estado.ajustePopupTentativa = null;
        return true;
    };

    AF.core.cancelarTudo = function () {
        if (AF.estado) AF.estado.cancelado = true;
        if (AF.estado && AF.estado.execucaoAjuste && AF.estado.execucaoAjuste.ativa) {
            AF.core.pararExecucaoAjuste({
                status: 'cancelled',
                stage: 'user-stop',
                reason: 'Parada solicitada pelo usuario.'
            }, AF.estado.execucaoAjuste);
        } else {
            if (AF.estado) AF.estado.rodando = false;
            if (typeof AF.core.setBotoes === 'function') AF.core.setBotoes(false);
            if (AF.painel && typeof AF.painel.setStatus === 'function') {
                AF.painel.setStatus('Parado pelo usuario', '#f97316');
            }
        }
        try {
            if (AF.estado && AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed) {
                AF.estado.ultimoPopup.close();
            }
        } catch (e) {}
        if (AF.estado) AF.estado.ultimoPopup = null;
    };

    AF.core.getSelNome = function () {
        var docC = AF.core.getDocC();
        var sel = docC.getElementById('lstNome');
        if (!sel) sel = docC.querySelector('select[name="lstNome"]');
        return sel;
    };

    AF.core.nomeAtual = function () {
        var sel = AF.core.getSelNome();
        if (!sel) return '';
        var op = sel.options[sel.selectedIndex];
        return op ? (op.text || '').trim() : '';
    };

    AF.core.matAtual = function () {
        var el = AF.core.getDocC().getElementById('txtMatricula');
        return el ? el.value.trim() : '';
    };

    AF.core.paginaVaziaAgora = function () {
        try {
            var bt = AF.core.getDoc1().body ? (AF.core.getDoc1().body.innerText || '') : '';
            return bt.includes('Nenhuma marcação encontrada!') || bt.includes('Não existem informações para serem exibidas!');
        } catch (e) {
            return false;
        }
    };

    AF.core.avancarFuncionario = async function (execucao) {
        var sel = AF.core.getSelNome();
        if (!sel) return execucao ? { status: 'ready', value: 'fim' } : 'fim';
        if (sel.selectedIndex >= sel.options.length - 1) {
            return execucao ? { status: 'ready', value: 'fim' } : 'fim';
        }

        if (execucao) {
            if (!execucao.isActive()) return { status: 'cancelled', stage: 'employee-selection' };
            var observador;
            try {
                observador = AF.core.observarTransicaoCorpo(execucao, {});
                observador.armarTransicao();
                sel.selectedIndex = sel.selectedIndex + 1;

                var cabecAjuste = AF.core.getCabec();
                var docCabecAjuste = AF.core.getDocC();
                try {
                    cabecAjuste.AjustaCodEmpresaEmpregado(
                        docCabecAjuste.yourform.lstNome,
                        docCabecAjuste.yourform.CodEmpresaEmpregado
                    );
                } catch (e) {}

                try {
                    cabecAjuste.AtualizaFuncionario();
                } catch (e) {
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }

                var readiness = await AF.core.aguardarTransicaoCorpo(
                    execucao,
                    observador,
                    'employee-readiness',
                    6000
                );
                if (readiness.status === 'ready') {
                    return { status: 'ready', value: 'ok', observation: readiness.value };
                }
                return readiness;
            } catch (erroNavegacao) {
                return {
                    status: 'error',
                    stage: 'employee-readiness',
                    reason: erroNavegacao && erroNavegacao.message ?
                        erroNavegacao.message : String(erroNavegacao)
                };
            } finally {
                if (observador) observador.dispose();
            }
        }

        sel.selectedIndex = sel.selectedIndex + 1;

        var cabec = AF.core.getCabec();
        var docC = AF.core.getDocC();

        try {
            cabec.AjustaCodEmpresaEmpregado(docC.yourform.lstNome, docC.yourform.CodEmpresaEmpregado);
        } catch (e) {}

        try {
            cabec.AtualizaFuncionario();
        } catch (e) {
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await AF.core.esperar(6000);

        await new Promise(function (resolve) {
            var t = 0;
            var iv = setInterval(function () {
                t++;
                if (t > 20 || (AF.estado && AF.estado.cancelado)) { clearInterval(iv); resolve(); return; }
                try {
                    var tx = AF.core.getDoc1().querySelectorAll('input[type=text]');
                    var ir = AF.core.getDoc1().querySelectorAll('input[name^="Irre"]');
                    if (tx.length > 0 || ir.length > 0 || AF.core.paginaVaziaAgora()) {
                        clearInterval(iv);
                        resolve();
                    }
                } catch (e) {}
            }, 500);
        });

        return 'ok';
    };

    AF.core.instalarInterceptorPopup = function (execucao) {
        if (!execucao || !execucao.isActive()) {
            throw new Error('Interceptor de popup requer uma execucao de ajuste ativa.');
        }

        var framesToWatch = [window.top.frames[0], window.top.frames[1]];
        for (var fi = 0; fi < framesToWatch.length; fi++) {
            (function (frame, frameIndex) {
                if (!frame || !frame.window) return;

                var stateKey = 'winOpenInterceptor_' + frameIndex;
                var existente = AF.estado[stateKey];
                if (existente && frame.window.open === existente.wrapper) {
                    execucao.addCleanup(existente.restore);
                    return;
                }

                var originalOpen = frame.window.open;
                var wrapper = function (url, nome, opcoes) {
                    if (!execucao.isActive()) return originalOpen.call(frame.window, url, nome, opcoes);

                    var popup = originalOpen.call(frame.window, url, nome, opcoes);
                    if (!popup) return popup;

                    var tentativa = AF.estado.ajustePopupTentativa;
                    if (!tentativa || tentativa.execucao !== execucao) return popup;
                    tentativa.popup = popup;
                    AF.estado.ultimoPopup = popup;
                    return popup;
                };
                frame.window.open = wrapper;

                var registro = {
                    wrapper: wrapper,
                    restore: function () {
                        if (frame.window.open === wrapper) frame.window.open = originalOpen;
                        if (AF.estado[stateKey] === registro) delete AF.estado[stateKey];
                    }
                };
                AF.estado[stateKey] = registro;
                execucao.addCleanup(registro.restore);
            })(framesToWatch[fi], fi);
        }
    };
    // keep-alive — mantém a sessão viva sem recarregar o frame principal
    AF.core.manterSessaoViva = function () {
        if (AF.estado.rodando) return Promise.resolve({ skipped: 'automation-running' });
        if (typeof fetch !== 'function') return Promise.resolve({ ok: false, error: 'fetch-unavailable' });

        var target = window.location.href;
        AF.estado.keepAliveUltimaTentativa = new Date().toISOString();

        return fetch(target, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'same-origin'
        }).then(function (response) {
            var result = {
                ok: response.ok && !response.redirected,
                status: response.status,
                redirected: response.redirected,
                url: response.url,
                timestamp: new Date().toISOString()
            };
            AF.estado.keepAliveUltimoResultado = result;
            return result;
        }).catch(function (error) {
            var result = { ok: false, error: String(error), timestamp: new Date().toISOString() };
            AF.estado.keepAliveUltimoResultado = result;
            return result;
        });
    };

    AF.core.iniciarKeepAlive = function (minutos) {
        minutos = minutos || 2;
        AF.core.pararKeepAlive();
        AF.core.manterSessaoViva();
        AF.estado.keepAliveTimer = setInterval(function () {
            AF.core.manterSessaoViva();
        }, minutos * 60 * 1000);
    };

    AF.core.pararKeepAlive = function () {
        if (AF.estado.keepAliveTimer) {
            clearInterval(AF.estado.keepAliveTimer);
            AF.estado.keepAliveTimer = null;
        }
    };

    // ── Sessão Oracle (Liveness & Monitoramento) ──────────────────────
    AF.sessao = AF.sessao || {};

    var JANELA_EXPIRACAO_ORACLE_MS = 90 * 1000;
    AF.sessao.JANELA_EXPIRACAO_ORACLE_MS = JANELA_EXPIRACAO_ORACLE_MS;

    AF.sessao.avaliarEstadoOracle = function (entrada) {
        entrada = entrada || {};
        var agora = entrada.agora !== undefined ? entrada.agora : Date.now();
        var ultimoSinal = entrada.ultimoSinal;
        var estadoAnterior = entrada.estadoAnterior || 'unknown';
        var janelaMs = entrada.janelaMs || JANELA_EXPIRACAO_ORACLE_MS;
        var estadoExplicito = entrada.estadoExplicito;

        var novoEstado;
        if (estadoExplicito === 'expired') {
            novoEstado = 'expired';
        } else if (!ultimoSinal) {
            novoEstado = 'unknown';
        } else if (agora - ultimoSinal <= janelaMs && agora >= ultimoSinal) {
            novoEstado = 'active';
        } else {
            novoEstado = 'inactive';
        }

        var houvePerda = (estadoAnterior === 'active' && (novoEstado === 'inactive' || novoEstado === 'expired'));
        var houveExpiracao = (estadoAnterior !== 'expired' && novoEstado === 'expired');
        var transicao = (estadoAnterior !== novoEstado);

        return {
            estado: novoEstado,
            transicao: transicao,
            houvePerda: houvePerda,
            houveExpiracao: houveExpiracao,
            ultimoSinal: ultimoSinal || null,
            momento: agora
        };
    };

    AF.sessao.decidirPulsoAtivo = function (entrada) {
        entrada = entrada || {};
        var estado = entrada.estado || 'unknown';
        var agora = entrada.agora !== undefined ? entrada.agora : Date.now();
        var ultimoPulso = entrada.ultimoPulso || 0;
        var intervalo = entrada.intervalo || (3 * 60 * 1000); // 3 min padrão

        if (estado === 'expired') {
            return { devePulsar: false, motivo: 'expirado' };
        }
        if (estado === 'inactive') {
            return { devePulsar: false, motivo: 'inativo' };
        }
        if (!ultimoPulso || (agora - ultimoPulso >= intervalo)) {
            return { devePulsar: true, motivo: 'intervalo_decorrido' };
        }
        return { devePulsar: false, motivo: 'aguardando_intervalo', restanteMs: intervalo - (agora - ultimoPulso) };
    };

    AF.sessao.iniciarMonitorOracle = function (callback) {
        function verificar() {
            var ultimo = null;
            var explicito = null;
            try {
                if (typeof GM_getValue === 'function') {
                    ultimo = GM_getValue('fpw_oracle_liveness', null);
                    explicito = GM_getValue('fpw_oracle_estado', null);
                }
            } catch (e) {}

            var avaliacao = AF.sessao.avaliarEstadoOracle({
                ultimoSinal: ultimo,
                estadoExplicito: explicito,
                estadoAnterior: AF.estado.sessaoOracleEstado || 'unknown'
            });

            AF.estado.sessaoOracleEstado = avaliacao.estado;
            AF.estado.sessaoOracleUltimoSinal = avaliacao.ultimoSinal;
            AF.estado.sessaoOracleUltimoResultado = avaliacao;

            if (avaliacao.houvePerda) {
                if (AF.log && typeof AF.log.evento === 'function') {
                    var msg = avaliacao.estado === 'expired' ?
                        'Sessao Oracle expirou (notificacao/login detectado).' :
                        'Sessao da pagina Oracle foi perdida ou ficou inativa.';
                    AF.log.evento('perda-sessao-oracle', avaliacao, msg, '#f97316');
                }
            }

            if (typeof callback === 'function') {
                callback(avaliacao);
            }
        }

        verificar();
        if (typeof setInterval === 'function') {
            AF.sessao.pararMonitorOracle();
            AF.estado.sessaoOracleTimer = setInterval(verificar, 10000);
        }
    };

    AF.sessao.pararMonitorOracle = function () {
        if (AF.estado.sessaoOracleTimer) {
            clearInterval(AF.estado.sessaoOracleTimer);
            AF.estado.sessaoOracleTimer = null;
        }
    };

    console.log('[FPW] 00-core carregado. versão 1.2 - Update log message to include version number.');
})();
