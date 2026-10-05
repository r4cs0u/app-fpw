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
        this.timers.set(id, { id, callback, due: this.now + delay, interval });
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
            if (next.interval) next.due += next.interval;
            else this.timers.delete(next.id);
            next.callback();
        }
        this.now = target;
    }
}

function makeBodyDocument() {
    return {
        readyState: 'complete',
        body: { className: 'Tudo' },
        querySelector(selector) {
            if (selector === 'form[name="myForm"]') {
                return {
                    method: 'post',
                    getAttribute: () => 'justuser_corpo.asp'
                };
            }
            return null;
        }
    };
}

function makePopup(options) {
    let open = true;
    const state = { rejected: false, resultMessage: '', saves: 0, selectedDates: [] };
    const selector = {
        options: options.map((date, index) => ({
            text: date,
            value: String(index),
            index,
            selected: false
        })),
        dispatchEvent() {}
    };

    const popup = {
        location: { pathname: '/WebPontoDotNet/Justificativa/TrocarHorario.aspx' },
        get closed() { return !open; },
        close() { open = false; },
        state,
        document: {
            readyState: 'complete',
            body: {
                get innerText() {
                    if (state.rejected) return 'Dias selecionados possuem horários iguais!';
                    return state.resultMessage;
                },
                get textContent() {
                    return this.innerText;
                }
            },
            querySelector(selectorName) {
                if (selectorName === 'form#form1') return {};
                if (selectorName === 'input[name="btnGravar"]') {
                    return {
                        click() {
                            state.saves++;
                            state.selectedDates.push(selector.value);
                            if (state.onSave) state.onSave(state.saves, popup);
                        }
                    };
                }
                return null;
            },
            getElementById(id) {
                if (id === 'rpnPeriodo_ddlDatas') return selector;
                if (id === 'ppcMsg_btnMsgErro_CD' && (state.rejected || state.resultMessage)) {
                    return {
                        offsetParent: {},
                        click() {
                            const message = state.rejected ?
                                'Dias selecionados possuem horários iguais!' :
                                state.resultMessage;
                            state.rejected = false;
                            state.resultMessage = '';
                            if (state.onAcknowledge) state.onAcknowledge(popup, message);
                        }
                    };
                }
                return null;
            }
        }
    };
    return popup;
}

