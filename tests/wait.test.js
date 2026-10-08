'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class SyntheticClock {
    constructor() {
        this.now = 0;
        this.nextId = 1;
        this.timers = new Map();
    }

    schedule(callback, delay, interval) {
        const id = this.nextId++;
        this.timers.set(id, {
            id,
            callback,
            due: this.now + delay,
            interval
        });
        return id;
    }

    setTimeout(callback, delay) {
        return this.schedule(callback, delay, 0);
    }

    setInterval(callback, delay) {
        return this.schedule(callback, delay, delay);
    }

    clear(id) {
        this.timers.delete(id);
    }

    advance(duration) {
        const target = this.now + duration;
        while (true) {
            const next = Array.from(this.timers.values())
                .filter(timer => timer.due <= target)
                .sort((left, right) => left.due - right.due || left.id - right.id)[0];
            if (!next) break;

            this.now = next.due;
            if (next.interval) {
                next.due += next.interval;
            } else {
                this.timers.delete(next.id);
            }
            next.callback();
        }
        this.now = target;
    }
}

function loadRuntime(clock, globals = {}) {
    const window = globals.window || {};
    const source = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    const SyntheticDate = class extends Date {
        static now() {
            return clock.now;
        }
    };

    vm.runInNewContext(source, {
        window,
        Date: SyntheticDate,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clear.bind(clock),
        setInterval: clock.setInterval.bind(clock),
        clearInterval: clock.clear.bind(clock),
        sessionStorage: globals.sessionStorage || {
            getItem: () => null,
            setItem() {},
            removeItem() {}
        },
        console
    });
    return window.AutomacaoFolha;
}

function loadCore(clock) {
    return loadRuntime(clock).core;
}

function options(overrides = {}) {
    return {
        stage: 'synthetic-stage',
        deadlineMs: 100,
        pollIntervalMs: 10,
        inspecionar: () => false,
        ...overrides
    };
}

test('adjustment wait recognizes variable response times before its finite deadline', async () => {
    for (const responseAt of [20, 50, 90]) {
        const clock = new SyntheticClock();
        const core = loadCore(clock);
        const waiting = core.esperarAjuste(options({
            deadlineMs: 110,
            inspecionar: () => clock.now >= responseAt
        }));

        clock.advance(responseAt);
        const outcome = await waiting;
        assert.equal(outcome.status, 'ready');
        assert.equal(outcome.stage, 'synthetic-stage');
        assert.equal(clock.timers.size, 0);
    }
});

test('compatibility minimum delay is retained without turning elapsed time into success', async () => {
    const clock = new SyntheticClock();
    const core = loadCore(clock);
    const waiting = core.esperarAjuste(options({
        minimumWaitMs: 30,
        inspecionar: () => clock.now >= 10 ? { ready: true, value: 'observed' } : false
    }));

    clock.advance(20);
    assert.equal(clock.timers.size, 2);
    clock.advance(10);

    const outcome = await waiting;
    assert.equal(outcome.status, 'ready');
    assert.equal(outcome.value, 'observed');
    assert.equal(clock.now, 30);
    assert.equal(clock.timers.size, 0);

    const noEvidenceClock = new SyntheticClock();
    const noEvidenceCore = loadCore(noEvidenceClock);
    const noEvidenceWait = noEvidenceCore.esperarAjuste(options({
        deadlineMs: 50,
        minimumWaitMs: 20
    }));
    noEvidenceClock.advance(50);
    const timeout = await noEvidenceWait;
    assert.equal(timeout.status, 'timeout');
    assert.match(timeout.reason, /sem confirmacao/);
    assert.equal(noEvidenceClock.timers.size, 0);
});

test('adjustment wait returns timeout and cleans timers when readiness is absent', async () => {
    const clock = new SyntheticClock();
    const core = loadCore(clock);
    const waiting = core.esperarAjuste(options({ deadlineMs: 50 }));

    clock.advance(50);

    const outcome = await waiting;
    assert.equal(outcome.status, 'timeout');
    assert.equal(outcome.stage, 'synthetic-stage');
    assert.equal(clock.timers.size, 0);
});

