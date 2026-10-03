'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadMapa() {
    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {}
        }
    };
    const context = { window, console: { log() {} } };
    const utilsSource = readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8');
    const mapaSource = readFileSync(join(__dirname, '..', '20-mapa.js'), 'utf8');
    vm.runInNewContext(utilsSource, context);
    vm.runInNewContext(mapaSource, context);
    return window.AutomacaoFolha.mapa;
}

test('construirMapaFolha groups entries by week and filters outside target month except last week', () => {
    const mapaModule = loadMapa();
    const dataAlvo = new Date(2026, 9, 1); // Outubro 2026. Último dia é 31/10/2026 (semana de 26/10/2026).

    const rawItems = [
        {
            inp: { id: 'inp1' },
            num: '1',
            dataStr: '01/10/2026',
            valor: 'Marcacao irregular',
            cabecalho: '01/10/2026 Quinta-feira'
        },
        {
            inp: { id: 'inp2' },
            num: '2',
            dataStr: '15/09/2026', // Mês anterior, fora do escopo
            valor: 'Marcacao irregular',
            cabecalho: '15/09/2026 Terça-feira'
        },
        {
            inp: { id: 'inp3' },
            num: '3',
            dataStr: '01/11/2026', // Domingo da última semana de outubro (iniciada em 26/10/2026)
            valor: 'Marcacao irregular',
            cabecalho: '01/11/2026 Domingo'
        }
    ];

    const mapa = mapaModule.construirMapaFolha(dataAlvo, rawItems);

    assert.equal(mapa.lista.length, 2);
    assert.equal(mapa.lista[0].dataStr, '01/10/2026');
    assert.equal(mapa.lista[0].foraDoMes, false);
    assert.equal(mapa.lista[1].dataStr, '01/11/2026');
    assert.equal(mapa.lista[1].foraDoMes, true);
    assert.equal(mapa.ultimaSemanaId, '26/10/2026');
    assert.equal(!!mapa.semanas['26/10/2026'], true);
});

test('construirMapaFolha classifies folgas, ausencias, and feriados correctly', () => {
    const mapaModule = loadMapa();
    const dataAlvo = new Date(2026, 9, 1); // Outubro 2026

    const rawItems = [
        {
            inp: { id: 'folga1' },
            num: '10',
            dataStr: '03/10/2026',
            valor: '',
            cabecalho: '03/10/2026 - Folga'
        },
        {
            inp: { id: 'aus1' },
            num: '11',
            dataStr: '05/10/2026',
            valor: 'Ausência de marcação',
            cabecalho: '05/10/2026 - Segunda'
        },
        {
            inp: { id: 'fer1' },
            num: '12',
            dataStr: '12/10/2026',
            valor: '',
            cabecalho: '12/10/2026 - Feriado Nacional'
        }
    ];

    const mapa = mapaModule.construirMapaFolha(dataAlvo, rawItems);

    const semOutubro1 = mapa.semanas['28/09/2026'];
    assert.equal(semOutubro1.folgas.length, 1);
    assert.equal(semOutubro1.folgasVisiveis.length, 1);
    assert.equal(semOutubro1.folgas[0].dataStr, '03/10/2026');

    const semOutubro2 = mapa.semanas['05/10/2026'];
    assert.equal(semOutubro2.ausencias.length, 1);
    assert.equal(semOutubro2.ausenciasMes.length, 1);
    assert.equal(semOutubro2.ausencias[0].dataStr, '05/10/2026');

    const semOutubro3 = mapa.semanas['12/10/2026'];
    assert.equal(semOutubro3.feriados.length, 1);
    assert.equal(semOutubro3.feriadosSemana.length, 1);
    assert.equal(semOutubro3.feriados[0].dataStr, '12/10/2026');
});

test('construirMapaFolha computes folgasOcultas in the last week and feriadosOcultos', () => {
    const mapaModule = loadMapa();
    const dataAlvo = new Date(2024, 0, 1); // Janeiro 2024 (Feriados RJ incluem 01/01 e 20/01)
    // 01/01/2024 é segunda-feira da semana '01/01/2024'
    // 20/01/2024 é sábado da semana '15/01/2024'
    // Último dia é 31/01/2024 (quarta-feira, semana '29/01/2024')

    const rawItems = [
        {
            inp: { id: 'd1' },
            num: '1',
            dataStr: '15/01/2024',
            valor: '',
            cabecalho: '15/01/2024 Segunda'
        },
        {
            inp: { id: 'd2' },
            num: '2',
            dataStr: '31/01/2024',
            valor: '',
            cabecalho: '31/01/2024 Quarta'
        }
    ];

    const mapa = mapaModule.construirMapaFolha(dataAlvo, rawItems);

    // Na semana de 15/01/2024, o dia 20/01/2024 é feriado São Sebastião RJ e não está nos rawItems
    const sem15 = mapa.semanas['15/01/2024'];
    assert.equal(sem15.feriadosOcultos.includes('20/01/2024'), true);

    // Na última semana (29/01/2024), apenas 31/01/2024 está registrado, logo os outros 6 dias entram em folgasOcultas
    const semUltima = mapa.semanas['29/01/2024'];
    assert.equal(semUltima.folgasOcultas.length, 6);
    assert.equal(semUltima.folgasOcultas.includes('31/01/2024'), false);
    assert.equal(semUltima.folgasOcultas.includes('29/01/2024'), true);
});

test('mapearFolhaAtual delegates collected descriptors to construirMapaFolha', () => {
    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {}
        }
    };
    const context = { window, console: { log() {} } };
    const utilsSource = readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8');
    const mapaSource = readFileSync(join(__dirname, '..', '20-mapa.js'), 'utf8');
    vm.runInNewContext(utilsSource, context);
    vm.runInNewContext(mapaSource, context);

    const AF = window.AutomacaoFolha;

    // Simula coleta de dados
    const mockDataAlvo = new Date(2026, 9, 1);
    AF.utils.mesAlvoDaTabela = () => mockDataAlvo;
    AF.mapa.coletarItensFolha = () => [
        {
            inp: { name: 'Irre5', value: 'Ausente' },
            num: '5',
            dataStr: '06/10/2026',
            valor: 'Ausente',
            cabecalho: '06/10/2026'
        }
    ];

    const mapa = AF.mapa.mapearFolhaAtual();
    assert.equal(mapa.alvo, mockDataAlvo);
    assert.equal(mapa.lista.length, 1);
    assert.equal(mapa.lista[0].num, '5');
    assert.equal(mapa.lista[0].dataStr, '06/10/2026');
    assert.equal(mapa.lista[0].semanaId, '05/10/2026');
});
