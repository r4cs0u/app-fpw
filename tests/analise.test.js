'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const plain = value => JSON.parse(JSON.stringify(value));

function createStorage() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); }
    };
}

function load(files) {
    const window = {
        AutomacaoFolha: {
            utils: {}, core: {}, mapa: {}, estado: {}, popup: {}, fases: {}, analisar: {},
            planejamento: {}, relatorios: {}, sons: { tocar() {} }
        },
        sessionStorage: createStorage()
    };
    const context = { window, console: { log() {} }, Event: class {}, MouseEvent: class {} };
    for (const file of files) {
        vm.runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), context);
    }
    const AF = window.AutomacaoFolha;
    AF.core.log = (msg, cor, opcoes) => AF.log.registrar(msg, cor, opcoes);
    AF.core.norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return AF;
}

const ALL = ['05-log.js', '10-utils.js', '35-planejamento.js', '37-regras-folha.js', '20-mapa.js', '25-detector.js', '27-modelo-relatorio.js', '40-fases.js', '50-analisar.js', '60-relatorios.js'];

function dd(dia, mes = 9) {
    return String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/2026';
}

function field(value, extra = {}) {
    return Object.assign({ value }, extra);
}

// Documento simulado: linhas de marcação e campos de código 47.
function createSheet(rows, cod47 = []) {
    const irres = [];
    rows.forEach((row, i) => {
        const n = String(i + 1);
        const campos = {
            ['Marc1' + n]: field(row.marc1),
            ['Marc2' + n]: field(row.marc2),
            ['CodJust' + n]: field('')
        };
        const tr = { querySelector: sel => campos[/name="([^"]+)"/.exec(sel)[1]] || null };
        irres.push({
            name: 'Irre' + n,
            value: row.irre === undefined ? ' ' : row.irre,
            closest: () => tr,
            cabecalho: row.cabecalho || (dd(row.dia, row.mes) + ' Qua'),
            data: dd(row.dia, row.mes)
        });
    });
    const codInputs = cod47.map(c => ({ value: '47', data: dd(c.dia, c.mes), cabecalho: dd(c.dia, c.mes) }));
    return {
        querySelectorAll(sel) {
            if (sel === 'input[name^="Irre"]') return irres;
            if (sel === 'input[type=text]') return codInputs;
            return [];
        },
        querySelector: () => null
    };
}

function wireSheet(AF, doc) {
    AF.core.getDoc1 = () => doc;
    AF.core.paginaVaziaAgora = () => false;
    AF.mapa.obterCabecalhoDoDia = inp => inp.cabecalho;
    AF.mapa.obterDataDoInput = inp => inp.data;
}

const SHEET = [
    { dia: 2, marc1: '06:00 ', marc2: '18:15*' },
    { dia: 3, marc1: '06:00 ', marc2: '18:40 ' },
    { dia: 4, marc1: '06:00 ', marc2: '18:15*' },
    { dia: 5, marc1: '08:00 ', marc2: '', irre: 's/marc de entrada/sa\u00edda', cabecalho: dd(5) + ' Sab [Interjornada]' },
    { dia: 6, marc1: '06:00 ', marc2: '18:15*' },
    { dia: 7, marc1: '', marc2: '', irre: 'Ausencia de Marcacao' },
    { dia: 1, mes: 10, marc1: '', marc2: '', irre: 's/marc de entrada/sa\u00edda' }
];

test('Analysis and Adjustment read the same counts from the same sheet', () => {
    const AF = load(ALL);
    wireSheet(AF, createSheet(SHEET));
    AF.analisar.contarFolgas = () => 0;
    AF.analisar.somarHorasExtras = () => ({ HE: '00:00', HEF: '00:00', HEmin: 0, HEFmin: 0 });
    AF.analisar.lerSaldoHEC = () => '00:00';

    const analise = AF.analisar.analisarFolhaAtual();
    const ajuste = AF.fases.analisarFolha();

    assert.equal(analise.irregs, 1);
    assert.equal(analise.interj, 1);
    assert.equal(analise.britanica, 3);
    assert.equal(analise.irregs, ajuste.irregs);
    assert.equal(analise.interj, ajuste.interj);
    assert.equal(analise.britanica, ajuste.britanica);
    assert.equal(analise.naoPreenchida.flag, ajuste.naoPreenchida.flag);
    assert.deepEqual(plain(analise.dias), plain(ajuste.dias));
});

