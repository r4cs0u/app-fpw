// ==UserScript==
// @name         Automacao Folha de Ponto
// @namespace    http://tampermonkey.net/
// @version      9.2
// @match        https://myway.g.globo/WebPonto/just_user/justuser.asp*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var BASE = 'https://raw.githubusercontent.com/r4cs0u/app-fpw/main/';
    var MODULOS = [
        '00-core.js',
        '10-utils.js',
        '20-mapa.js',
        '30-popup.js',
        '40-fases.js',
        '50-analisar.js',
        '60-relatorios.js',
        '70-sons.js',
        '80-painel.js'
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

    carregarTodos().then(function () {
        var AF = window.AutomacaoFolha;
        esperarCabecalho(function (docC) {
            AF.painel.iniciar(docC);
        });
    }).catch(function (erro) {
        console.error('[FPW] Falha ao carregar modulos:', erro);
    });

})();
