'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const plain = value => JSON.parse(JSON.stringify(value));

function createStorage(options = {}) {
    const data = new Map();
    return {
        data,
        failWrites: !!options.failWrites,
        maxChars: options.maxChars || Infinity,
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) {
            if (this.failWrites || String(value).length > this.maxChars) throw new Error('QuotaExceededError');
            data.set(key, String(value));
        }
    };
}

function loadLog(options = {}) {
    const storage = options.storage === undefined ? createStorage() : options.storage;
    const clock = { now: new Date(2026, 9, 5, 21, 30, 0).getTime() };
    const window = { AutomacaoFolha: { core: {}, estado: {} }, sessionStorage: storage };
    if (options.open) window.open = options.open;
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(__dirname, '..', '05-log.js'), 'utf8'), context);
    const AF = window.AutomacaoFolha;
    AF.log.relogio = () => { clock.now += 1000; return clock.now; };
    return { AF, storage, window, context };
}

function loadCoreWithLog(logLoaded) {
    const window = { AutomacaoFolha: undefined, sessionStorage: createStorage() };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(__dirname, '..', '00-core.js'), 'utf8'), context);
    if (logLoaded) vm.runInNewContext(readFileSync(join(__dirname, '..', '05-log.js'), 'utf8'), context);
    return window.AutomacaoFolha;
}

test('legacy AF.core.log calls become events with execution and employee context', () => {
    const AF = loadCoreWithLog(true);
    const id = AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('FULANO DE TAL');
    AF.core.log('Processando folgas...', '#0043ff');

    const eventos = AF.log.eventosDaExecucao(id);
    const ultimo = eventos[eventos.length - 1];
    assert.equal(ultimo.msg, 'Processando folgas...');
    assert.equal(ultimo.func, 'FULANO DE TAL');
    assert.equal(ultimo.exec, id);
    assert.equal(ultimo.cor, '#0043ff');
});

test('AF.core.log still works when the structured log module is not loaded', () => {
    const AF = loadCoreWithLog(false);
    AF.core.log('mensagem', '#ffb000');
    assert.equal(AF.estado.logBuffer.length, 1);
    assert.equal(AF.estado.logBuffer[0].msg, 'mensagem');
});

test('grouping by employee uses event data, not separator lines', () => {
    const { AF } = loadLog();
    const id = AF.log.iniciarExecucao('analise');
    AF.log.definirFuncionario('ANA');
    AF.log.registrar('! ANA | Irreg:2', '#facc15');
    AF.log.definirFuncionario('BIA');
    AF.log.registrar('OK BIA', '#6b7280');
    AF.log.definirFuncionario('ANA');
    AF.log.registrar('segunda linha de ANA');

    const grupos = AF.log.porFuncionario(id);
    assert.deepEqual(plain(grupos.map(g => g.nome)), ['ANA', 'BIA']);
    assert.equal(grupos[0].linhas.length, 2);
    assert.equal(grupos[1].linhas[0].msg, 'OK BIA');
});

