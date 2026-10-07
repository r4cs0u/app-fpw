'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function createAnalysis({ mapa, campos47 = [], lancamentos = [], saldo = '00:00' } = {}) {
    const dates = new Map();
    const hours = new Map();
    const selects = lancamentos.map((entry, index) => {
        const number = String(index + 1);
        if (entry.temData) dates.set(number, { value: entry.dataStr || '' });
        if (entry.horasTexto !== undefined) hours.set(number, { value: entry.horasTexto });
        return {
            id: 'lstNome' + number,
            selectedIndex: 0,
            options: [{ value: entry.codigo }]
        };
    });
    const doc1 = {
        querySelectorAll(selector) {
            if (selector === 'input[type=text]') return campos47;
            if (selector === 'select[id^="lstNome"]') return selects;
            return [];
        },
        querySelector(selector) {
            let match = /^input\[(?:name|id)="Data(\d+)"\]$/.exec(selector);
            if (match) return dates.get(match[1]) || null;
            match = /^input\[name="HorasInf(\d+)"\]$/.exec(selector);
            if (match) return hours.get(match[1]) || null;
            return null;
        }
    };
    const saldoDocument = { getElementById: id => id === 'txtSaldo' ? { value: saldo } : null };
    const window = {
        AutomacaoFolha: { utils: {}, core: {}, mapa: {}, estado: {}, popup: {}, fases: {}, analisar: {}, regras: {} },
        top: { frames: [null, null, { document: saldoDocument }] }
    };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(root, '10-utils.js'), 'utf8'), context);
    const AF = window.AutomacaoFolha;
    vm.runInNewContext(readFileSync(join(root, '37-regras-folha.js'), 'utf8'), context);
    AF.mapa.mapearFolhaAtual = () => mapa || { semanas: {} };
    AF.mapa.obterDataDoInput = input => input.dataStr || null;
    AF.core.getDoc1 = () => doc1;
    AF.utils.mesAlvoDaTabela = () => new Date(2026, 8, 1);
    vm.runInNewContext(readFileSync(join(root, '50-analisar.js'), 'utf8'), context);
    return { AF, window, doc1 };
}

function date(day, month = 9, year = 2026) {
    return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year;
}

test('current folga count uses eligible week destinations and preserves current transition behavior', () => {
    const target = new Date(2026, 8, 1);
    const { AF } = createAnalysis({
        mapa: {
            semanas: {
                absence: {
                    folgas: [{ dataStr: date(2) }],
                    ausencias: [{ dataStr: date(3) }],
                    feriados: [],
                    ausenciasMes: []
                },
                holiday: {
                    folgas: [{ dataStr: date(9) }],
                    ausencias: [],
                    feriados: [{ dataStr: date(10) }],
                    ausenciasMes: []
                },
                noDestination: {
                    folgas: [{ dataStr: date(16) }],
                    ausencias: [],
                    feriados: [],
                    ausenciasMes: []
                },
                transition: {
                    folgas: [{ dataStr: date(31, 8) }],
                    folgasVisiveis: [{ dataStr: date(1), foraDoMes: true }],
                    folgasOcultas: [date(2)],
                    ausencias: [],
                    feriados: [],
                    ausenciasMes: [{ dataStr: date(3) }]
                }
            }
        }
    });

    assert.equal(AF.analisar.contarFolgas(), 3);
});

test('current code 47 collection includes transition-week dates by default and preserves DOM order', () => {
    const { AF } = createAnalysis({
        campos47: [
            { value: '47', dataStr: date(10) },
            { value: '47', dataStr: date(29) },
            { value: '47', dataStr: date(2, 10) },
            { value: '47', dataStr: date(20, 8) },
            { value: '47', dataStr: date(10, 10) },
            { value: ' 47 ', dataStr: date(15) },
            { value: '46', dataStr: date(16) },
            { value: '47', dataStr: 'invalid' }
        ]
    });

    assert.deepEqual(plain(AF.analisar.coletarDiasCod47()), [date(10), date(29), date(2, 10), date(15)]);
    assert.deepEqual(plain(AF.analisar.coletarDiasCod47({ somenteMesAlvo: true })), [date(10), date(29), date(15)]);
});

test('current overtime totals parse codes, date scope, asterisk and optional seconds', () => {
    const { AF } = createAnalysis({
        lancamentos: [
            { codigo: '2', temData: true, dataStr: date(5), horasTexto: '01:30:00' },
            { codigo: '27', temData: true, dataStr: date(6), horasTexto: '*02:15' },
            { codigo: '2', temData: true, dataStr: date(1, 10), horasTexto: '09:00' },
            { codigo: '27', temData: false, horasTexto: '00:45' },
            { codigo: '3', temData: false, horasTexto: '10:00' },
            { codigo: '2', temData: false, horasTexto: 'invalid' },
            { codigo: '2', temData: true, dataStr: 'invalid', horasTexto: '03:00' }
        ]
    });

    assert.deepEqual(plain(AF.analisar.somarHorasExtras()), {
        HE: '01:30',
        HEF: '03:00',
        HEmin: 90,
        HEFmin: 180
    });
});

test('current overtime reader returns zero totals when reading fails', () => {
    const { AF, doc1 } = createAnalysis();
    doc1.querySelectorAll = () => {
        throw new Error('synthetic sheet read failure');
    };

    assert.deepEqual(plain(AF.analisar.somarHorasExtras()), {
        HE: '00:00',
        HEF: '00:00',
        HEmin: 0,
        HEFmin: 0
    });
});

