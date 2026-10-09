'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadDetector(mapaOverrides = {}) {
    const window = { AutomacaoFolha: { utils: {}, core: {}, mapa: mapaOverrides } };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(__dirname, '..', '25-detector.js'), 'utf8'), context);
    return window.AutomacaoFolha;
}

const AF = loadDetector();
const detector = AF.detector;
const SETEMBRO = new Date(2026, 8, 1);
const plain = value => JSON.parse(JSON.stringify(value));

function dd(dia, mes = 9) {
    return String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/2026';
}

function linha(dia, marc1, marc2, irre = ' ', extra = {}) {
    return Object.assign({
        n: String(Math.random()),
        dataStr: dd(dia, extra.mes || 9),
        cabecalho: extra.cabecalho || (dd(dia, extra.mes || 9) + ' Qua Horario: 05:49 as 17:49'),
        marc1, marc2, irre, codJust: ''
    }, extra.campos || {});
}

test('parseMarcacao identifies hour and origin from the suffix', () => {
    assert.deepEqual(plain(detector.parseMarcacao('05:49 ')), { hora: '05:49', minutos: '49', origem: 'relogio' });
    assert.equal(detector.parseMarcacao('18:02*').origem, 'manual');
    assert.equal(detector.parseMarcacao('06:00M').origem, 'mobile');
    assert.equal(detector.parseMarcacao('06:00W').origem, 'web');
    assert.equal(detector.parseMarcacao('06:00 ').origem, 'relogio');
    assert.equal(detector.parseMarcacao('6:05').hora, '06:05');
    assert.equal(detector.parseMarcacao(''), null);
    assert.equal(detector.parseMarcacao(null), null);
});

test('entradaSaidaDoDia: single line', () => {
    const r = detector.entradaSaidaDoDia([linha(2, '05:49 ', '17:49')]);
    assert.equal(r.entrada.hora, '05:49');
    assert.equal(r.saida.hora, '17:49');
    assert.equal(r.entrada.origem, 'relogio');
});

test('entradaSaidaDoDia: two chained lines ignore the repeated boundary', () => {
    const r = detector.entradaSaidaDoDia([
        linha(2, '05:49 ', '17:49'),
        linha(2, '17:49', '18:13 ')
    ]);
    assert.equal(r.entrada.hora, '05:49');
    assert.equal(r.saida.hora, '18:13');
});

test('entradaSaidaDoDia: orphan last line without right field keeps the previous exit', () => {
    const r = detector.entradaSaidaDoDia([
        linha(17, '22:36*', '04:05'),
        linha(17, '04:05', '05:53 '),
        linha(17, '23:59*', '')
    ]);
    assert.equal(r.entrada.hora, '22:36');
    assert.equal(r.entrada.origem, 'manual');
    assert.equal(r.saida.hora, '05:53');
    assert.equal(r.saida.origem, 'relogio');
});

test('entradaSaidaDoDia: four chained lines', () => {
    const r = detector.entradaSaidaDoDia([
        linha(5, '08:06*', '10:45'),
        linha(5, '10:45', '14:21'),
        linha(5, '14:21', '15:42'),
        linha(5, '15:42', '00:05 ')
    ]);
    assert.equal(r.entrada.hora, '08:06');
    assert.equal(r.entrada.origem, 'manual');
    assert.equal(r.saida.hora, '00:05');
    assert.equal(r.saida.origem, 'relogio');
});

test('entradaSaidaDoDia: independent final line with both marks defines the exit', () => {
    const r = detector.entradaSaidaDoDia([
        linha(4, '00:07 ', '05:41'),
        linha(4, '05:41', '08:16 '),
        linha(4, '23:38 ', '23:45*')
    ]);
    assert.equal(r.entrada.hora, '00:07');
    assert.equal(r.entrada.origem, 'relogio');
    assert.equal(r.saida.hora, '23:45');
    assert.equal(r.saida.origem, 'manual');
});

test('entradaSaidaDoDia: day without marks', () => {
    const r = detector.entradaSaidaDoDia([linha(6, '', '', 'Ausencia de Marcacao')]);
    assert.equal(r.entrada, null);
    assert.equal(r.saida, null);
});

test('Sem Entrada/Saida counts each irregularity line with its date', () => {
    const r = detector.detectarFolha([
        linha(8, '23:50*', '', 's/marc de entrada/sa\u00edda'),
        linha(9, '06:06*', '', 'Hora Extra Irregular'),
        linha(10, '08:00 ', '17:00 ', 'Marcacao Irregular'),
        linha(11, '08:00 ', '17:00 ', 'Hora Extra'),
        linha(12, '', '', 'Ausencia de Marcacao'),
        linha(13, '08:00 ', '09:00 ', 'Sa\u00edda Antecipada')
    ], SETEMBRO);
    assert.equal(r.contagens.semES, 3);
    assert.deepEqual(plain(r.dias.semES.map(x => x.data)), [dd(8), dd(9), dd(10)]);
});

