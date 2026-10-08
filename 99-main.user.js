// ==UserScript==
// @name         app-fpw
// @namespace    http://tampermonkey.net/
// @version      9.12-test
// @match        https://myway.g.globo/WebPonto/just_user/justuser.asp*
// @match        https://elny.fa.la1.oraclecloud.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @connect      raw.githubusercontent.com
// @downloadURL https://raw.githubusercontent.com/r4cs0u/app-fpw/test/99-main.user.js
// @updateURL   https://raw.githubusercontent.com/r4cs0u/app-fpw/test/99-main.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    function ehOrigemOracle(loc) {
        loc = loc || (typeof window !== 'undefined' ? window.location : null);
        return !!(loc && loc.hostname && loc.hostname.indexOf('oraclecloud.com') !== -1);
    }

    function iniciarSentinelaOracle() {
        console.info('[FPW] Sentinela de sessao Oracle ativo nesta aba.');
        var MAX_DIAG = 20;

        function sanitizarCaminho(loc) {
            try {
                return (loc && loc.pathname) ? loc.pathname : '';
            } catch (e) {
                return '';
            }
        }

        function registrarDiagnostico(evento, detalhes) {
            try {
                if (typeof GM_getValue !== 'function' || typeof GM_setValue !== 'function') return;
                var raw = GM_getValue('fpw_oracle_diag', []);
                var lista = Array.isArray(raw) ? raw : [];
                var item = {
                    t: Date.now(),
                    ev: evento,
                    path: sanitizarCaminho(typeof window !== 'undefined' ? window.location : null)
                };
                if (detalhes && typeof detalhes === 'object') {
                    for (var k in detalhes) {
                        if (Object.prototype.hasOwnProperty.call(detalhes, k)) {
                            // Não salvar strings longas ou sensíveis
                            if (typeof detalhes[k] === 'number' || typeof detalhes[k] === 'boolean' || typeof detalhes[k] === 'string') {
                                item[k] = detalhes[k];
                            }
                        }
                    }
                }
                lista.push(item);
                if (lista.length > MAX_DIAG) {
                    lista = lista.slice(lista.length - MAX_DIAG);
                }
                GM_setValue('fpw_oracle_diag', lista);
            } catch (e) {}
        }

        var aberturaRegistrada = false;
        function emitirPulso() {
            try {
                var agora = Date.now();
                if (typeof GM_setValue === 'function') {
                    GM_setValue('fpw_oracle_liveness', agora);
                }
                if (!aberturaRegistrada) {
                    aberturaRegistrada = true;
                    registrarDiagnostico('abertura', { inicio: agora });
                }
                verificarSinaisExpiracao();
            } catch (e) {}
        }

        var expiracaoNotificada = false;
        function verificarSinaisExpiracao() {
            try {
                if (typeof document === 'undefined') return;
                var loc = typeof window !== 'undefined' ? window.location : null;
                var pathname = (loc && loc.pathname) ? loc.pathname.toLowerCase() : '';
                // Sinais típicos de redirecionamento para login / expiração
                var ehLogin = pathname.indexOf('login') !== -1 || pathname.indexOf('auth') !== -1 || pathname.indexOf('signin') !== -1;
                var textoDoc = (document.body && document.body.innerText) ? document.body.innerText.toLowerCase() : '';
                var temAvisoExpirada = textoDoc.indexOf('sessão expirou') !== -1 ||
                                      textoDoc.indexOf('session expired') !== -1 ||
                                      textoDoc.indexOf('session has expired') !== -1 ||
                                      textoDoc.indexOf('sua sessão terminou') !== -1;

                if ((ehLogin || temAvisoExpirada) && !expiracaoNotificada) {
                    expiracaoNotificada = true;
                    if (typeof GM_setValue === 'function') {
                        GM_setValue('fpw_oracle_estado', 'expired');
                    }
                    registrarDiagnostico('expirada', { ehLogin: ehLogin, temAviso: temAvisoExpirada });
                }
            } catch (e) {}
        }

        function registrarAtividadeUsuario(ev) {
            try {
                registrarDiagnostico('atividade', { tipo: ev ? ev.type : 'manual' });
            } catch (e) {}
        }

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            var throttleAtividade = 0;
            function onInteracao(ev) {
                var agora = Date.now();
                if (agora - throttleAtividade > 60000) { // registra no máximo 1x por minuto
                    throttleAtividade = agora;
                    registrarAtividadeUsuario(ev);
                }
            }
            window.addEventListener('mousedown', onInteracao, { passive: true });
            window.addEventListener('keydown', onInteracao, { passive: true });
        }

        function executarPulsoAtivo() {
            try {
                if (typeof GM_getValue !== 'function' || typeof GM_setValue !== 'function') return;
                var estadoExplicito = GM_getValue('fpw_oracle_estado', null);
                if (estadoExplicito === 'expired') return;

                var agora = Date.now();
                var ultimoPulso = GM_getValue('fpw_oracle_ultimo_pulso_ts', 0);
                var intervalo = 3 * 60 * 1000; // 3 minutos

                if (agora - ultimoPulso < intervalo) return;

                GM_setValue('fpw_oracle_ultimo_pulso_ts', agora);

                // Executa fetch de leitura inócua na própria origem Oracle para renovar sessão
                if (typeof fetch === 'function') {
                    fetch(sanitizarCaminho(typeof window !== 'undefined' ? window.location : null) || '/fscmUI/faces/FuseWelcome', {
                        method: 'HEAD',
                        credentials: 'same-origin',
                        cache: 'no-store'
                    }).then(function (res) {
                        var resData = { quando: Date.now(), ok: res.ok, status: res.status };
                        GM_setValue('fpw_oracle_ultimo_pulso_resultado', resData);
                        registrarDiagnostico('pulso_ativo', resData);
                    }).catch(function (err) {
                        var errData = { quando: Date.now(), ok: false, status: 0, erro: String(err) };
                        GM_setValue('fpw_oracle_ultimo_pulso_resultado', errData);
                        registrarDiagnostico('pulso_ativo', errData);
                    });
                }
            } catch (e) {}
        }

        emitirPulso();
        executarPulsoAtivo();
        if (typeof setInterval === 'function') {
            setInterval(function () {
                emitirPulso();
                executarPulsoAtivo();
            }, 30000);
        }
    }

    if (ehOrigemOracle()) {
        iniciarSentinelaOracle();
        return;
    }

    var BASE = 'https://raw.githubusercontent.com/r4cs0u/app-fpw/test/';
    var MODULOS = [
        '00-core.js',
        '05-log.js',
        '10-utils.js',
        '35-planejamento.js',
        '37-regras-folha.js',
        '38-preanalise.js',
        '20-mapa.js',
        '25-detector.js',
        '27-modelo-relatorio.js',
        '30-popup.js',
        '40-fases.js',
        '50-analisar.js',
        '60-relatorios.js',
        '65-supervisionado.js',
        '70-sons.js',
        '80-painel.js',
        '85-ambiente.js'
    ];

    function carregarModulo(arquivo) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: BASE + arquivo + '?_=' + Date.now(),
                nocache: true,
                onload: function (r) {
                    if (r.status === 200) {
                        try { eval(r.responseText); resolve(); }
                        catch (e) { reject('Erro ao executar ' + arquivo + ': ' + e); }
                    } else {
                        reject('Falha HTTP ' + r.status + ' em ' + arquivo);
                    }
                },
                onerror: function (e) { reject('Erro de rede em ' + arquivo + ': ' + JSON.stringify(e)); }
            });
        });
    }

    async function carregarTodos() {
        for (var i = 0; i < MODULOS.length; i++) {
            await carregarModulo(MODULOS[i]);
        }
    }

    function configurarAmbienteTeste() {
        var AF = window.AutomacaoFolha || {};
        if (AF.test && typeof AF.test.configurar === 'function') {
            AF.test.configurar();
            console.info('[FPW][test] ambiente experimental carregado');
            return;
        }
        AF.ambiente = 'test';
        AF.versao = '9.12-test';
        AF.meta = AF.meta || {};
        AF.meta.nome = 'app-fpw';
        AF.meta.ambiente = 'test';
        AF.meta.versao = '9.12-test';
        console.info('[FPW][test] ambiente experimental carregado');
    }

    function esperarCabecalho(callback) {
        var tent = 0;
        var iv = setInterval(function () {
            tent++;
            if (tent > 120) { clearInterval(iv); return; }
            try {
                var cabec = window.top.frames[0];
                if (!cabec || !cabec.document || !cabec.document.body) return;
                var sel = cabec.document.getElementById('lstNome');
                if (!sel) sel = cabec.document.querySelector('select[name="lstNome"]');
                if (!sel) return;
                clearInterval(iv);
                callback(cabec.document);
            } catch (e) {}
        }, 500);
    }

    function vigiarPainel(docC) {
        var AF = window.AutomacaoFolha;
        var docVigiado = docC;
        var frameCabecalho = window.top.document.querySelector('frame[name="topFrame"]');

        function garantirPainel() {
            try {
                if (!AF || !AF.painel) return;
                var docAtual = frameCabecalho ? frameCabecalho.contentDocument : window.top.frames[0].document;
                if (!docAtual || !docAtual.body || !docAtual.querySelector('select[name="lstNome"]')) return;
                var painel = docAtual.getElementById('painel-simples');
                if (docAtual !== docVigiado || !painel) {
                    docVigiado = docAtual;
                    AF.painel.iniciar(docAtual);
                }
            } catch (e) {
                console.warn('[FPW] Falha ao restaurar painel:', e);
            }
        }

        if (frameCabecalho) {
            frameCabecalho.addEventListener('load', function () {
                setTimeout(garantirPainel, 0);
            });
        }

        setInterval(function () {
            garantirPainel();
        }, 2000);
    }

    carregarTodos().then(function () {
        configurarAmbienteTeste();
        var AF = window.AutomacaoFolha;
        if (AF && AF.core && typeof AF.core.iniciarKeepAlive === 'function') {
            AF.core.iniciarKeepAlive(2);
        }
        esperarCabecalho(function (docC) {
            AF.painel.iniciar(docC);
            vigiarPainel(docC);
        });
    }).catch(function (erro) {
        console.error('[FPW] Falha ao carregar modulos:', erro);
    });

})();