test('plain text includes time, execution, employee, phase and data', () => {
    const { AF } = loadLog();
    AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('FULANO');
    AF.log.definirFase('fase 1');
    AF.log.evento('acao-folga', { origem: '12/09/2026', destino: '05/09/2026', lista: ['a', 'b'], vazia: [] }, 'Folga movida', '#0043ff');

    const texto = AF.log.texto();
    assert.match(texto, /\[2026-10-05 21:\d\d:\d\d\] \[AJUSTE#1\] FULANO \| fase 1 \| Folga movida/);
    assert.match(texto, /\n {4}origem: 12\/09\/2026/);
    assert.match(texto, /\n {4}lista: a, b/);
    assert.match(texto, /\n {4}vazia: -/);
    assert.doesNotMatch(texto, /#0043ff/);
});

test('credentials and URL query strings are not recorded literally', () => {
    const { AF } = loadLog();
    AF.log.iniciarExecucao('ajuste');
    AF.log.registrar('Falha em https://myway.g.globo/WebPonto/x.asp?token=abc123&u=1 cookie=ASPSESSIONIDXYZ=999 Authorization: Bearer segredo', '#f87171');
    AF.log.evento('falha', { url: 'https://host/p?sid=123', detalhe: 'senha=hunter2' }, 'detalhe');

    const texto = AF.log.texto();
    assert.doesNotMatch(texto, /abc123|ASPSESSIONIDXYZ|segredo|sid=123|hunter2/);
    assert.match(texto, /https:\/\/myway\.g\.globo\/WebPonto\/x\.asp\[parametros omitidos\]/);
});

test('starting a new execution keeps the events of the previous one', () => {
    const { AF } = loadLog();
    const a = AF.log.iniciarExecucao('analise');
    AF.log.definirFuncionario('ANA');
    AF.log.registrar('da analise');
    AF.log.encerrarExecucao('concluida');
    const b = AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('ANA');
    AF.log.registrar('do ajuste');

    assert.notEqual(a, b);
    assert.ok(AF.log.eventosDaExecucao(a).some(e => e.msg === 'da analise'));
    assert.ok(AF.log.eventosDaExecucao(b).some(e => e.msg === 'do ajuste'));
    const texto = AF.log.texto();
    assert.match(texto, /da analise/);
    assert.match(texto, /do ajuste/);
    assert.match(texto, /\[ANALISE#1\]/);
    assert.match(texto, /\[AJUSTE#2\]/);
});

test('log survives a page reload through sessionStorage', () => {
    const first = loadLog();
    first.AF.log.iniciarExecucao('analise');
    first.AF.log.definirFuncionario('ANA');
    first.AF.log.registrar('antes do reload');
    first.AF.log.encerrarExecucao('concluida');

    const second = loadLog({ storage: first.storage });
    assert.match(second.AF.log.texto(), /antes do reload/);
    assert.equal(second.AF.log.execucoes().length, 1);
    const novaId = second.AF.log.iniciarExecucao('ajuste');
    assert.equal(novaId, 2);
});

test('a new tab starts with an empty log', () => {
    const first = loadLog();
    first.AF.log.iniciarExecucao('analise');
    first.AF.log.registrar('algo');
    const outraAba = loadLog({ storage: createStorage() });
    assert.equal(outraAba.AF.log.texto(), '');
});

test('reload during a run keeps recorded events and marks the run as interrupted', () => {
    const first = loadLog();
    first.AF.log.iniciarExecucao('ajuste');
    first.AF.log.definirFuncionario('ANA');
    first.AF.log.registrar('processando');

    const second = loadLog({ storage: first.storage });
    assert.match(second.AF.log.texto(), /processando/);
    assert.equal(second.AF.log.execucoes()[0].status, 'interrompida');
    assert.match(second.AF.log.texto(), /interrompida: a pagina foi recarregada/);
});

test('quota exceeded truncates the oldest events and records a notice', () => {
    const { AF } = loadLog();
    AF.log.iniciarExecucao('analise');
    for (let i = 0; i < 700; i++) {
        AF.log.registrar('linha ' + i + ' ' + 'x'.repeat(2000));
    }
    const texto = AF.log.texto();
    assert.match(texto, /\[log truncado: \d+ evento\(s\) mais antigos foram descartados\]/);
    assert.match(texto, /Log truncado: \d+ evento\(s\) mais antigos descartados/);
    assert.match(texto, /linha 699 /);
    assert.doesNotMatch(texto, /linha 0 /);
});

test('storage write failure does not stop the run and is recorded once', () => {
    const { AF } = loadLog({ storage: createStorage({ failWrites: true }) });
    AF.log.iniciarExecucao('ajuste');
    for (let i = 0; i < 80; i++) AF.log.registrar('evento ' + i);

    const texto = AF.log.texto();
    assert.match(texto, /evento 79/);
    assert.match(texto, /evento 0\b/);
    assert.equal((texto.match(/Falha ao persistir o log na sessao/g) || []).length, 1);
});

test('unavailable storage is tolerated', () => {
    const { AF } = loadLog({ storage: null });
    AF.log.iniciarExecucao('analise');
    AF.log.registrar('sem storage');
    assert.match(AF.log.texto(), /sem storage/);
});

function createFakeWindowFactory() {
    const created = [];
    function open() {
        const elements = new Map();
        const win = {
            closed: false,
            focused: 0,
            focus() { this.focused++; },
            clipboard: [],
            navigator: null,
            document: {
                body: { appendChild() {}, removeChild() {} },
                open() {},
                close() {},
                write(html) {
                    elements.clear();
                    for (const m of html.matchAll(/id="([^"]+)"/g)) {
                        elements.set(m[1], { id: m[1], textContent: '', scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
                    }
                },
                getElementById: id => elements.get(id) || null,
                createElement: () => ({ select() {} }),
                execCommand: () => true
            }
        };
        win.navigator = { clipboard: { writeText: text => { win.clipboard.push(text); return Promise.resolve(); } } };
        created.push(win);
        return win;
    }
    return { open, created };
}

test('the log window opens with the current events and copies the full text', async () => {
    const fake = createFakeWindowFactory();
    const { AF } = loadLog({ open: fake.open });
    AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('ANA');
    AF.log.registrar('evento visivel');

    const win = AF.log.abrirJanela();
    assert.ok(win);
    assert.match(win.document.getElementById('fpw-log-texto').textContent, /evento visivel/);

    win.document.getElementById('fpw-log-copiar').onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(win.clipboard.length, 1);
    assert.equal(win.clipboard[0], AF.log.texto());

    AF.log.registrar('novo evento');
    win.document.getElementById('fpw-log-atualizar').onclick();
    assert.match(win.document.getElementById('fpw-log-texto').textContent, /novo evento/);

    assert.equal(AF.log.abrirJanela(), win);
    assert.equal(fake.created.length, 1);
    assert.ok(win.focused >= 1);
});

test('the log window states when there are no events', () => {
    const fake = createFakeWindowFactory();
    const { AF } = loadLog({ open: fake.open });
    const win = AF.log.abrirJanela();
    assert.equal(win.document.getElementById('fpw-log-texto').textContent, 'Nenhum evento registrado.');
});

test('a blocked popup is recorded without throwing', () => {
    const { AF } = loadLog({ open: () => null });
    assert.equal(AF.log.abrirJanela(), null);
    assert.match(AF.log.texto(), /Popup do log bloqueado/);
});