test('adjustment wait returns inspection errors instead of treating them as completion', async () => {
    const clock = new SyntheticClock();
    const core = loadCore(clock);
    const waiting = core.esperarAjuste(options({
        inspecionar() {
            throw new Error('document inaccessible');
        }
    }));

    const outcome = await waiting;
    assert.equal(outcome.status, 'error');
    assert.equal(outcome.reason, 'document inaccessible');
    assert.equal(clock.timers.size, 0);
});

test('adjustment wait cancellation settles immediately and removes owned timers', async () => {
    const clock = new SyntheticClock();
    const core = loadCore(clock);
    const listeners = new Set();
    let detachCount = 0;
    const waiting = core.esperarAjuste(options({
        onCancel(callback) {
            listeners.add(callback);
            return () => {
                detachCount++;
                listeners.delete(callback);
            };
        }
    }));
    const cancel = Array.from(listeners)[0];

    cancel();

    const outcome = await waiting;
    assert.equal(outcome.status, 'cancelled');
    assert.equal(listeners.size, 0);
    assert.equal(detachCount, 1);
    assert.equal(clock.timers.size, 0);
});

test('adjustment wait settles once when readiness wins and clears deadline and poll', async () => {
    const clock = new SyntheticClock();
    const core = loadCore(clock);
    let inspections = 0;
    const waiting = core.esperarAjuste(options({
        inspecionar() {
            inspections++;
            return clock.now >= 10;
        }
    }));

    clock.advance(100);
    const outcome = await waiting;
    const settledInspections = inspections;
    clock.advance(100);

    assert.equal(outcome.status, 'ready');
    assert.equal(inspections, settledInspections);
    assert.equal(clock.timers.size, 0);
});

test('run cancellation immediately settles its wait and keeps later runs independent', async () => {
    const clock = new SyntheticClock();
    const AF = loadRuntime(clock);
    AF.estado.cancelado = false;
    const firstRun = AF.core.iniciarExecucaoAjuste();
    const waiting = AF.core.esperarAjuste(options({
        onCancel: callback => firstRun.onCancel(callback),
        isCancelled: () => !firstRun.isActive()
    }));

    firstRun.cancel('test stop');
    const outcome = await waiting;
    AF.estado.cancelado = false;
    const secondRun = AF.core.iniciarExecucaoAjuste();

    assert.equal(outcome.status, 'cancelled');
    assert.equal(firstRun.isActive(), false);
    assert.equal(secondRun.isActive(), true);
    assert.notEqual(firstRun.id, secondRun.id);
    assert.equal(clock.timers.size, 0);
});

test('old run timers cannot act after cancellation and restart', () => {
    const clock = new SyntheticClock();
    const AF = loadRuntime(clock);
    AF.estado.cancelado = false;
    const firstRun = AF.core.iniciarExecucaoAjuste();
    let actions = 0;
    firstRun.setTimeout(() => actions++, 100);
    firstRun.cancel('stop');

    AF.estado.cancelado = false;
    const secondRun = AF.core.iniciarExecucaoAjuste();
    clock.advance(100);

    assert.equal(actions, 0);
    assert.equal(firstRun.isActive(), false);
    assert.equal(secondRun.isActive(), true);
});

test('central stop records user cancellation and cannot stop a replacement run', () => {
    const clock = new SyntheticClock();
    const AF = loadRuntime(clock);
    const messages = [];
    const statuses = [];
    AF.core.log = message => messages.push(message);
    AF.core.setBotoes = running => statuses.push(running);
    AF.painel = { setStatus: text => messages.push(text) };
    AF.estado.cancelado = false;
    const firstRun = AF.core.iniciarExecucaoAjuste();
    let cleanupCount = 0;
    firstRun.addCleanup(() => cleanupCount++);

    AF.core.cancelarTudo();

    assert.equal(firstRun.ativa, false);
    assert.equal(cleanupCount, 1);
    assert.equal(AF.estado.falhaAjuste, undefined);
    assert.equal(AF.estado.motivoParadaAjuste.reason, 'Parada solicitada pelo usuario.');
    assert.equal(statuses[statuses.length - 1], false);

    AF.estado.cancelado = false;
    const replacementRun = AF.core.iniciarExecucaoAjuste();
    const messageCount = messages.length;
    assert.equal(AF.core.pararExecucaoAjuste({
        status: 'error',
        stage: 'stale-run',
        reason: 'must not stop the current run'
    }, firstRun), false);
    assert.equal(replacementRun.isActive(), true);
    assert.equal(AF.estado.cancelado, false);
    assert.equal(messages.length, messageCount);
    replacementRun.cancel('test cleanup');
});