function createEnvironment(clock, popup) {
    let bodyDocument = makeBodyDocument();
    let bodyAccessError = false;
    const frameListeners = new Set();
    const frameElement = {
        addEventListener(name, callback) {
            if (name === 'load') frameListeners.add(callback);
        },
        removeEventListener(name, callback) {
            if (name === 'load') frameListeners.delete(callback);
        }
    };
    const bodyFrame = {
        name: 'mainFrame',
        location: { pathname: '/WebPonto/just_user/justuser_corpo.asp' },
        get document() {
            if (bodyAccessError) throw new Error('main frame access denied');
            return bodyDocument;
        },
        set document(value) { bodyDocument = value; }
    };
    const footerButton = {
        clicks: 0,
        click() {
            this.clicks++;
            if (this.onClick) this.onClick();
        }
    };
    const footerFrame = {
        name: 'bottomFrame',
        document: {
            getElementById(id) {
                return id === 'btnGravar' ? footerButton : null;
            }
        }
    };
    const window = {
        top: {
            location: { pathname: '/WebPonto/just_user/justuser.asp' },
            document: {
                querySelector(selector) {
                    return selector === 'frame[name="mainFrame"]' ? frameElement : null;
                }
            },
            frames: [{ name: 'topFrame' }, bodyFrame, footerFrame]
        }
    };
    const sourceCore = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    const sourcePopup = readFileSync(join(__dirname, '..', '30-popup.js'), 'utf8');
    const sourcePhases = readFileSync(join(__dirname, '..', '40-fases.js'), 'utf8');
    const sourceReports = readFileSync(join(__dirname, '..', '60-relatorios.js'), 'utf8');
    const storage = new Map();
    const sessionStorage = {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key)
    };
    const SyntheticDate = class extends Date {
        static now() {
            return clock.now;
        }
    };

    vm.runInNewContext(sourceCore, {
        window,
        Date: SyntheticDate,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clear.bind(clock),
        setInterval: clock.setInterval.bind(clock),
        clearInterval: clock.clear.bind(clock),
        sessionStorage,
        Event: class {},
        console
    });
    vm.runInNewContext(sourcePopup, {
        window,
        Date: SyntheticDate,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clear.bind(clock),
        setInterval: clock.setInterval.bind(clock),
        clearInterval: clock.clear.bind(clock),
        sessionStorage,
        Event: class {},
        console
    });
    vm.runInNewContext(sourcePhases, {
        window,
        Date: SyntheticDate,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clear.bind(clock),
        setInterval: clock.setInterval.bind(clock),
        clearInterval: clock.clear.bind(clock),
        sessionStorage,
        Event: class {},
        console
    });
    vm.runInNewContext(sourceReports, {
        window,
        Date: SyntheticDate,
        setTimeout: clock.setTimeout.bind(clock),
        clearTimeout: clock.clear.bind(clock),
        setInterval: clock.setInterval.bind(clock),
        clearInterval: clock.clear.bind(clock),
        sessionStorage,
        Event: class {},
        console
    });

    const AF = window.AutomacaoFolha;
    AF.core.exigirEstrutura = () => true;
    AF.core.getDoc1 = () => bodyFrame.document;

    return {
        AF,
        bodyFrame,
        frameListeners,
        footerButton,
        sessionStorage,
        replaceBody() {
            bodyFrame.document = makeBodyDocument();
            for (const listener of frameListeners) listener();
        },
        setBodyAccessError(value) {
            bodyAccessError = value;
        },
        popup
    };
}

async function drive(clock, promise, maxMs, stepMs = 25) {
    let settled = false;
    let value;
    let failure;
    promise.then(
        result => {
            settled = true;
            value = result;
        },
        error => {
            settled = true;
            failure = error;
        }
    );

    for (let elapsed = 0; elapsed <= maxMs && !settled; elapsed += stepMs) {
        clock.advance(stepMs);
        await Promise.resolve();
        await Promise.resolve();
    }
    if (!settled) throw new Error('Synthetic operation did not settle within its test limit.');
    if (failure) throw failure;
    return value;
}

test('popup readiness returns explicit ready, timeout, early-close, and access-error outcomes', async () => {
    const readyClock = new SyntheticClock();
    const readyPopup = makePopup(['01/10/2026']);
    const readyEnv = createEnvironment(readyClock, readyPopup);
    const readyRun = readyEnv.AF.core.iniciarExecucaoAjuste();
    const ready = await readyEnv.AF.popup.aguardarPopupPronto(readyRun, { popup: readyPopup });
    assert.equal(ready.status, 'ready');
    assert.equal(ready.value, readyPopup);

    const timeoutClock = new SyntheticClock();
    const timeoutEnv = createEnvironment(timeoutClock, null);
    const timeoutRun = timeoutEnv.AF.core.iniciarExecucaoAjuste();
    const timeoutWait = timeoutEnv.AF.popup.aguardarPopupPronto(timeoutRun, { popup: null });
    const timeout = await drive(timeoutClock, timeoutWait, 19000, 300);
    assert.equal(timeout.status, 'timeout');
    assert.match(timeout.reason, /capturada/);
    assert.equal(timeoutClock.timers.size, 0);

    const closedClock = new SyntheticClock();
    const closedEnv = createEnvironment(closedClock, null);
    const closedRun = closedEnv.AF.core.iniciarExecucaoAjuste();
    const closed = await closedEnv.AF.popup.aguardarPopupPronto(closedRun, {
        popup: { get closed() { return true; } }
    });
    assert.equal(closed.status, 'error');
    assert.match(closed.reason, /fechado antes/);

    const accessClock = new SyntheticClock();
    const accessEnv = createEnvironment(accessClock, null);
    const accessRun = accessEnv.AF.core.iniciarExecucaoAjuste();
    const inaccessible = await accessEnv.AF.popup.aguardarPopupPronto(accessRun, {
        popup: {
            get closed() { return false; },
            get document() { throw new Error('popup access denied'); }
        }
    });
    assert.equal(inaccessible.status, 'error');
    assert.equal(inaccessible.reason, 'popup access denied');
});

