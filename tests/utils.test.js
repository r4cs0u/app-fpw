'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadUtils() {
    const window = { AutomacaoFolha: {} };
    const source = readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8');
    vm.runInNewContext(source, { window, console: { log() {} } });
    return window.AutomacaoFolha.utils;
}

function localDate(day, month, year) {
    return new Date(year, month - 1, day);
}

test('Brazilian date parsing and formatting handle valid and malformed values', () => {
    const utils = loadUtils();

    assert.equal(utils.fmtDataBR(utils.parseDataBR('02/10/2026')), '02/10/2026');
    assert.equal(utils.parseDataBR('not-a-date'), null);
    assert.equal(utils.parseDataBR('02-10-2026'), null);
    assert.equal(utils.parseDataBR(''), null);
});

test('week boundaries and identifiers use Monday as the first day', () => {
    const utils = loadUtils();

    assert.equal(utils.fmtDataBR(utils.inicioSemanaBR(localDate(5, 10, 2026))), '05/10/2026');
    assert.equal(utils.fmtDataBR(utils.inicioSemanaBR(localDate(4, 10, 2026))), '28/09/2026');
    assert.equal(utils.semanaIdBR(localDate(4, 10, 2026)), '28/09/2026');
});

test('target-month comparison requires matching month and year', () => {
    const utils = loadUtils();
    const target = localDate(1, 10, 2026);

    assert.equal(utils.ehMesAlvo(localDate(31, 10, 2026), target), true);
    assert.equal(utils.ehMesAlvo(localDate(1, 9, 2026), target), false);
    assert.equal(utils.ehMesAlvo(localDate(1, 10, 2025), target), false);
    assert.equal(utils.ehMesAlvo(null, target), false);
});

test('RJ fixed and movable holidays are calculated for representative years', () => {
    const utils = loadUtils();
    const holidays2024 = utils.calcularFeriadosRJ(2024);
    const holidays2025 = utils.calcularFeriadosRJ(2025);

    assert.equal(holidays2024.has('01/01/2024'), true);
    assert.equal(holidays2024.has('20/01/2024'), true);
    assert.equal(holidays2024.has('12/02/2024'), true);
    assert.equal(holidays2024.has('13/02/2024'), true);
    assert.equal(holidays2024.has('29/03/2024'), true);
    assert.equal(holidays2024.has('31/03/2024'), true);
    assert.equal(holidays2024.has('30/05/2024'), true);

    assert.equal(holidays2025.has('03/03/2025'), true);
    assert.equal(holidays2025.has('04/03/2025'), true);
    assert.equal(holidays2025.has('18/04/2025'), true);
    assert.equal(holidays2025.has('20/04/2025'), true);
    assert.equal(holidays2025.has('19/06/2025'), true);
});
