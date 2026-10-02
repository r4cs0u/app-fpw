(function () {
    'use strict';

    var AF = window.AutomacaoFolha = window.AutomacaoFolha || {
        estado: {},
        core: {},
        utils: {},
        mapa: {},
        popup: {},
        fases: {}
    };

    AF.ambiente = AF.ambiente || 'test';
    AF.versao = AF.versao || '9.5-test';
    AF.meta = AF.meta || {};
    AF.meta.nome = AF.meta.nome || 'app-fpw';
    AF.meta.ambiente = AF.meta.ambiente || 'test';
    AF.meta.versao = AF.meta.versao || '9.5-test';

    AF.test = AF.test || {};
    AF.test.meta = AF.meta;
    AF.test.branch = 'test';
    AF.test.repo = 'r4cs0u/app-fpw';
    AF.test.baseUrl = 'https://raw.githubusercontent.com/r4cs0u/app-fpw/test/';

    AF.test.configurar = function () {
        AF.ambiente = 'test';
        AF.versao = '9.5-test';
        AF.meta.nome = 'app-fpw';
        AF.meta.ambiente = 'test';
        AF.meta.versao = '9.5-test';
        AF.test.branch = 'test';
        AF.test.repo = 'r4cs0u/app-fpw';
        AF.test.baseUrl = 'https://raw.githubusercontent.com/r4cs0u/app-fpw/test/';
        AF.test.meta = AF.meta;
        return AF.meta;
    };

    AF.test.resumo = function () {
        return {
            nome: AF.meta.nome,
            ambiente: AF.meta.ambiente,
            versao: AF.meta.versao,
            branch: AF.test.branch,
            repo: AF.test.repo,
            baseUrl: AF.test.baseUrl
        };
    };

    console.info('[FPW][test] ambiente experimental inicializado:', AF.test.resumo());
})();