test('popup readiness waits through the observed redirect before checking the final route', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    popup.location.pathname = '';
    const env = createEnvironment(clock, popup);
    const run = env.AF.core.iniciarExecucaoAjuste();
    const wait = env.AF.popup.aguardarPopupPronto(run, { popup });

    clock.setTimeout(() => { popup.location.pathname = '/RedirecionamentoAspx.asp'; }, 300);
    clock.setTimeout(() => {
        popup.location.pathname = '/WebPontoDotNet/Justificativa/TrocarHorario.aspx';
    }, 900);

    const outcome = await drive(clock, wait, 2000, 100);

    assert.equal(outcome.status, 'ready');
    assert.equal(outcome.value, popup);
    assert.equal(clock.timers.size, 0);
    run.cancel('test finished');
});

test('popup readiness treats the about:blank pathname as a transient route', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    popup.location.pathname = 'blank';
    const env = createEnvironment(clock, popup);
    const run = env.AF.core.iniciarExecucaoAjuste();
    const wait = env.AF.popup.aguardarPopupPronto(run, { popup });

    clock.setTimeout(() => { popup.location.pathname = '/RedirecionamentoAspx.asp'; }, 300);
    clock.setTimeout(() => {
        popup.location.pathname = '/WebPontoDotNet/Justificativa/TrocarHorario.aspx';
    }, 900);

    const outcome = await drive(clock, wait, 2000, 100);

    assert.equal(outcome.status, 'ready');
    assert.equal(outcome.value, popup);
    assert.equal(clock.timers.size, 0);
    run.cancel('test finished');
});

test('popup readiness rejects a completed unsupported route with its path in the diagnosis', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    popup.location.pathname = '/unexpected-popup.asp';
    const env = createEnvironment(clock, popup);
    const run = env.AF.core.iniciarExecucaoAjuste();

    const outcome = await env.AF.popup.aguardarPopupPronto(run, { popup });

    assert.equal(outcome.status, 'error');
    assert.match(outcome.reason, /unexpected-popup\.asp/);
    run.cancel('test finished');
});

test('body observer recognizes a fast reload before popup closure, including an empty sheet', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { submitted: false, submittedAt: null };
    const observer = env.AF.popup.observarReloadPrincipal(run, attempt);

    observer.marcarEnvio();
    clock.setTimeout(() => env.replaceBody(), 50);
    clock.setTimeout(() => popup.close(), 100);
    clock.advance(300);

    const reload = observer.inspecionar();
    assert.equal(reload.ready, true);
    assert.equal(reload.value.document.body.className, 'Tudo');
    assert.equal(popup.closed, true);
    observer.dispose();
    run.cancel('test finished');
    assert.equal(env.frameListeners.size, 0);
});

test('same old ready body document is not accepted as a post-save reload', () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, makePopup(['01/10/2026']));
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { submitted: false };
    const observer = env.AF.popup.observarReloadPrincipal(run, attempt);

    observer.marcarEnvio();
    clock.advance(5000);

    assert.equal(observer.inspecionar().ready, false);
    observer.dispose();
    run.cancel('test finished');
});