test('analisarFolhaAtual keeps its legacy fields and exposes the new ones', () => {
    const AF = load(ALL);
    wireSheet(AF, createSheet(SHEET, [{ dia: 8 }]));
    AF.analisar.contarFolgas = () => 2;
    AF.analisar.somarHorasExtras = () => ({ HE: '01:00', HEF: '00:00', HEmin: 60, HEFmin: 0 });
    AF.analisar.lerSaldoHEC = () => '-02:00';

    const r = AF.analisar.analisarFolhaAtual();
    for (const campo of ['vazia', 'folgas', 'irregs', 'interj', 'cod47', 'HE', 'HEF', 'HEC', 'HEmin', 'HEFmin']) {
        assert.ok(campo in r, 'missing ' + campo);
    }
    assert.equal(r.folgas, 2);
    assert.equal(r.cod47, 1);
    assert.deepEqual(plain(r.cod47Dias), [dd(8)]);
    assert.equal(r.HEC, '-02:00');
    assert.ok('britanica' in r && 'naoPreenchida' in r && 'dias' in r);
});

test('empty page yields zeroed legacy fields', () => {
    const AF = load(ALL);
    AF.core.paginaVaziaAgora = () => true;
    const r = AF.analisar.analisarFolhaAtual();
    assert.equal(r.vazia, true);
    assert.equal(r.irregs, 0);
    assert.equal(r.britanica, 0);
});

test('cod 47 days: includes transition week by default and month only when requested', () => {
    const AF = load(ALL);
    // Alvo setembro/2026; semana de transição do último dia (30/09) começa em 28/09 e vai a 04/10.
    wireSheet(AF, createSheet(SHEET.slice(0, 2), [
        { dia: 10 }, { dia: 29 }, { dia: 2, mes: 10 }, { dia: 20, mes: 8 }, { dia: 10, mes: 10 }
    ]));
    // Por padrão (D4/2.1), inclui a semana de transição
    assert.deepEqual(plain(AF.analisar.coletarDiasCod47()), [dd(10), dd(29), dd(2, 10)]);
    assert.equal(AF.analisar.contarCod47(), 3);
    // Com somenteMesAlvo: true restringe estritamente ao mês
    assert.deepEqual(plain(AF.analisar.coletarDiasCod47({ somenteMesAlvo: true })), [dd(10), dd(29)]);
});

function reportAF() {
    const AF = load(['05-log.js', '10-utils.js', '60-relatorios.js']);
    AF.estado.logBuffer = [];
    AF.core.getDocC = () => ({ getElementById: () => null });
    return AF;
}

test('analysis report keeps the current table fields and carries the detection data', () => {
    const AF = reportAF();
    const dias = { semES: [{ data: dd(5) }], interj: [], britanica: [] };
    const lista = [
        { nome: 'ANA', lido: true, folgas: 5, irregs: 1, interj: 0, cod47: 2, HE: '01:00', HEF: '00:00', HEC: '00:30',
            britanica: 3, naoPreenchida: { flag: true, pctNaoPreenchida: 73 }, dias },
        { nome: 'BIA', lido: false, folgas: null, irregs: null, interj: null, cod47: null, HE: null, HEF: null, HEC: null }
    ];
    const stats = { totalFolhas: 1, vazias: 0, folgasMoviveis: 5, irregs: 1, interj: 0, cod47: 2, HEmin: 60, HEFmin: 0 };

    AF.relatorios.gerarAnalise(stats, lista, 'Setembro 2026', 5000, false);

    const linhas = AF.estado.relatorio.split('\n');
    assert.ok(linhas.includes('ANA\t5\t2\t1\t0\t01:00\t00:00\t00:30'));
    assert.equal(AF.estado.relatorioLista.length, 2);
    const ana = AF.estado.relatorioLista.find(x => x.nome === 'ANA');
    assert.equal(ana.irregs, 1);
    assert.equal(ana.britanica, 3);
    assert.equal(ana.naoPreenchida.flag, true);
    assert.equal(ana.dias.semES[0].data, dd(5));
    const bia = AF.estado.relatorioLista.find(x => x.nome === 'BIA');
    assert.equal(bia.britanica == null, true);
});

