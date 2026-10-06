'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');
const main = readFileSync(join(root, '99-main.user.js'), 'utf8');
const modulos = [...main.slice(main.indexOf('var MODULOS = ['), main.indexOf('];', main.indexOf('var MODULOS = [')))
    .matchAll(/'([^']+\.js)'/g)].map(m => m[1]);

test('every listed module exists and the new modules load in dependency order', () => {
    assert.ok(modulos.length > 0);
    for (const modulo of modulos) assert.ok(existsSync(join(root, modulo)), modulo);

    const indice = nome => modulos.indexOf(nome);
    assert.ok(indice('05-log.js') > indice('00-core.js'));
    assert.ok(indice('05-log.js') < indice('10-utils.js'));
    assert.ok(indice('37-regras-folha.js') > indice('10-utils.js'));
    assert.ok(indice('37-regras-folha.js') < indice('40-fases.js'));
    assert.ok(indice('37-regras-folha.js') < indice('50-analisar.js'));
    assert.ok(indice('25-detector.js') > indice('10-utils.js'));
    assert.ok(indice('25-detector.js') > indice('20-mapa.js'));
    assert.ok(indice('27-modelo-relatorio.js') > indice('25-detector.js'));
    assert.ok(indice('27-modelo-relatorio.js') < indice('30-popup.js'));
    assert.ok(indice('27-modelo-relatorio.js') < indice('40-fases.js'));
    assert.ok(indice('25-detector.js') < indice('40-fases.js'));
    assert.ok(indice('25-detector.js') < indice('50-analisar.js'));
});

test('all modules load in the listed order without using a module that is not loaded yet', () => {
    const window = { sessionStorage: { getItem: () => null, setItem() {} } };
    const context = { window, console: { log() {}, info() {}, warn() {}, error() {} } };
    for (const modulo of modulos) {
        vm.runInNewContext(readFileSync(join(root, modulo), 'utf8'), context);
    }
    const AF = window.AutomacaoFolha;
    assert.equal(typeof AF.log.registrar, 'function');
    assert.equal(typeof AF.detector.detectarFolha, 'function');
    assert.equal(typeof AF.regras.contarFolgasAMovimentar, 'function');
    assert.equal(typeof AF.regras.selecionarDiasCod47, 'function');
    assert.equal(typeof AF.regras.somarHorasExtras, 'function');
    assert.equal(typeof AF.regras.interpretarSaldoHEC, 'function');
    assert.equal(typeof AF.fases.capturarEstadoFolha, 'function');
    assert.equal(typeof AF.analisar.analisarFolhaAtual, 'function');
});

test('the test build version is consistent between the entry script and the core', () => {
    const versaoMeta = /@version\s+(\S+)/.exec(main)[1];
    assert.equal(versaoMeta, '9.11-test');
    const core = readFileSync(join(root, '00-core.js'), 'utf8');
    assert.ok(core.includes("versao: '" + versaoMeta + "'"));
    assert.ok(main.includes("AF.versao = '" + versaoMeta + "'"));
});