test('popup closure and body reload without a recognized message remain unconfirmed', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    env.AF.core.prazosEsperaAjuste.bodyReload.deadlineMs = 600;
    env.AF.core.prazosEsperaAjuste.popupCompletion.deadlineMs = 1200;
    const attempt = { execucao: run, popup, submitted: false };
    popup.state.onSave = () => {
        clock.setTimeout(() => env.replaceBody(), 50);
        clock.setTimeout(() => popup.close(), 100);
    };

    const outcome = await drive(clock, env.AF.popup.tentarIndiceDatas(
        popup,
        ['01/10/2026'],
        0,
        run,
        attempt
    ), 3000, 100);

    assert.equal(outcome.status, 'timeout');
    assert.equal(outcome.stage, 'popup-close-after-reload');
    assert.equal(outcome.unconfirmed, true);
    assert.equal(popup.state.saves, 1);
    assert.equal(attempt.bodyReloaded, true);
    assert.equal(env.frameListeners.size, 0);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('popup success message is captured before OK and requires popup closure plus body reload', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };
    popup.state.onSave = () => {
        popup.state.resultMessage = 'Alteração realizada com sucesso!';
    };
    popup.state.onAcknowledge = (target, message) => {
        if (message !== 'Alteração realizada com sucesso!') return;
        clock.setTimeout(() => popup.close(), 50);
        clock.setTimeout(() => env.replaceBody(), 100);
    };

    const outcome = await drive(
        clock,
        env.AF.popup.tentarIndiceDatas(popup, ['01/10/2026'], 0, run, attempt),
        6000
    );

    assert.equal(outcome.status, 'ready');
    assert.equal(outcome.message, 'Alteração realizada com sucesso!');
    assert.equal(attempt.popupClosed, true);
    assert.equal(attempt.bodyReloaded, true);
    assert.equal(popup.state.saves, 1);
    run.cancel('test finished');
});

test('equal-hours rejection remains no-change when OK closes popup and reloads the body', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['first', 'second']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };
    popup.state.onSave = () => { popup.state.rejected = true; };
    popup.state.onAcknowledge = () => {
        clock.setTimeout(() => env.replaceBody(), 50);
        clock.setTimeout(() => popup.close(), 100);
    };

    const outcome = await drive(
        clock,
        env.AF.popup.tentarIndiceDatas(popup, ['first', 'second'], 0, run, attempt),
        6000
    );

    assert.equal(outcome.status, 'no-change');
    assert.equal(outcome.message, 'Dias selecionados possuem horários iguais!');
    assert.equal(outcome.popupClosed, true);
    assert.equal(popup.state.saves, 1);
    assert.equal(env.frameListeners.size, 0);
    run.cancel('test finished');
});

test('unrecognized popup message stops without treating the reload as success', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };
    popup.state.onSave = () => {
        popup.state.resultMessage = 'Mensagem nao mapeada';
        clock.setTimeout(() => env.replaceBody(), 50);
        clock.setTimeout(() => popup.close(), 100);
    };

    const outcome = await drive(
        clock,
        env.AF.popup.tentarIndiceDatas(popup, ['01/10/2026'], 0, run, attempt),
        3000
    );

    assert.equal(outcome.status, 'error');
    assert.equal(outcome.stage, 'popup-result');
    assert.equal(outcome.unconfirmed, true);
    assert.equal(popup.state.saves, 1);
    run.cancel('test finished');
});

