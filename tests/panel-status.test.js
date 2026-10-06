'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createDocument() {
    const elements = new Map();

    function createElement() {
        const element = {
            style: {},
            children: [],
            addEventListener(type, handler) {
                this.listeners = this.listeners || {};
                this.listeners[type] = handler;
            },
            appendChild(child) {
                this.children.push(child);
                child.parentNode = this;
            },
            removeChild(child) {
                this.children = this.children.filter(item => item !== child);
            },
            set innerHTML(markup) {
                for (const match of markup.matchAll(/\bid="([^"]+)"/g)) {
                    const button = createElement();
                    button.id = match[1];
                }
            },
            get innerHTML() {
                return '';
            }
        };
        Object.defineProperty(element, 'id', {
            get() { return this.elementId || ''; },
            set(value) {
                this.elementId = value;
                elements.set(value, this);
            }
        });
        return element;
    }

    const body = createElement();
    return {
        body,
        createElement,
        getElementById: id => elements.get(id) || null
    };
}

function loadPanel(AF) {
    const window = { AutomacaoFolha: AF };
    const source = readFileSync(join(__dirname, '..', '80-painel.js'), 'utf8');
    vm.runInNewContext(source, { window, console });
    return window.AutomacaoFolha.painel;
}

test('report-ready status preserves fatal adjustment stage, reason, and uncertainty', () => {
    const doc = createDocument();
    const AF = {
        estado: {
            cancelado: true,
            falhaAjuste: {
                stage: 'popup-save-completion',
                reason: 'reload nao observado',
                unconfirmed: true
            }
        },
        core: { getDocC: () => doc },
        relatorios: {}
    };
    const panel = loadPanel(AF);
    panel.iniciar(doc);

    AF.relatorios.habilitarCopiar('Relatorio de Ajuste');

    const status = doc.getElementById('fpw-status-text').textContent;
    assert.match(status, /Interrompido \(popup-save-completion\): reload nao observado/);
    assert.match(status, /resultado nao confirmado/);
    assert.doesNotMatch(status, /Relatorio de Ajuste pronto/);
    assert.equal(doc.getElementById('btn-copiar').disabled, false);
});

test('report-ready status retains an unconfirmed user-stop reason', () => {
    const doc = createDocument();
    const AF = {
        estado: {
            cancelado: true,
            motivoParadaAjuste: {
                stage: 'footer-save',
                reason: 'Parada solicitada durante a gravacao no rodape.',
                unconfirmed: true
            }
        },
        core: { getDocC: () => doc },
        relatorios: {}
    };
    const panel = loadPanel(AF);
    panel.iniciar(doc);

    AF.relatorios.habilitarCopiar('Relatorio de Ajuste');

    const status = doc.getElementById('fpw-status-text').textContent;
    assert.match(status, /Parada solicitada durante a gravacao no rodape/);
    assert.match(status, /resultado nao confirmado/);
});

test('log button is always enabled, opens the log window and does not touch the run status', () => {
    const doc = createDocument();
    let opened = 0;
    const AF = {
        estado: { cancelado: false, rodando: true },
        core: { getDocC: () => doc },
        relatorios: {},
        log: { abrirJanela() { opened++; } }
    };
    const panel = loadPanel(AF);
    panel.iniciar(doc);

    const button = doc.getElementById('btn-log');
    assert.ok(button, 'btn-log must exist');
    assert.notEqual(button.disabled, true);

    AF.core.setBotoes(true);
    assert.notEqual(button.disabled, true);
    const statusBefore = doc.getElementById('fpw-status-text').textContent;

    button.listeners.click();

    assert.equal(opened, 1);
    assert.equal(doc.getElementById('fpw-status-text').textContent, statusBefore);
    assert.equal(doc.getElementById('btn-parar').disabled, false);
    assert.equal(AF.estado.cancelado, false);
});

test('log button reports when the log module is unavailable', () => {
    const doc = createDocument();
    const AF = { estado: {}, core: { getDocC: () => doc }, relatorios: {} };
    const panel = loadPanel(AF);
    panel.iniciar(doc);

    doc.getElementById('btn-log').listeners.click();

    assert.match(doc.getElementById('fpw-status-text').textContent, /Log indispon/);
});

test('report button is enabled from the start and opens the live report window', () => {
    const doc = createDocument();
    let relOpened = 0;
    const AF = {
        estado: { cancelado: false, rodando: false },
        core: { getDocC: () => doc },
        relatorios: { abrirJanela() { relOpened++; } },
        sons: { tocar() {} }
    };
    const panel = loadPanel(AF);
    panel.iniciar(doc);

    const btnCopiar = doc.getElementById('btn-copiar');
    assert.ok(!btnCopiar.disabled);

    // Durante execução continua habilitado
    AF.core.setBotoes(true);
    assert.ok(!btnCopiar.disabled);

    // Clique abre janela mesmo sem relatório anterior
    btnCopiar.onclick();
    assert.equal(relOpened, 1);
});