test('current compensation balance parsing preserves positive, negative, invalid and missing behavior', () => {
    for (const [saldo, expected] of [
        ['12:34', '12:34'],
        ['-02:05:00', '-02:05'],
        ['*03:07', '03:07'],
        ['', '00:00'],
        ['not-a-time', '00:00']
    ]) {
        const { AF } = createAnalysis({ saldo });
        assert.equal(AF.analisar.lerSaldoHEC(), expected);
    }

    const { AF, window } = createAnalysis();
    Object.defineProperty(window.top.frames[2], 'document', {
        get() {
            throw new Error('synthetic frame read failure');
        }
    });
    assert.equal(AF.analisar.lerSaldoHEC(), '00:00');
});

test('pure folga rule counts only qualifying folgas in the target month', () => {
    const { AF } = createAnalysis();
    const mapa = {
        semanas: {
            valid: {
                folgas: [{ dataStr: date(2) }],
                ausencias: [{ dataStr: date(3) }],
                ausenciasMes: [],
                feriados: [],
                folgasVisiveis: [],
                folgasOcultas: []
            },
            holiday: {
                folgas: [{ dataStr: date(9) }],
                ausencias: [],
                ausenciasMes: [],
                feriados: [{ dataStr: date(10) }],
                folgasVisiveis: [],
                folgasOcultas: []
            },
            invalid: {
                folgas: [{ dataStr: date(16) }],
                ausencias: [],
                ausenciasMes: [],
                feriados: [],
                folgasVisiveis: [],
                folgasOcultas: []
            }
        }
    };
    assert.equal(AF.regras.contarFolgasAMovimentar(mapa, new Date(2026, 8, 1)), 2);
});

test('pure code 47 rule respects target and transition-week scope without reordering', () => {
    const { AF } = createAnalysis();
    const campos = [
        { value: '47', dataStr: date(10) },
        { value: ' 47 ', dataStr: date(2, 10) },
        { value: '47', dataStr: date(20, 8) },
        { value: '46', dataStr: date(29) }
    ];
    const alvo = new Date(2026, 8, 1);

    assert.deepEqual(plain(AF.regras.selecionarDiasCod47(campos, alvo)), [date(10), date(2, 10)]);
    assert.deepEqual(plain(AF.regras.selecionarDiasCod47(campos, alvo, { somenteMesAlvo: true })), [date(10)]);
});

test('selecionarCamposCod47 returns descriptors with indice, num and dataStr, handling whitespace and invalid dates', () => {
    const { AF } = createAnalysis();
    const campos = [
        { name: 'CodJust12', value: '  47  ', dataStr: date(5) },
        { name: 'CodJust13', value: '47', dataStr: 'data-invalida' },
        { name: 'CodJust14', value: '47', dataStr: null },
        { name: 'CodJust15', value: '48', dataStr: date(10) },
        { name: 'CodJust16', value: '47', dataStr: date(2, 10) }, // semana transição
        { name: 'CodJust17', value: '47', dataStr: date(20, 8) }  // fora
    ];
    const alvo = new Date(2026, 8, 1);

    const selecionados = plain(AF.regras.selecionarCamposCod47(campos, alvo));
    assert.deepEqual(selecionados, [
        { indice: 0, num: '12', dataStr: date(5) },
        { indice: 4, num: '16', dataStr: date(2, 10) }
    ]);

    const somenteMes = plain(AF.regras.selecionarCamposCod47(campos, alvo, { somenteMesAlvo: true }));
    assert.deepEqual(somenteMes, [
        { indice: 0, num: '12', dataStr: date(5) }
    ]);
});

test('analysis cod47 collection matches the pure selection on the same inputs', () => {
    const campos = [
        { value: '47', dataStr: date(5) },
        { value: '47', dataStr: date(25) },
        { value: '47', dataStr: date(2, 10) },
        { value: '47', dataStr: date(15, 10) }
    ];
    const { AF } = createAnalysis({ campos47: campos });
    const alvo = new Date(2026, 8, 1);

    const analiseDates = plain(AF.analisar.coletarDiasCod47());
    const regrasDates = plain(AF.regras.selecionarDiasCod47(campos, alvo));

    assert.deepEqual(analiseDates, [date(5), date(25), date(2, 10)]);
    assert.deepEqual(analiseDates, regrasDates);
});

test('pure overtime rule sums only matching codes and in-scope dated entries', () => {
    const { AF } = createAnalysis();
    const lancamentos = [
        { codigo: '2', temData: true, dataStr: date(5), horasTexto: '01:30:00' },
        { codigo: '27', temData: true, dataStr: date(6), horasTexto: '*02:15' },
        { codigo: '2', temData: true, dataStr: date(1, 10), horasTexto: '09:00' },
        { codigo: '27', temData: false, horasTexto: '00:45' },
        { codigo: '3', temData: false, horasTexto: '10:00' },
        { codigo: '2', temData: false, horasTexto: 'invalid' }
    ];

    assert.deepEqual(plain(AF.regras.somarHorasExtras(lancamentos, new Date(2026, 8, 1))), {
        HE: '01:30',
        HEF: '03:00',
        HEmin: 90,
        HEFmin: 180
    });
});

test('pure compensation balance rule returns normalized values and zero fallback', () => {
    const { AF } = createAnalysis();
    assert.equal(AF.regras.interpretarSaldoHEC('12:34'), '12:34');
    assert.equal(AF.regras.interpretarSaldoHEC('-02:05:00'), '-02:05');
    assert.equal(AF.regras.interpretarSaldoHEC('*03:07'), '03:07');
    assert.equal(AF.regras.interpretarSaldoHEC('invalid'), '00:00');
    assert.equal(AF.regras.interpretarSaldoHEC(''), '00:00');
});