test('supported rejection preserves candidate order and only submits the next candidate', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['first', 'second']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };
    popup.state.onSave = saveCount => {
        if (saveCount === 1) {
            popup.state.rejected = true;
            return;
        }
        popup.state.resultMessage = 'Alteração realizada com sucesso!';
    };
    popup.state.onAcknowledge = (target, message) => {
        if (message !== 'Alteração realizada com sucesso!') return;
        clock.setTimeout(() => env.replaceBody(), 50);
        clock.setTimeout(() => popup.close(), 100);
    };

    const outcome = await drive(
        clock,
        env.AF.popup.tentarIndiceDatas(popup, ['first', 'second'], 0, run, attempt),
        6000
    );

    assert.equal(outcome.status, 'ready');
    assert.equal(popup.state.saves, 2);
    assert.deepEqual(popup.state.selectedDates, ['0', '1']);
    assert.equal(attempt.rejected, true);
    assert.equal(attempt.bodyReloaded, true);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('candidate exhaustion remains a confirmed no-change outcome without save submission', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['other date']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };

    const outcome = await drive(
        clock,
        env.AF.popup.tentarIndiceDatas(popup, ['missing date'], 0, run, attempt),
        1000
    );

    assert.equal(outcome.status, 'no-change');
    assert.equal(outcome.exhausted, true);
    assert.equal(attempt.submitted, false);
    assert.equal(popup.state.saves, 0);
    assert.equal(popup.closed, true);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('uncertain popup save times out without retrying and inspection errors remain explicit', async () => {
    const timeoutClock = new SyntheticClock();
    const timeoutPopup = makePopup(['01/10/2026']);
    const timeoutEnv = createEnvironment(timeoutClock, timeoutPopup);
    timeoutEnv.AF.estado.cancelado = false;
    const timeoutRun = timeoutEnv.AF.core.iniciarExecucaoAjuste();
    const timeoutAttempt = { execucao: timeoutRun, popup: timeoutPopup, submitted: false };
    const timeoutPromise = timeoutEnv.AF.popup.tentarIndiceDatas(
        timeoutPopup,
        ['01/10/2026'],
        0,
        timeoutRun,
        timeoutAttempt
    );
    const timeout = await drive(timeoutClock, timeoutPromise, 30000, 300);

    assert.equal(timeout.status, 'timeout');
    assert.equal(timeout.unconfirmed, true);
    assert.equal(timeoutPopup.state.saves, 1);
    timeoutClock.advance(60000);
    assert.equal(timeoutPopup.state.saves, 1);
    timeoutRun.cancel('test finished');

    const errorClock = new SyntheticClock();
    const errorPopup = makePopup(['01/10/2026']);
    const errorEnv = createEnvironment(errorClock, errorPopup);
    errorEnv.AF.estado.cancelado = false;
    const errorRun = errorEnv.AF.core.iniciarExecucaoAjuste();
    const errorAttempt = { execucao: errorRun, popup: errorPopup, submitted: false };
    errorPopup.state.onSave = () => errorEnv.setBodyAccessError(true);
    const inspectionError = await drive(
        errorClock,
        errorEnv.AF.popup.tentarIndiceDatas(errorPopup, ['01/10/2026'], 0, errorRun, errorAttempt),
        3000
    );

    assert.equal(inspectionError.status, 'error');
    assert.equal(inspectionError.unconfirmed, true);
    assert.match(inspectionError.reason, /main frame access denied/);
    assert.equal(errorPopup.state.saves, 1);
    errorRun.cancel('test finished');
});

test('cancelling before the delayed popup save prevents any write', async () => {
    const clock = new SyntheticClock();
    const popup = makePopup(['01/10/2026']);
    const env = createEnvironment(clock, popup);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const attempt = { execucao: run, popup, submitted: false };
    const pending = env.AF.popup.tentarIndiceDatas(popup, ['01/10/2026'], 0, run, attempt);

    run.cancel('user stop');
    const outcome = await pending;
    clock.advance(2000);

    assert.equal(outcome.status, 'cancelled');
    assert.equal(popup.state.saves, 0);
    assert.equal(attempt.submitted, false);
    assert.equal(clock.timers.size, 0);
});

test('footer save reports completion only after a structural body reload and preserved stabilization', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const messages = [];
    env.AF.core.log = message => messages.push(message);
    env.AF.core.exigirEstrutura = () => true;
    env.footerButton.onClick = () => clock.setTimeout(() => env.replaceBody(), 50);

    const result = await drive(clock, env.AF.fases.gravar([]), 8000);

    assert.equal(result.status, 'ready');
    assert.equal(env.footerButton.clicks, 1);
    assert(messages.includes('Gravacao observada: pagina principal recarregada.'));
    assert.equal(messages.includes('Gravado.'), false);
    assert.equal(env.frameListeners.size, 0);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('footer save timeout is explicit, unconfirmed, and is not retried', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    env.AF.estado.cancelado = false;
    env.AF.core.iniciarExecucaoAjuste();
    env.AF.core.log = () => {};
    env.AF.core.exigirEstrutura = () => true;

    const result = await drive(clock, env.AF.fases.gravar([]), 15000, 300);

    assert.equal(result.status, 'timeout');
    assert.equal(result.stage, 'footer-save-reload');
    assert.equal(result.unconfirmed, true);
    assert.equal(env.footerButton.clicks, 1);
    assert.equal(env.AF.estado.cancelado, true);
    assert.equal(env.frameListeners.size, 0);
    assert.equal(clock.timers.size, 0);
});

