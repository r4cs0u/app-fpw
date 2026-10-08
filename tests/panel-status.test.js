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
                this._html = markup;
                for (const match of markup.matchAll(/\bid="([^"]+)"/g)) {
                    const button = createElement();
                    button.id = match[1];
                }
            },
            get innerHTML() {
                return this._html || '';
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

function loadPanel(AF, extras) {
    const window = { AutomacaoFolha: AF };
    const source = readFileSync(join(__dirname, '..', '80-painel.js'), 'utf8');
    vm.runInNewContext(source, Object.assign({ window, console }, extras));
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
test('report button opens the window without playing any sound', () => {
    const doc = createDocument();
    const sons = [];
    const AF = {
        estado: { cancelado: false, rodando: false },
        core: { getDocC: () => doc },
        relatorios: { abrirJanela() {} },
        sons: { tocar(tipo) { sons.push(tipo); } }
    };
    loadPanel(AF).iniciar(doc);

    doc.getElementById('btn-copiar').onclick();

    assert.deepEqual(sons, []);
});

function stopButtonHarness(rodando) {
    const doc = createDocument();
    const sons = [];
    const AF = {
        estado: { cancelado: false, rodando },
        core: { getDocC: () => doc, cancelarTudo() { AF.estado.cancelado = true; } },
        relatorios: {},
        sons: { tocar(tipo) { sons.push(tipo); } }
    };
    loadPanel(AF, { sessionStorage: { removeItem() {} } }).iniciar(doc);
    return { doc, sons, AF };
}

test('stop button plays the stop sound once when a run is in progress', () => {
    const { doc, sons, AF } = stopButtonHarness(true);

    doc.getElementById('btn-parar').onclick();

    assert.deepEqual(sons, ['parada']);
    assert.equal(AF.estado.cancelado, true);
});

test('stop button plays no sound when nothing is running', () => {
    const { doc, sons } = stopButtonHarness(false);

    doc.getElementById('btn-parar').onclick();

    assert.deepEqual(sons, []);
});

test('stop button shows "Parando..." only while a run is ending and never when idle', () => {
    const ocioso = stopButtonHarness(false);
    ocioso.doc.getElementById('btn-parar').onclick();
    assert.notEqual(ocioso.doc.getElementById('fpw-status-text').textContent, 'Parando...');

    const emAndamento = stopButtonHarness(true);
    emAndamento.doc.getElementById('btn-parar').onclick();
    assert.equal(emAndamento.doc.getElementById('fpw-status-text').textContent, 'Parando...');

    // o fim da execução grava o status final e substitui o "Parando..."
    emAndamento.AF.relatorios.habilitarCopiar('Relatório de Análise');
    assert.equal(emAndamento.doc.getElementById('fpw-status-text').textContent, 'Parado \u2014 Relatório de Análise pronto');
});

test('panel displays oracle badge across unknown, active, and inactive states and does not stop running automation on loss', () => {
    const doc = createDocument();
    const AF = {
        estado: { cancelado: false, rodando: true },
        core: { getDocC: () => doc },
        relatorios: {},
        sons: { tocar() {} }
    };
    loadPanel(AF, { sessionStorage: { removeItem() {} } }).iniciar(doc);

    const badge = doc.getElementById('fpw-oracle-badge');
    const warning = doc.getElementById('fpw-oracle-warning');
    assert.ok(badge);
    assert.ok(warning);

    // Estado inicial: unknown
    assert.equal(badge.textContent, 'Oracle: ?');
    assert.equal(warning.style.display, 'none');

    // Estado active
    AF.painel.atualizarSessaoOracle({ estado: 'active' });
    assert.equal(badge.textContent, 'Oracle: ativa');
    assert.equal(warning.style.display, 'none');

    // Estado inactive (perda de sessão)
    AF.painel.atualizarSessaoOracle({ estado: 'inactive', houvePerda: true });
    assert.equal(badge.textContent, 'Oracle: inativa');
    assert.equal(warning.style.display, 'block');

    // Automação em andamento NÃO é interrompida
    assert.equal(AF.estado.rodando, true);
    assert.equal(AF.estado.cancelado, false);

    // Recuperação para active
    AF.painel.atualizarSessaoOracle({ estado: 'active' });
    assert.equal(badge.textContent, 'Oracle: ativa');
    assert.equal(warning.style.display, 'none');

    // Estado expired
    AF.painel.atualizarSessaoOracle({ estado: 'expired', houvePerda: true });
    assert.equal(badge.textContent, 'Oracle: expirada');
    assert.equal(warning.style.display, 'block');
    assert.ok(warning.textContent.includes('expirou'));
});

test('panel mode selector initializes to supervisionado, toggles, persists in sessionStorage and falls back safely', () => {
    const doc = createDocument();
    const storage = new Map();
    const sessionStorage = {
        getItem: k => storage.get(k) || null,
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: k => storage.delete(k)
    };
    const AF = {
        estado: { cancelado: false, rodando: false },
        core: { getDocC: () => doc },
        relatorios: {},
        sons: { tocar() {} }
    };
    loadPanel(AF, { sessionStorage }).iniciar(doc);

    const btnAuto = doc.getElementById('btn-modo-auto');
    const btnSuperv = doc.getElementById('btn-modo-superv');
    assert.ok(btnAuto);
    assert.ok(btnSuperv);

    // Inicial sempre supervisionado por regra de carregamento
    assert.equal(AF.painel.obterModo(), 'supervisionado');

    // Troca para automatico via clique
    btnAuto.onclick();
    assert.equal(AF.painel.obterModo(), 'automatico');
    assert.equal(sessionStorage.getItem('fpw.modoAjuste'), 'automatico');

    // Troca para supervisionado via clique
    btnSuperv.onclick();
    assert.equal(AF.painel.obterModo(), 'supervisionado');
    assert.equal(sessionStorage.getItem('fpw.modoAjuste'), 'supervisionado');

    // Carregamento de novo painel sempre inicializa em supervisionado
    const AF2 = { estado: { cancelado: false, rodando: false }, core: { getDocC: () => doc }, relatorios: {}, sons: { tocar() {} } };
    loadPanel(AF2, { sessionStorage }).iniciar(createDocument());
    assert.equal(AF2.painel.obterModo(), 'supervisionado');
});

test('panel mode selector is disabled during execution or pending confirmation', () => {
    const doc = createDocument();
    const AF = {
        estado: { cancelado: false, rodando: false, confirmacaoPendente: false },
        core: { getDocC: () => doc },
        relatorios: {},
        sons: { tocar() {} }
    };
    loadPanel(AF, { sessionStorage: { getItem: () => null, setItem: () => {} } }).iniciar(doc);

    const btnAuto = doc.getElementById('btn-modo-auto');
    const btnSuperv = doc.getElementById('btn-modo-superv');

    assert.equal(btnAuto.disabled, false);
    assert.equal(btnSuperv.disabled, false);

    // Durante execucao
    AF.core.setBotoes(true);
    assert.equal(btnAuto.disabled, true);
    assert.equal(btnSuperv.disabled, true);

    AF.core.setBotoes(false);
    assert.equal(btnAuto.disabled, false);

    // Durante confirmacao pendente
    AF.estado.confirmacaoPendente = true;
    AF.core.setBotoes(false);
    assert.equal(btnAuto.disabled, true);
    assert.equal(btnSuperv.disabled, true);
});

test('panel instruction text mentions both modes and popups', () => {
    const doc = createDocument();
    const AF = {
        estado: {},
        core: { getDocC: () => doc },
        relatorios: {},
        sons: { tocar() {} }
    };
    loadPanel(AF).iniciar(doc);

    const side = doc.getElementById('fpw-sidepanel');
    assert.ok(side);
    assert.match(side.children[1].children[0].children[2].innerHTML, /Automático/);
    assert.match(side.children[1].children[0].children[2].innerHTML, /Supervisionado/);
    assert.match(side.children[1].children[0].children[2].innerHTML, /popups/);
});

test('adjust button routes to iniciarConfirmacao in supervisionado and processarTodas in automatico', async () => {
    const doc = createDocument();
    let processarTodasChamadas = 0;
    let confirmacaoChamadas = 0;

    const AF = {
        estado: { cancelado: false, rodando: false },
        core: { getDocC: () => doc },
        fases: { processarTodas: async () => { processarTodasChamadas++; } },
        supervisionado: { iniciarConfirmacao: async () => { confirmacaoChamadas++; } },
        relatorios: {},
        sons: { tocar() {} }
    };
    loadPanel(AF).iniciar(doc);

    // Modo supervisionado (padrao no carregamento)
    await doc.getElementById('btn-executar').onclick();
    assert.equal(confirmacaoChamadas, 1);
    assert.equal(processarTodasChamadas, 0);

    // Muda para modo automatico
    AF.painel.definirModo('automatico');
    await doc.getElementById('btn-executar').onclick();
    assert.equal(processarTodasChamadas, 1);
    assert.equal(confirmacaoChamadas, 1);
});
