'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadPlanning() {
    const window = { AutomacaoFolha: { utils: {} } };
    const context = { window, console: { log() {} } };
    const utilsSource = readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8');
    const planningSource = readFileSync(join(__dirname, '..', '35-planejamento.js'), 'utf8');
    vm.runInNewContext(utilsSource, context);
    vm.runInNewContext(planningSource, context);
    return window.AutomacaoFolha.planejamento;
}

function record(dataStr, day, month, year, num) {
    return {
        dataStr,
        dataObj: new Date(year, month - 1, day),
        num: String(num)
    };
}

test('phase 1 planning prioritizes Sunday absence and skips already used dates', () => {
    const planejamento = loadPlanning();
    const mapa = {
        semanas: {
            '28/09/2026': {
                folgas: [record('03/10/2026', 3, 10, 2026, 1)],
                ausencias: [
                    record('02/10/2026', 2, 10, 2026, 2),
                    record('04/10/2026', 4, 10, 2026, 3)
                ]
            }
        }
    };

    const rodada = planejamento.planejarFase1Rodada(mapa, new Set());
    assert.equal(rodada.acao.dataAusencia, '04/10/2026');
    assert.equal(rodada.acao.dataOrigem, '03/10/2026');

    const usada = planejamento.planejarFase1Rodada(mapa, new Set(['03/10/2026']));
    assert.equal(usada.acabou, true);
});

test('phase 1 planning reports an unused folga as trapped when no absence exists', () => {
    const planejamento = loadPlanning();
    const mapa = {
        semanas: {
            '28/09/2026': {
                folgas: [record('03/10/2026', 3, 10, 2026, 1)],
                ausencias: []
            }
        }
    };

    const rodada = planejamento.planejarFase1Rodada(mapa, new Set());
    assert.equal(rodada.presa.dataFolga, '03/10/2026');
    assert.equal(rodada.acao, null);
});

test('phase 2 skips duplicate, used, and attempted visible candidates before hidden dates', () => {
    const planejamento = loadPlanning();
    const mapa = {
        alvo: new Date(2026, 8, 1),
        ultimaSemanaId: '28/09/2026',
        semanas: {
            '28/09/2026': {
                ausenciasMes: [record('30/09/2026', 30, 9, 2026, 4)],
                folgasVisiveis: [
                    record('03/10/2026', 3, 10, 2026, 1),
                    record('03/10/2026', 3, 10, 2026, 1),
                    record('04/10/2026', 4, 10, 2026, 2)
                ],
                folgasOcultas: ['05/10/2026', '05/10/2026', '06/10/2026']
            }
        }
    };
    const tentativas = {
        '30/09/2026|03/10/2026|visivel': true,
        '30/09/2026|04/10/2026|visivel': true
    };

    const rodada = planejamento.planejarFase2Rodada(
        mapa,
        tentativas,
        new Set(['03/10/2026'])
    );
    assert.equal(rodada.tipo, 'oculta');
    assert.equal(rodada.acao.dataOrigem, '05/10/2026');
    assert.equal(rodada.acao.candidatos.length, 2);
});

test('phase 2 prefers the first available visible candidate and reports missing candidates', () => {
    const planejamento = loadPlanning();
    const semana = {
        ausenciasMes: [record('30/09/2026', 30, 9, 2026, 4)],
        folgasVisiveis: [
            record('03/10/2026', 3, 10, 2026, 1),
            record('04/10/2026', 4, 10, 2026, 2)
        ],
        folgasOcultas: ['05/10/2026']
    };
    const mapa = {
        alvo: new Date(2026, 8, 1),
        ultimaSemanaId: '28/09/2026',
        semanas: { '28/09/2026': semana }
    };

    const rodada = planejamento.planejarFase2Rodada(mapa, {}, new Set());
    assert.equal(rodada.tipo, 'visivel');
    assert.equal(rodada.acao.dataOrigem, '03/10/2026');

    const semFolgas = planejamento.planejarFase2Rodada(
        { ...mapa, semanas: { '28/09/2026': { ausenciasMes: [], folgasVisiveis: [], folgasOcultas: [] } } },
        {},
        new Set()
    );
    assert.equal(semFolgas.motivo, 'sem_ausencia_no_mes');

    const semSemana = planejamento.planejarFase2Rodada(
        { ...mapa, semanas: {} },
        {},
        new Set()
    );
    assert.equal(semSemana.motivo, 'sem_ultima_semana');
});

test('phase 3 deduplicates trapped folgas, chooses visible holidays, and retains unresolved records', () => {
    const planejamento = loadPlanning();
    const presa = { fase: 1, semanaId: '28/09/2026', dataFolga: '03/10/2026', numFolga: '8' };
    const mapa = {
        semanas: {
            '28/09/2026': {
                ausenciasMes: [record('30/09/2026', 30, 9, 2026, 4)],
                ausencias: [record('30/09/2026', 30, 9, 2026, 4)],
                feriadosSemana: [
                    record('01/10/2026', 1, 10, 2026, 5),
                    record('02/10/2026', 2, 10, 2026, 6)
                ],
                feriadosOcultos: ['03/10/2026']
            }
        }
    };
    const resultado = planejamento.planejarFase3(mapa, [
        presa,
        { ...presa },
        { fase: 1, semanaId: 'semana-inexistente', dataFolga: '07/10/2026' }
    ]);

    assert.equal(resultado.acoes.length, 1);
    assert.equal(resultado.acoes[0].tipo, 'feriado_visivel');
    assert.equal(resultado.acoes[0].dataOrigem, '01/10/2026');
    assert.equal(resultado.acoes[0].dataAusencia, '30/09/2026');
    assert.equal(resultado.presasFinais.length, 1);
    assert.equal(resultado.presasFinais[0].semanaId, 'semana-inexistente');
});

