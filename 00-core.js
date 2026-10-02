window.AutomacaoFolha = window.AutomacaoFolha || {
    ambiente: 'test',
    versao: '9.7-test',
    meta: {
        nome: 'app-fpw',
        ambiente: 'test',
        versao: '9.7-test'
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

    AF.core.validarEstrutura = function (estrutura, incluirPopup) {
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
            exigir(!!cabec.form && caminhoTerminaEm(cabec.form.action, 'justuser_corpo.asp'),
                'acao do form yourform inesperada');
            exigir(!!cabec.form && cabec.form.target === 'mainFrame', 'destino do form yourform inesperado');
            exigir(!!cabec.employeeSelector, 'seletor de funcionario ausente no topFrame');
        }

        if (corpo) {
            exigir(corpo.name === 'mainFrame', 'frame 1 nao corresponde a mainFrame');
            exigir(caminhoTerminaEm(corpo.path, '/WebPonto/just_user/justuser_corpo.asp'),
                'caminho do mainFrame inesperado');
            exigir(corpo.readyState === 'complete', 'documento mainFrame ainda nao carregou');
            exigir(corpo.bodyClass === 'Tudo', 'estrutura do body de mainFrame inesperada');
            exigir(!!corpo.form && corpo.form.name === 'myForm', 'form myForm ausente no mainFrame');
            exigir(!!corpo.form && corpo.form.method === 'post', 'metodo do form myForm nao e POST');
            exigir(!!corpo.form && caminhoTerminaEm(corpo.form.action, 'justuser_corpo.asp'),
                'acao do form myForm inesperada');
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
                    descricao.employeeSelector = !!doc.querySelector('select#lstNome[name="lstNome"]');
                } else if (indice === 1) {
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

    AF.core.exigirEstrutura = function (etapa, popupWindow) {
        var resultado;
        try {
            resultado = AF.core.validarEstrutura(
                AF.core.coletarEstrutura(popupWindow),
                !!popupWindow
            );
        } catch (e) {
            resultado = { ok: false, erros: ['nao foi possivel inspecionar a estrutura atual'] };
        }

        if (resultado.ok) return true;

        AF.estado.falhaPrecondicao = true;
        AF.estado.cancelado = true;
        var diagnostico = resultado.erros.join('; ');
        AF.core.log('AJUSTE INTERROMPIDO (' + etapa + '): ' + diagnostico, '#f87171');
        if (AF.painel && typeof AF.painel.setStatus === 'function') {
            AF.painel.setStatus('Interrompido: ' + diagnostico, '#f87171');
        }
        return false;
    };

    AF.core.esperar = function (ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    };

    AF.core.norm = function (s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };

    AF.core.log = function (msg, cor) {
        // Acumula no buffer para uso na janela de relatório
        AF.estado.logBuffer = AF.estado.logBuffer || [];
        AF.estado.logBuffer.push({ msg: msg, cor: cor || '#f9fafb' });

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

    AF.core.cancelarTudo = function () {
        AF.estado.cancelado = true;
        try {
            if (AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed) {
                AF.estado.ultimoPopup.close();
            }
        } catch (e) {}
        AF.estado.ultimoPopup = null;
        // Restaura window.open original em todos os frames interceptados
        try {
            var frames = [window.top.frames[0], window.top.frames[1]];
            for (var fi = 0; fi < frames.length; fi++) {
                try {
                    var frame = frames[fi];
                    if (!frame || !frame.window) continue;
                    var stateKey = 'winOpenOriginal_' + frame.location.href.split('/').pop();
                    if (AF.estado[stateKey]) {
                        frame.window.open = AF.estado[stateKey];
                    }
                } catch(e) {}
            }
            // Compatibilidade legada
            if (AF.estado.winOpenOriginal && window.top.frames[0] && window.top.frames[0].window) {
                window.top.frames[0].window.open = AF.estado.winOpenOriginal;
            }
        } catch (e) {}
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

    AF.core.avancarFuncionario = async function () {
        var sel = AF.core.getSelNome();
        if (!sel) return 'fim';
        if (sel.selectedIndex >= sel.options.length - 1) return 'fim';

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
                if (t > 20) { clearInterval(iv); resolve(); return; }
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

    AF.core.instalarInterceptorPopup = function () {
        // Intercepta tanto o frame do cabeçalho (0) quanto o do corpo (1)
        var framesToWatch = [window.top.frames[0], window.top.frames[1]];

        for (var fi = 0; fi < framesToWatch.length; fi++) {
            (function(frame) {
                if (!frame || !frame.window) return;

                // Evita instalar duas vezes no mesmo frame
                var stateKey = 'winOpenOriginal_' + frame.location.href.split('/').pop();
                if (AF.estado[stateKey]) return;

                var originalOpen = frame.window.open;
                AF.estado[stateKey] = originalOpen;

                frame.window.open = function (url, nome, opcoes) {
                    if (AF.estado.cancelado) {
                        return originalOpen.call(frame.window, url, nome, opcoes);
                    }

                    var popup = originalOpen.call(frame.window, url, nome, opcoes);
                    if (!popup) return popup;

                    AF.estado.ultimoPopup = popup;
                    sessionStorage.removeItem('autopopupSemSucesso');

                    var dataTrocar = sessionStorage.getItem('autodataTrocar');
                    var datasCandidatas = [];
                    try {
                        datasCandidatas = JSON.parse(sessionStorage.getItem('autodatasCandidatasPopup') || '[]');
                    } catch (e0) {}

                    if (dataTrocar && !datasCandidatas.length) datasCandidatas = [dataTrocar];
                    if (!datasCandidatas.length) return popup;

                    var tent = 0;
                    var iv = setInterval(function () {
                        tent++;
                        if (tent > 120) { clearInterval(iv); return; }

                        try {
                            var s = popup.document.getElementById('rpnPeriodo_ddlDatas');
                            if (!s || !s.options || s.options.length === 0) return;
                            clearInterval(iv);
                            AF.popup.tentarIndiceDatas(popup, datasCandidatas, 0);
                        } catch (e) {}
                    }, 200);

                    return popup;
                };
            })(framesToWatch[fi]);
        }
                
        // Mantém compatibilidade com winOpenOriginal legado
        if (!AF.estado.winOpenOriginal && window.top.frames[0] && window.top.frames[0].window) {
            AF.estado.winOpenOriginal = window.top.frames[0].window.open;
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
    console.log('[FPW] 00-core carregado. versão 1.2 - Update log message to include version number.');
})();