test('adjustment report keeps the current table fields and carries the detection data', () => {
    const AF = reportAF();
    const relLista = [{
        nome: 'ANA', lido: true, pulada: false, folgasAlteradas: 4, folgasSemAlteracao: 1, linhas47: 2,
        irregs: 3, interj: 1, HE: '00:00', HEF: '00:00', HEC: '00:00',
        britanica: 2, naoPreenchida: null, dias: { semES: [], interj: [], britanica: [] }
    }];
    const relStats = { totalFolhas: 1, semMarcacoes: 0, folgasAlteradas: 4, folgasNaoAlteradas: 1, irregsRestantes: 3, interjRestantes: 1, linhas47: 2 };

    AF.relatorios.gerarFolgas(relStats, relLista, 3000, false, null);

    assert.ok(AF.estado.relatorio.split('\n').some(l => l.startsWith('ANA\t4\t2\t1\t3\t1\t')));
    const ana = AF.estado.relatorioLista[0];
    assert.equal(ana.folgas, 4);
    assert.equal(ana.presas, 1);
    assert.equal(ana.britanica, 2);
    assert.ok('dias' in ana && 'naoPreenchida' in ana);
});

test('the report log is built from the current execution events grouped by employee', () => {
    const AF = reportAF();
    AF.log.iniciarExecucao('analise');
    AF.log.definirFuncionario('ANA');
    AF.core.log('! ANA | Irreg:1', '#facc15');
    AF.log.encerrarExecucao('concluida');
    const exec2 = AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('BIA');
    AF.core.log('OK BIA', '#6b7280');

    AF.relatorios.gerarAnalise(
        { totalFolhas: 0, vazias: 0, folgasMoviveis: 0, irregs: 0, interj: 0, cod47: 0, HEmin: 0, HEFmin: 0 },
        [], 'Setembro 2026', 1000, false
    );

    const log = AF.estado.relatorioLog;
    assert.ok(log.every(item => item.func === '' || item.func === 'BIA'));
    assert.ok(log.some(item => item.msg === 'OK BIA'));
    assert.ok(!log.some(item => item.msg === '! ANA | Irreg:1'));
    assert.equal(AF.log.execucaoAtual().id, exec2);
});

test('analysis event records counts and days for every category, including a clean sheet', () => {
    const AF = load(ALL);
    AF.log.iniciarExecucao('analise');
    AF.log.definirFuncionario('ANA');
    AF.analisar.registrarEventoAnalise('ANA', {
        vazia: false, folgas: 5, cod47: 2, cod47Dias: [dd(8), dd(9)], irregs: 1, interj: 1, britanica: 3,
        naoPreenchida: { avaliada: true, flag: true, pctNaoPreenchida: 73, criterios: ['fracao'], visiveis: 28, preenchidos: 7 },
        dias: { semES: [{ data: dd(5) }], interj: [{ data: dd(6) }], britanica: [{ data: dd(2) }, { data: dd(10) }, { data: dd(15) }] },
        HE: '01:00', HEF: '00:00', HEC: '-00:30'
    });
    AF.log.definirFuncionario('BIA');
    AF.analisar.registrarEventoAnalise('BIA', {
        vazia: false, folgas: 0, cod47: 0, cod47Dias: [], irregs: 0, interj: 0, britanica: 0,
        naoPreenchida: { avaliada: true, flag: false, pctNaoPreenchida: 10, criterios: [], visiveis: 20, preenchidos: 18 },
        dias: { semES: [], interj: [], britanica: [] }, HE: '00:00', HEF: '00:00', HEC: '00:00'
    });

    const texto = AF.log.texto({ func: 'ANA' });
    assert.match(texto, /folgasAMovimentar: 5/);
    assert.match(texto, /dias: 02\/09\/2026, 10\/09\/2026, 15\/09\/2026/);
    assert.match(texto, /pctNaoPreenchida: 73/);
    assert.match(texto, /saldoHEC70: -00:30/);
    const limpa = AF.log.texto({ func: 'BIA' });
    assert.match(limpa, /sinalizada: false/);
    assert.match(limpa, /semEntradaSaida:\n\s+total: 0/);
});