test('adjustment employee navigation waits for a structural transition, including an empty sheet', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const selector = { selectedIndex: 0, options: [{ text: 'A' }, { text: 'B' }] };
    let updated = 0;
    env.AF.core.getSelNome = () => selector;
    env.AF.core.getDocC = () => ({
        yourform: { lstNome: {}, CodEmpresaEmpregado: {} }
    });
    env.AF.core.getCabec = () => ({
        AjustaCodEmpresaEmpregado() {},
        AtualizaFuncionario() {
            updated++;
            clock.setTimeout(() => env.replaceBody(), 50);
        }
    });

    const outcome = await drive(clock, env.AF.core.avancarFuncionario(run), 8000);

    assert.equal(outcome.status, 'ready');
    assert.equal(outcome.value, 'ok');
    assert.equal(selector.selectedIndex, 1);
    assert.equal(updated, 1);
    assert.equal(env.frameListeners.size, 0);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('adjustment employee readiness timeout is explicit and prevents another navigation', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    const selector = { selectedIndex: 0, options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }] };
    let updates = 0;
    env.AF.core.getSelNome = () => selector;
    env.AF.core.getDocC = () => ({
        yourform: { lstNome: {}, CodEmpresaEmpregado: {} }
    });
    env.AF.core.getCabec = () => ({
        AjustaCodEmpresaEmpregado() {},
        AtualizaFuncionario() { updates++; }
    });

    const outcome = await drive(clock, env.AF.core.avancarFuncionario(run), 18000, 500);

    assert.equal(outcome.status, 'timeout');
    assert.equal(outcome.stage, 'employee-readiness');
    assert.equal(updates, 1);
    assert.equal(selector.selectedIndex, 1);
    assert.equal(env.frameListeners.size, 0);
    run.cancel('test finished');
    assert.equal(clock.timers.size, 0);
});

test('fatal orchestration failure cleans the run and publishes its diagnosis in a partial report', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    const statuses = [];
    const buttonStates = [];
    let cleanupCount = 0;
    let navigationCount = 0;
    let popupCloseCount = 0;
    for (const key of [
        'autodataTrocar',
        'autodataFallback',
        'autodatasCandidatasPopup',
        'autopopupSemSucesso'
    ]) {
        env.sessionStorage.setItem(key, 'stale-intent');
    }
    env.AF.estado.ultimoPopup = {
        closed: false,
        close() { popupCloseCount++; }
    };
    env.AF.estado.ajustePopupTentativa = { stale: true };
    env.AF.core.setBotoes = running => buttonStates.push(running);
    env.AF.core.getDocC = () => ({
        getElementById(id) {
            return id === 'log-box' ? { innerHTML: '' } : null;
        }
    });
    env.AF.core.exigirEstrutura = () => true;
    env.AF.core.getSelNome = () => ({
        selectedIndex: 0,
        options: [{ text: 'Funcionario Sintetico' }]
    });
    env.AF.core.getCabec = () => ({});
    env.AF.core.nomeAtual = () => 'Funcionario Sintetico';
    env.AF.core.instalarInterceptorPopup = run => run.addCleanup(() => cleanupCount++);
    env.AF.core.avancarFuncionario = async () => {
        navigationCount++;
        return { status: 'ready', value: 'fim' };
    };
    env.AF.core.log = () => {};
    env.AF.painel = { setStatus: (text, color) => statuses.push({ text, color }) };
    env.AF.sons = { tocar() {} };
    env.AF.fases.processarFolhaAtual = async () => {
        throw new Error('synthetic wait failure');
    };

    await env.AF.fases.processarTodas();

    assert.equal(env.AF.estado.cancelado, true);
    assert.equal(env.AF.estado.rodando, false);
    assert.equal(env.AF.estado.falhaAjuste.stage, 'adjustment-orchestration');
    assert.equal(env.AF.estado.falhaAjuste.reason, 'synthetic wait failure');
    assert.equal(env.AF.estado.execucaoAjuste.ativa, false);
    assert.equal(cleanupCount, 1);
    assert.deepEqual(buttonStates, [true, false, false]);
    assert.equal(navigationCount, 0);
    assert.equal(popupCloseCount, 1);
    assert.equal(env.AF.estado.ultimoPopup, null);
    assert.equal(env.AF.estado.ajustePopupTentativa, null);
    for (const key of [
        'autodataTrocar',
        'autodataFallback',
        'autodatasCandidatasPopup',
        'autopopupSemSucesso'
    ]) {
        assert.equal(env.sessionStorage.getItem(key), null);
    }
    assert.match(env.AF.estado.relatorio, /Motivo da interrupcao: adjustment-orchestration: synthetic wait failure/);
    assert.match(statuses[0].text, /Interrompido \(adjustment-orchestration\): synthetic wait failure/);
    assert.equal(env.AF.estado.relatorioMeta.folhas, 0);
    assert.equal(clock.timers.size, 0);
});