test('phase 3 uses a hidden holiday and keeps a trapped folga without a destination', () => {
    const planejamento = loadPlanning();
    const semFeriadoVisivel = {
        ausencias: [],
        ausenciasMes: [],
        feriadosSemana: [],
        feriadosOcultos: ['04/10/2026', '05/10/2026']
    };
    const semAusencia = {
        ausencias: [],
        ausenciasMes: [],
        feriadosSemana: [],
        feriadosOcultos: []
    };
    const presaComDestino = { fase: 1, semanaId: 'semana-a', dataFolga: '03/10/2026', numFolga: '8' };
    const presaSemDestino = { fase: 1, semanaId: 'semana-b', dataFolga: '06/10/2026' };
    const resultado = planejamento.planejarFase3({
        semanas: {
            'semana-a': semFeriadoVisivel,
            'semana-b': semAusencia
        }
    }, [presaComDestino, presaSemDestino]);

    assert.equal(resultado.acoes[0].tipo, 'feriado_oculto');
    assert.equal(resultado.acoes[0].dataOrigem, '04/10/2026');
    assert.equal(resultado.acoes[0].candidatos.length, 2);
    assert.equal(resultado.presasFinais.length, 1);
    assert.equal(resultado.presasFinais[0].dataFolga, '06/10/2026');
});

test('phase 3 uses visible holidays and hidden Sundays without weekly absence, but retains all-worked folgas', () => {
    const planejamento = loadPlanning();
    const resultado = planejamento.planejarFase3({
        semanas: {
            '28/09/2026': {
                ausencias: [],
                ausenciasMes: [],
                feriadosSemana: [record('04/10/2026', 4, 10, 2026, 5)],
                feriadosOcultos: [],
                domingosOcultos: []
            },
            '05/10/2026': {
                ausencias: [],
                ausenciasMes: [],
                feriadosSemana: [],
                feriadosOcultos: [],
                domingosOcultos: ['11/10/2026']
            },
            '12/10/2026': {
                ausencias: [],
                ausenciasMes: [],
                feriadosSemana: [],
                feriadosOcultos: [],
                domingosOcultos: []
            }
        }
    }, [
        { fase: 1, semanaId: '28/09/2026', dataFolga: '03/10/2026', numFolga: '8' },
        { fase: 1, semanaId: '05/10/2026', dataFolga: '10/10/2026', numFolga: '9' },
        { fase: 1, semanaId: '12/10/2026', dataFolga: '16/10/2026', numFolga: '10' }
    ]);

    assert.equal(resultado.acoes.length, 2);
    assert.equal(resultado.acoes[0].tipo, 'feriado_visivel');
    assert.equal(resultado.acoes[0].dataOrigem, '04/10/2026');
    assert.equal(resultado.acoes[1].tipo, 'domingo_oculto');
    assert.equal(resultado.acoes[1].dataOrigem, '11/10/2026');
    assert.equal(resultado.presasFinais.length, 1);
    assert.equal(resultado.presasFinais[0].dataFolga, '16/10/2026');
});

test('phase 3 does not select the trapped folga date as its own hidden-Sunday destination', () => {
    const planejamento = loadPlanning();
    const resultado = planejamento.planejarFase3({
        semanas: {
            '05/10/2026': {
                ausencias: [],
                ausenciasMes: [],
                feriadosSemana: [],
                feriadosOcultos: [],
                domingosOcultos: ['11/10/2026']
            }
        }
    }, [
        { fase: 2, semanaId: '05/10/2026', dataFolga: '11/10/2026', numFolga: '9' }
    ]);

    assert.equal(resultado.acoes.length, 0);
    assert.equal(resultado.presasFinais.length, 1);
    assert.equal(resultado.presasFinais[0].dataFolga, '11/10/2026');
});

test('entrypoint loads the pure planning module before the phase executors', () => {
    const entrypoint = readFileSync(join(__dirname, '..', '99-main.user.js'), 'utf8');

    assert.ok(entrypoint.indexOf("'35-planejamento.js'") < entrypoint.indexOf("'40-fases.js'"));
});

test('planning module has no page or write-interaction dependencies', () => {
    const source = readFileSync(join(__dirname, '..', '35-planejamento.js'), 'utf8');

    assert.doesNotMatch(source, /querySelector|window\.top|AF\.popup|btnGravar|btnAprovar|\.click\(/);
});

test('phase executors delegate all three planning decisions to the planning module', () => {
    const source = readFileSync(join(__dirname, '..', '40-fases.js'), 'utf8');

    assert.match(source, /AF\.planejamento\.planejarFase1Rodada\(mapa, datasUsadas\)/);
    assert.match(source, /AF\.planejamento\.planejarFase2Rodada\(mapa, historicoTentativas, datasUsadasFase2\)/);
    assert.match(source, /AF\.planejamento\.planejarFase3\(mapaFinal, presasBase\)/);
    assert.doesNotMatch(source, /AF\.fases\.planejarFase[123]/);
});
