'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function date(day, month = 9, year = 2026) {
    return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year;
}

function createFase4Environment(options = {}) {
    const events = [];
    const logs = [];
    const radEvents = [];

    const radConfirma = {
        name: 'radConfirma',
        dispatchEvent(ev) {
            radEvents.push(ev.type);
        }
    };

    const doc1 = {
        querySelectorAll(selector) {
            if (selector === 'input[type=text]') return options.inputs || [];
            return [];
        },
        querySelector(selector) {
            if (selector === '[name="radConfirma"]') return radConfirma;
            return null;
        }
    };

    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {
                getDoc1: () => doc1,
                exigirEstrutura: stage => options.exigirEstruturaResult !== undefined ? options.exigirEstruturaResult : true,
                log: (msg, cor) => logs.push({ msg, cor })
            },
            mapa: {
                obterDataDoInput: inp => inp.dataStr || null
            },
            log: {
                evento: (tipo, dados, msg, cor) => events.push({ tipo, dados, msg, cor })
            },
            estado: {
                cod47DiasFolhaAtual: []
            },
            fases: {},
            analisar: {},
            regras: {}
        }
    };

    const context = {
        window,
        console: { log() {} },
        Event: class { constructor(type, init) { this.type = type; } },
        MouseEvent: class { constructor(type, init) { this.type = type; } }
    };

    vm.runInNewContext(readFileSync(join(root, '10-utils.js'), 'utf8'), context);
    const AF = window.AutomacaoFolha;
    AF.utils.mesAlvoDaTabela = () => options.alvo || new Date(2026, 8, 1); // Setembro 2026

    vm.runInNewContext(readFileSync(join(root, '37-regras-folha.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(root, '40-fases.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(root, '50-analisar.js'), 'utf8'), context);

    return { AF, doc1, events, logs, radEvents };
}

function makeInput(num, value, dataStr, { hasTr = true, hasSelect = true, hasOpt48 = true, codJust = '' } = {}) {
    const dispatched = [];
    const select = hasSelect ? {
        name: 'lstNome' + num,
        value: '47',
        options: hasOpt48 ? [{ value: '47' }, { value: '48' }] : [{ value: '47' }],
        dispatchEvent(ev) { dispatched.push(ev.type); }
    } : null;

    const codJustInput = codJust ? { value: codJust } : null;

    const tr = hasTr ? {
        querySelector(sel) {
            if (sel === 'select[name="lstNome' + num + '"]') return select;
            return null;
        }
    } : null;

    const inp = {
        name: 'TxtCod' + num,
        value,
        dataStr,
        dispatched,
        select,
        closest(sel) {
            if (sel === 'tr') return tr;
            return null;
        }
    };

    return { inp, select, dispatched, tr };
}

test('processarFase4 converts 47 to 48 in target month and transition week, dispatches events and returns nsMarcados', () => {
    // Setembro 2026 termina em 30/09 (quarta-feira). Semana de transição vai até domingo 04/10/2026.
    const f1 = makeInput('1', '47', date(10));
    const f2 = makeInput('2', '47', date(2, 10)); // na semana de transição
    const fOut = makeInput('3', '47', date(15, 10)); // fora da semana de transição
    const fNot47 = makeInput('4', '01', date(12));

    const env = createFase4Environment({ inputs: [f1.inp, f2.inp, fOut.inp, fNot47.inp] });
    const execucao = { isActive: () => true };

    const marcados = env.AF.fases.processarFase4(execucao);

    assert.deepEqual(plain(marcados), ['1', '2']);
    assert.equal(f1.select.value, '48');
    assert.equal(f2.select.value, '48');
    assert.deepEqual(plain(env.AF.estado.cod47DiasFolhaAtual), [date(10), date(2, 10)]);

    // Eventos disparados no select
    assert.ok(f1.dispatched.includes('change'));
    assert.ok(f1.dispatched.includes('input'));
    assert.ok(f1.dispatched.includes('blur'));

    // Eventos disparados no radConfirma
    assert.ok(env.radEvents.includes('change'));

    // Log evento cod47
    const cod47Events = env.events.filter(e => e.tipo === 'cod47');
    assert.equal(cod47Events.length, 2);
    assert.equal(cod47Events[0].dados.data, date(10));
    assert.equal(cod47Events[0].dados.para, '48');
    assert.equal(cod47Events[1].dados.data, date(2, 10));
});

test('processarFase4 skips and logs warning when tr, select, or option 48 is missing', () => {
    const noTr = makeInput('1', '47', date(10), { hasTr: false });
    const noSelect = makeInput('2', '47', date(11), { hasSelect: false });
    const noOpt48 = makeInput('3', '47', date(12), { hasOpt48: false });
    const ok = makeInput('4', '47', date(13));

    const env = createFase4Environment({ inputs: [noTr.inp, noSelect.inp, noOpt48.inp, ok.inp] });
    const marcados = env.AF.fases.processarFase4({ isActive: () => true });

    assert.deepEqual(plain(marcados), ['4']);
    assert.ok(env.logs.some(l => l.msg.includes('select nao achado para')));
    assert.ok(env.logs.some(l => l.msg.includes('opcao 48 nao existe para')));
});

test('processarFase4 stops early if execucao becomes inactive during loop', () => {
    const f1 = makeInput('1', '47', date(10));
    const f2 = makeInput('2', '47', date(11));

    let count = 0;
    const execucao = {
        isActive: () => {
            count++;
            return count <= 1; // ativo apenas no primeiro
        }
    };

    const env = createFase4Environment({ inputs: [f1.inp, f2.inp] });
    const marcados = env.AF.fases.processarFase4(execucao);

    assert.deepEqual(plain(marcados), ['1']);
    assert.equal(f1.select.value, '48');
    assert.equal(f2.select.value, '47');
});

test('processarFase4 returns empty array if exigirEstrutura fails', () => {
    const f1 = makeInput('1', '47', date(10));
    const env = createFase4Environment({ inputs: [f1.inp], exigirEstruturaResult: false });
    const marcados = env.AF.fases.processarFase4({ isActive: () => true });

    assert.deepEqual(plain(marcados), []);
    assert.equal(f1.select.value, '47');
});

test('AF.analisar.coletarDiasCod47 and AF.fases.processarFase4 select the exact same dates in the same order', () => {
    const inputs = [
        makeInput('1', '47', date(5)).inp,
        makeInput('2', '02', date(8)).inp,
        makeInput('3', '47', date(25)).inp,
        makeInput('4', '47', date(2, 10)).inp, // semana de transição
        makeInput('5', '47', date(15, 10)).inp, // fora
        makeInput('6', '47', date(30, 8)).inp  // mês anterior
    ];

    const env = createFase4Environment({ inputs });

    const analiseDates = plain(env.AF.analisar.coletarDiasCod47());
    env.AF.fases.processarFase4({ isActive: () => true });
    const fase4Dates = plain(env.AF.estado.cod47DiasFolhaAtual);

    assert.deepEqual(analiseDates, [date(5), date(25), date(2, 10)]);
    assert.deepEqual(fase4Dates, analiseDates);
});
