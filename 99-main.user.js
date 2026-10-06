// ==UserScript==
// @name         app-fpw
// @namespace    http://tampermonkey.net/
// @version      9.9-test
// @match        https://myway.g.globo/WebPonto/just_user/justuser.asp*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @downloadURL https://raw.githubusercontent.com/r4cs0u/app-fpw/test/99-main.user.js
// @updateURL   https://raw.githubusercontent.com/r4cs0u/app-fpw/test/99-main.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var BASE = 'https://raw.githubusercontent.com/r4cs0u/app-fpw/test/';
    var MODULOS = [
        '00-core.js',
        '05-log.js',
        '10-utils.js',
        '35-planejamento.js',
        '20-mapa.js',
        '25-detector.js',
        '30-popup.js',
        '40-fases.js',
        '50-analisar.js',
        '60-relatorios.js',
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
        AF.versao = '9.9-test';
        AF.meta = AF.meta || {};
        AF.meta.nome = 'app-fpw';
        AF.meta.ambiente = 'test';
        AF.meta.versao = '9.9-test';
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