test('Sem Entrada/Saida counts two irregularity lines on the same day', () => {
    const r = detector.detectarFolha([
        linha(17, '22:36*', '04:05'),
        linha(17, '04:05', '05:53 ', 'Hora Extra'),
        linha(17, '23:59*', '', 'Hora Extra Irregular'),
        linha(17, '', '', 's/marc de entrada/sa\u00edda')
    ], SETEMBRO);
    assert.equal(r.contagens.semES, 2);
});

test('rows outside the target month are never counted', () => {
    const r = detector.detectarFolha([
        linha(1, '18:01 ', '', 's/marc de entrada/sa\u00edda', { mes: 10 }),
        linha(1, '06:00*', '18:00*', ' ', { mes: 10 })
    ], SETEMBRO);
    assert.equal(r.contagens.semES, 0);
    assert.equal(r.naoPreenchida.visiveis, 0);
    assert.equal(r.naoPreenchida.avaliada, false);
});

test('transition-week rows of the next month do not change any irregularity or the unfilled percentage', () => {
    const base = [
        ...diasSemana(1, 28, d => d % 4 === 0),
        linha(10, '08:00 ', '', 's/marc de entrada/sa\u00edda'),
        linha(11, '06:00*', '18:00*', ' ', { cabecalho: dd(11) + ' Qui [Interjornada]' }),
        linha(12, '06:00*', '18:00*'), linha(13, '06:00*', '18:00*'), linha(14, '06:00*', '18:00*')
    ];
    const transicao = [
        linha(1, '', '', 's/marc de entrada/sa\u00edda', { mes: 10 }),
        linha(2, '', '', 'Ausencia de Marcacao', { mes: 10 }),
        linha(3, '', '', 'Ausencia de Marcacao', { mes: 10, cabecalho: dd(3, 10) + ' Sex [Interjornada]' }),
        linha(4, '06:00*', '18:00*', ' ', { mes: 10 }),
        linha(5, '06:00*', '18:00*', ' ', { mes: 10 }),
        linha(6, '06:00*', '18:00*', ' ', { mes: 10 })
    ];

    const soMes = detector.detectarFolha(base, SETEMBRO);
    const comTransicao = detector.detectarFolha(base.concat(transicao), SETEMBRO);

    assert.deepEqual(plain(comTransicao.contagens), plain(soMes.contagens));
    assert.deepEqual(plain(comTransicao.dias), plain(soMes.dias));
    assert.deepEqual(plain(comTransicao.naoPreenchida), plain(soMes.naoPreenchida));
    assert.equal(comTransicao.naoPreenchida.visiveis, 28);
});

test('Interjornada is read from the day heading, once per day', () => {
    const cab = dd(5) + ' Sab Horario: 08:06 as 14:21 157/166 [Interjornada]';
    const r = detector.detectarFolha([
        linha(5, '08:06*', '10:45', 'Hora Extra', { cabecalho: cab }),
        linha(5, '10:45', '14:21', ' ', { cabecalho: cab }),
        linha(5, '14:21', '15:42', 'Hora Extra', { cabecalho: cab }),
        linha(5, '15:42', '00:05 ', 'Hora Extra', { cabecalho: cab })
    ], SETEMBRO);
    assert.equal(r.contagens.interj, 1);
    assert.deepEqual(plain(r.dias.interj), [{ data: dd(5) }]);
});

test('the word interjornada in a row text or justification does not count', () => {
    const r = detector.detectarFolha([
        linha(7, '08:00 ', '17:00 ', 'Hora Extra', {
            campos: { codJust: '40', texto: 'Hora extra por Interjornada' }
        })
    ], SETEMBRO);
    assert.equal(r.contagens.interj, 0);
});

test('Interjornada in a heading outside the target month is ignored', () => {
    const r = detector.detectarFolha([
        linha(2, '08:00 ', '17:00 ', ' ', { mes: 10, cabecalho: dd(2, 10) + ' Sex [Interjornada]' })
    ], SETEMBRO);
    assert.equal(r.contagens.interj, 0);
});

function saidasManuais(minutosPorDia) {
    return minutosPorDia.map(([dia, min]) => linha(dia, '06:00 ', '18:' + min + '*'));
}