test('run cleanup restores only its own popup interceptor and blocks old wrappers', () => {
    const clock = new SyntheticClock();
    let popupOpens = 0;
    let attempts = 0;
    const popup = {
        closed: false,
        document: {
            getElementById: () => ({ options: [] })
        }
    };
    const frame = {
        location: { href: 'https://example.test/justuser_cabec.asp' },
        window: {
            open() {
                popupOpens++;
                return popup;
            }
        }
    };
    const otherFrame = {
        location: { href: 'https://example.test/justuser_corpo.asp' },
        window: { open: () => popup }
    };
    const window = { top: { frames: [frame, otherFrame] } };
    const sessionStorage = {
        getItem(key) {
            if (key === 'autodataTrocar') return '01/10/2026';
            if (key === 'autodatasCandidatasPopup') return '["01/10/2026"]';
            return null;
        },
        removeItem() {},
        setItem() {}
    };
    const AF = loadRuntime(clock, { window, sessionStorage });
    AF.popup.tentarIndiceDatas = () => attempts++;
    AF.estado.cancelado = false;

    const firstRun = AF.core.iniciarExecucaoAjuste();
    AF.core.instalarInterceptorPopup(firstRun);
    const oldWrapper = frame.window.open;
    oldWrapper('popup');
    assert.equal(clock.timers.size, 0);

    firstRun.cancel('stop');
    assert.notEqual(frame.window.open, oldWrapper);
    AF.estado.cancelado = false;
    const secondRun = AF.core.iniciarExecucaoAjuste();
    AF.core.instalarInterceptorPopup(secondRun);
    oldWrapper('stale-popup');
    clock.advance(30000);

    assert.equal(popupOpens, 2);
    assert.equal(attempts, 0);
    assert.equal(clock.timers.size, 0);

    const replacement = () => 'external replacement';
    frame.window.open = replacement;
    secondRun.cancel('stop');
    assert.equal(frame.window.open, replacement);
    assert.equal(clock.timers.size, 0);
});

test('run cleanup leaves keepalive timers and shared analysis navigation untouched', async () => {
    const clock = new SyntheticClock();
    const AF = loadRuntime(clock);
    const heartbeat = clock.setInterval(() => {}, 120000);
    AF.estado.keepAliveTimer = heartbeat;
    AF.estado.cancelado = false;
    const run = AF.core.iniciarExecucaoAjuste();
    run.setTimeout(() => {}, 1000);
    run.cancel('stop');
    assert.equal(clock.timers.has(heartbeat), true);

    const employeeOptions = [{ text: 'A' }, { text: 'B' }];
    const selector = { selectedIndex: 0, options: employeeOptions };
    let selectedEmployeeUpdate = 0;
    AF.estado.cancelado = false;
    AF.core.getSelNome = () => selector;
    AF.core.getCabec = () => ({
        AjustaCodEmpresaEmpregado() {},
        AtualizaFuncionario() { selectedEmployeeUpdate++; }
    });
    AF.core.getDocC = () => ({ yourform: { lstNome: {}, CodEmpresaEmpregado: {} } });
    AF.core.getDoc1 = () => ({ querySelectorAll: () => [{}] });
    AF.core.paginaVaziaAgora = () => false;

    const navigation = AF.core.avancarFuncionario();
    clock.advance(6000);
    await Promise.resolve();
    clock.advance(500);

    assert.equal(await navigation, 'ok');
    assert.equal(selector.selectedIndex, 1);
    assert.equal(selectedEmployeeUpdate, 1);
    assert.equal(clock.timers.has(heartbeat), true);
});