async function runBlankStartupWithOptions(optionTexts) {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    const selector = {
        selectedIndex: 0,
        options: optionTexts.map(text => ({ text }))
    };
    const structureChecks = [];
    let updates = 0;
    let transitionArmed = 0;
    let transitionDisposed = 0;
    let readinessChecks = 0;
    let processedSheets = 0;
    const logBox = { innerHTML: '' };
    const headerDocument = {
        yourform: { lstNome: selector, CodEmpresaEmpregado: {} },
        getElementById: id => id === 'log-box' ? logBox : null
    };

    env.AF.core.getDocC = () => headerDocument;
    env.AF.core.getSelNome = () => selector;
    env.AF.core.getCabec = () => ({
        AjustaCodEmpresaEmpregado() {},
        AtualizaFuncionario() { updates++; }
    });
    env.AF.core.setBotoes = () => {};
    env.AF.core.exigirEstrutura = (stage, popupWindow, allowEmptyStart) => {
        structureChecks.push({ stage, popupWindow, allowEmptyStart });
        return true;
    };
    env.AF.core.instalarInterceptorPopup = () => {};
    env.AF.core.observarTransicaoCorpo = () => ({
        armarTransicao() { transitionArmed++; },
        dispose() { transitionDisposed++; }
    });
    env.AF.core.aguardarTransicaoCorpo = async () => {
        readinessChecks++;
        return { status: 'ready' };
    };
    env.AF.core.nomeAtual = () => (selector.options[selector.selectedIndex].text || '').trim();
    env.AF.core.avancarFuncionario = async () => ({ status: 'ready', value: 'fim' });
    env.AF.core.log = () => {};
    env.AF.relatorios.gerarFolgas = () => {};
    env.AF.sons = { tocar() {} };
    env.AF.fases.processarFolhaAtual = async () => { processedSheets++; };

    await env.AF.fases.processarTodas();

    return {
        clock,
        env,
        selector,
        structureChecks,
        updates,
        transitionArmed,
        transitionDisposed,
        readinessChecks,
        processedSheets
    };
}

test('blank employee startup uses current options across different synthetic lists', async () => {
    const lists = [
        ['', 'Pessoa sintetica alfa'],
        ['', 'Pessoa sintetica beta', 'Pessoa sintetica gama', 'Pessoa sintetica delta']
    ];

    for (const options of lists) {
        const result = await runBlankStartupWithOptions(options);

        assert.equal(result.structureChecks[0].stage, 'inicio do ajuste');
        assert.equal(result.structureChecks[0].allowEmptyStart, true);
        assert.equal(result.structureChecks[1].stage, 'processamento da folha');
        assert.equal(result.structureChecks[1].allowEmptyStart, undefined);
        assert.equal(result.selector.selectedIndex, options.findIndex(text => text.trim()));
        assert.equal(result.updates, 1);
        assert.equal(result.transitionArmed, 1);
        assert.equal(result.transitionDisposed, 1);
        assert.equal(result.readinessChecks, 1);
        assert.equal(result.processedSheets, 1);
        assert.equal(result.env.AF.estado.rodando, false);
        assert.equal(result.env.footerButton.clicks, 0);
        assert.equal(result.clock.timers.size, 0);
    }
});