test('British marking: three manual exits with equal minutes among other values', () => {
    const r = detector.detectarFolha(saidasManuais([
        [2, '15'], [10, '15'], [15, '15'], [23, '12'], [25, '15'], [26, '15'], [27, '02'], [30, '15']
    ]), SETEMBRO);
    assert.equal(r.contagens.britanica, 3);
    assert.deepEqual(plain(r.dias.britanica.map(x => x.data)), [dd(2), dd(10), dd(15)]);
    assert.ok(r.dias.britanica.every(x => x.campo === 'saida'));
});

test('British marking: entries and exits are independent sequences', () => {
    const linhas = [
        linha(1, '06:10*', '18:20*'),
        linha(2, '06:10*', '18:20*'),
        linha(3, '07:30*', '19:40*'),
        linha(4, '05:55*', '17:05*')
    ];
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.contagens.britanica, 0);
});

test('British marking: a non-manual mark does not break a sequence', () => {
    const r = detector.detectarFolha([
        linha(2, '06:00 ', '18:15*'),
        linha(3, '06:00 ', '18:47 '),
        linha(4, '06:00 ', '18:15*'),
        linha(5, '06:00 ', '18:30'),
        linha(6, '06:00 ', '18:15*')
    ], SETEMBRO);
    assert.equal(r.contagens.britanica, 3);
});

test('British marking: a five-day sequence counts five', () => {
    const r = detector.detectarFolha([1, 2, 3, 4, 5].map(d => linha(d, '0' + d + ':20*', '18:00 ')), SETEMBRO);
    assert.equal(r.contagens.britanica, 5);
    assert.equal(r.britanicaSequencias.length, 1);
});

test('British marking: two sequences of three count six', () => {
    const r = detector.detectarFolha([
        linha(1, '06:10*', '18:00 '), linha(2, '07:10*', '18:00 '), linha(3, '08:10*', '18:00 '),
        linha(4, '06:25*', '18:00 '),
        linha(5, '06:40*', '18:00 '), linha(6, '07:40*', '18:00 '), linha(7, '08:40*', '18:00 ')
    ], SETEMBRO);
    assert.equal(r.contagens.britanica, 6);
    assert.equal(r.britanicaSequencias.length, 2);
});

test('British marking: different minutes end the sequence', () => {
    const r = detector.detectarFolha([
        linha(1, '06:01*', '18:00 '), linha(2, '06:01*', '18:00 '),
        linha(3, '06:06*', '18:00 '), linha(4, '06:01*', '18:00 ')
    ], SETEMBRO);
    assert.equal(r.contagens.britanica, 0);
});

test('British marking: marks from clock, mobile and web are ignored', () => {
    const r = detector.detectarFolha([
        linha(1, '06:00 ', '18:00 '), linha(2, '06:00M', '18:00W'),
        linha(3, '06:00 ', '18:00 '), linha(4, '06:00W', '18:00M')
    ], SETEMBRO);
    assert.equal(r.contagens.britanica, 0);
});

function diasSemana(inicio, qtd, preenchidos) {
    const out = [];
    for (let d = inicio; d < inicio + qtd; d++) {
        out.push(preenchidos(d) ? linha(d, '08:00 ', '17:00 ') : linha(d, '', '', 'Ausencia de Marcacao'));
    }
    return out;
}

test('unfilled sheet: few filled days of the visible ones', () => {
    const linhas = diasSemana(1, 28, d => d % 4 === 0 && d <= 28 && d / 4 <= 7);
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.visiveis, 28);
    assert.equal(r.naoPreenchida.preenchidos, 7);
    assert.equal(r.naoPreenchida.flag, true);
    assert.ok(r.naoPreenchida.criterios.includes('fracao'));
    assert.equal(r.naoPreenchida.pctNaoPreenchida, 75);
});

test('unfilled sheet: five absences among sixteen visible days is not flagged', () => {
    const linhas = diasSemana(1, 16, d => d > 5);
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.flag, false);
    assert.equal(r.naoPreenchida.visiveis, 16);
    assert.equal(r.naoPreenchida.preenchidos, 11);
});

test('unfilled sheet: a run of seven calendar days without marks is flagged by sequence', () => {
    const datas = [5, 7, 9, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    const linhas = datas.map(d => [5, 7, 9, 12].includes(d) ? linha(d, '', '', 'Ausencia de Marcacao') : linha(d, '08:00 ', '17:00 '));
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.flag, true);
    assert.deepEqual(plain(r.naoPreenchida.criterios), ['sequencia']);
    assert.equal(r.naoPreenchida.maiorSequenciaDias, 8);
});

test('unfilled sheet: a filled day interrupts the sequence', () => {
    const datas = [5, 7, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    const linhas = datas.map(d => [5, 7, 9, 12].includes(d) ? linha(d, '', '', 'Ausencia de Marcacao') : linha(d, '08:00 ', '17:00 '));
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.flag, false);
    assert.equal(r.naoPreenchida.maiorSequenciaDias, 5);
});

test('unfilled sheet: six calendar days without marks are not enough', () => {
    const datas = [5, 7, 10, 12, 14, 16, 18, 20];
    const linhas = datas.map(d => [5, 7, 10].includes(d) ? linha(d, '', '', 'Ausencia de Marcacao') : linha(d, '08:00 ', '17:00 '));
    const r = detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.flag, false);
    assert.equal(r.naoPreenchida.maiorSequenciaDias, 6);
});

test('unfilled sheet: a sheet without visible days is not evaluated', () => {
    const r = detector.detectarFolha([], SETEMBRO);
    assert.equal(r.naoPreenchida.avaliada, false);
    assert.equal(r.naoPreenchida.flag, false);
    assert.equal(r.contagens.naoPreenchida, 0);
});

test('missing mark fields mark marks-based rules as not evaluated, not zero', () => {
    const r = detector.detectarFolha([
        { n: '1', dataStr: dd(2), cabecalho: dd(2) + ' [Interjornada]', marc1: null, marc2: null, irre: 's/marc de entrada/sa\u00edda', codJust: null }
    ], SETEMBRO);
    assert.equal(r.naoPreenchida.avaliada, false);
    assert.equal(r.marcacoesAvaliadas, false);
    assert.equal(r.contagens.semES, 1);
    assert.equal(r.contagens.interj, 1);
});

test('counts are the length of the detected day lists', () => {
    const r = detector.detectarFolha([
        linha(1, '06:00*', ''), linha(2, '06:00*', '', 's/marc de entrada/sa\u00edda'),
        linha(3, '06:00*', '18:00 ')
    ], SETEMBRO);
    assert.equal(r.contagens.semES, r.dias.semES.length);
    assert.equal(r.contagens.interj, r.dias.interj.length);
    assert.equal(r.contagens.britanica, r.dias.britanica.length);
    assert.equal(r.contagens.britanica, 3);
});

test('the same rows produce the same counts on repeated detection', () => {
    const linhas = saidasManuais([[2, '15'], [10, '15'], [15, '15']]);
    const a = detector.detectarFolha(linhas, SETEMBRO);
    const b = detector.detectarFolha(linhas, SETEMBRO);
    assert.deepEqual(plain(a.contagens), plain(b.contagens));
});

function createFakeSheet(rows) {
    const writes = [];
    function field(nome, valor) {
        const el = { name: nome };
        Object.defineProperty(el, 'value', {
            get() { return valor; },
            set() { writes.push(nome); throw new Error('write to ' + nome); }
        });
        el.click = () => { writes.push('click ' + nome); throw new Error('click'); };
        el.dispatchEvent = () => { writes.push('dispatch ' + nome); throw new Error('dispatch'); };
        return el;
    }
    const irres = [];
    for (const row of rows) {
        const campos = {
            ['Marc1' + row.n]: field('Marc1' + row.n, row.marc1),
            ['Marc2' + row.n]: field('Marc2' + row.n, row.marc2),
            ['CodJust' + row.n]: field('CodJust' + row.n, '')
        };
        const tr = { querySelector: sel => campos[/name="([^"]+)"/.exec(sel)[1]] || null };
        const irre = field('Irre' + row.n, row.irre);
        irre.closest = () => tr;
        irre.cabecalho = row.cabecalho;
        irres.push(irre);
    }
    return {
        writes,
        doc: {
            querySelectorAll: () => irres,
            querySelector: () => null
        }
    };
}

test('the page reader returns structured rows and performs no writes', () => {
    const AF2 = loadDetector({ obterCabecalhoDoDia: inp => inp.cabecalho });
    const sheet = createFakeSheet([
        { n: '1', marc1: '05:49 ', marc2: '17:49', irre: ' ', cabecalho: dd(2) + ' Qua' },
        { n: '2', marc1: '17:49', marc2: '18:13 ', irre: 'Hora Extra', cabecalho: dd(2) + ' Qua' },
        { n: '3', marc1: '', marc2: '', irre: 'Ausencia de Marcacao', cabecalho: dd(4) + ' Sex' }
    ]);

    const linhas = AF2.detector.lerLinhasFolha(sheet.doc);

    assert.equal(linhas.length, 3);
    assert.equal(linhas[1].marc1, '17:49');
    assert.equal(linhas[1].dataStr, dd(2));
    assert.equal(linhas[2].irre, 'Ausencia de Marcacao');
    assert.deepEqual(sheet.writes, []);

    const r = AF2.detector.detectarFolha(linhas, SETEMBRO);
    assert.equal(r.naoPreenchida.visiveis, 2);
    assert.deepEqual(sheet.writes, []);
});