test('an interrupted sheet retains confirmed changes without marking the sheet complete', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    env.AF.estado.cancelado = false;
    const run = env.AF.core.iniciarExecucaoAjuste();
    env.AF.core.nomeAtual = () => 'Funcionario Sintetico';
    env.AF.core.paginaVaziaAgora = () => false;
    env.AF.core.log = () => {};
    env.AF.fases.processarFase1 = async execucao => {
        env.AF.core.pararExecucaoAjuste({
            status: 'timeout',
            stage: 'popup-save-completion',
            reason: 'reload nao observado',
            unconfirmed: true
        }, execucao);
        return { movidas: 2, presas: [{ fase: 1 }] };
    };
    env.AF.fases.processarFase2 = async () => {
        throw new Error('A canceled sheet must not continue to another phase.');
    };

    const stats = {
        totalFolhas: 0,
        semMarcacoes: 0,
        folgasAlteradas: 0,
        folgasNaoAlteradas: 0,
        irregsRestantes: 0,
        interjRestantes: 0,
        linhas47: 0
    };
    const entry = {
        nome: 'Funcionario Sintetico',
        lido: false,
        pulada: false,
        folgasAlteradas: null,
        folgasSemAlteracao: null,
        linhas47: null,
        irregs: null,
        interj: null,
        HE: null,
        HEF: null,
        HEC: null
    };

    await env.AF.fases.processarFolhaAtual(stats, [entry], { 'Funcionario Sintetico': entry }, run);

    assert.equal(entry.lido, false);
    assert.equal(entry.parcial, true);
    assert.equal(entry.folgasAlteradas, 2);
    assert.equal(entry.folgasSemAlteracao, 1);
    assert.equal(stats.totalFolhas, 0);
    assert.equal(stats.folgasAlteradas, 2);
    assert.equal(stats.folgasNaoAlteradas, 1);
    env.AF.relatorios.gerarFolgas(
        stats,
        [entry],
        1000,
        true,
        env.AF.estado.falhaAjuste
    );
    assert.match(env.AF.estado.relatorio, /Motivo da interrupcao: popup-save-completion: reload nao observado \(resultado nao confirmado\)/);
    assert.match(env.AF.estado.relatorio, /Funcionario Sintetico\t2\t\t1/);
    assert.equal(env.AF.estado.relatorioLista[0].lido, false);
    assert.equal(env.AF.estado.relatorioLista[0].parcial, true);
    assert.equal(env.AF.estado.relatorioLista[0].folgas, 2);
    assert.equal(clock.timers.size, 0);
});

test('shared analysis employee navigation keeps its legacy behavior without an adjustment run', async () => {
    const clock = new SyntheticClock();
    const env = createEnvironment(clock, null);
    const selector = { selectedIndex: 0, options: [{ text: 'A' }, { text: 'B' }] };
    let updated = 0;
    env.AF.core.getSelNome = () => selector;
    env.AF.core.getDocC = () => ({
        yourform: { lstNome: {}, CodEmpresaEmpregado: {} }
    });
    env.AF.core.getCabec = () => ({
        AjustaCodEmpresaEmpregado() {},
        AtualizaFuncionario() { updated++; }
    });
    env.AF.core.paginaVaziaAgora = () => false;
    env.AF.core.getDoc1 = () => ({ querySelectorAll: () => [{}] });

    const navigation = env.AF.core.avancarFuncionario();
    clock.advance(6000);
    await Promise.resolve();
    clock.advance(500);

    assert.equal(await navigation, 'ok');
    assert.equal(selector.selectedIndex, 1);
    assert.equal(updated, 1);
});
