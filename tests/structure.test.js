'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadCore(window = {}) {
    const source = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    vm.runInNewContext(source, { window });
    return window.AutomacaoFolha.core;
}

function loadValidator() {
    return loadCore().validarEstrutura;
}

function supportedStructure() {
    return {
        entryPath: '/WebPonto/just_user/justuser.asp',
        frames: [
            {
                name: 'topFrame',
                path: '/WebPonto/just_user/justuser_cabec.asp',
                readyState: 'complete',
                bodyClass: 'Painel',
                form: {
                    name: 'yourform',
                    method: 'post',
                    action: 'justuser_cabec.asp',
                    target: ''
                },
                employeeSelector: true,
                employeeSelectionEmpty: false
            },
            {
                name: 'mainFrame',
                path: '/WebPonto/just_user/justuser_corpo.asp',
                readyState: 'complete',
                bodyClass: 'Tudo',
                form: {
                    name: 'myForm',
                    method: 'post',
                    action: 'justuser_corpo.asp'
                },
                hasSelectedRecords: false
            },
            {
                name: 'bottomFrame',
                path: '/WebPonto/just_user/justuser_rodape.asp',
                readyState: 'complete',
                bodyClass: 'Painel',
                saveControl: true
            }
        ]
    };
}

function initialBlankStructure() {
    const estrutura = supportedStructure();
    estrutura.frames[0].employeeSelectionEmpty = true;
    estrutura.frames[1] = {
        name: 'mainFrame',
        path: '/WebPonto/blank.htm',
        readyState: 'complete',
        bodyClass: '',
        form: {
            name: 'myForm',
            method: 'post',
            action: 'blank.htm'
        },
        hasSelectedRecords: false
    };
    return estrutura;
}

test('supported Justificativas structure passes without employee or sheet data', () => {
    const validarEstrutura = loadValidator();

    const resultado = validarEstrutura(supportedStructure(), false);
    assert.equal(resultado.ok, true);
    assert.equal(resultado.erros.length, 0);
});

test('an empty initial selection may bootstrap only from the clean documented blank frame', () => {
    const validarEstrutura = loadValidator();
    const estrutura = initialBlankStructure();

    assert.equal(validarEstrutura(estrutura, false).ok, false);
    assert.equal(validarEstrutura(estrutura, false, true).ok, true);

    estrutura.frames[1].hasSelectedRecords = true;
    assert.equal(validarEstrutura(estrutura, false, true).ok, false);

    estrutura.frames[1].hasSelectedRecords = false;
    estrutura.frames[0].employeeSelectionEmpty = false;
    assert.equal(validarEstrutura(estrutura, false, true).ok, false);
});

test('structure collection records only empty-selector and selected-row flags for blank startup', () => {
    const headerForm = {
        name: 'yourform',
        method: 'POST',
        target: '',
        getAttribute: () => 'justuser_cabec.asp'
    };
    const bodyForm = {
        name: 'myForm',
        method: 'POST',
        getAttribute: () => 'blank.htm'
    };
    const selector = { options: [{ text: '' }], selectedIndex: 0 };
    const headerDocument = {
        readyState: 'complete',
        body: { className: 'Painel' },
        querySelector(query) {
            if (query === 'form[name="yourform"]') return headerForm;
            if (query === 'select#lstNome[name="lstNome"]') return selector;
            return null;
        }
    };
    const bodyDocument = {
        readyState: 'complete',
        body: { className: '' },
        querySelector(query) {
            if (query === 'form[name="myForm"]') return bodyForm;
            if (query === 'input[name^="Selecionado"]:checked') return null;
            return null;
        }
    };
    const footerDocument = {
        readyState: 'complete',
        body: { className: 'Painel' },
        getElementById: id => id === 'btnGravar' ? {} : null
    };
    const window = {
        top: {
            location: { pathname: '/WebPonto/just_user/justuser.asp' },
            frames: [
                { name: 'topFrame', location: { pathname: '/WebPonto/just_user/justuser_cabec.asp' }, document: headerDocument },
                { name: 'mainFrame', location: { pathname: '/WebPonto/blank.htm' }, document: bodyDocument },
                { name: 'bottomFrame', location: { pathname: '/WebPonto/just_user/justuser_rodape.asp' }, document: footerDocument }
            ]
        }
    };
    const core = loadCore(window);
    const estrutura = core.coletarEstrutura();

    assert.equal(estrutura.frames[0].employeeSelectionEmpty, true);
    assert.equal(estrutura.frames[1].hasSelectedRecords, false);
    assert.equal(core.validarEstrutura(estrutura, false, true).ok, true);
});

test('missing frame, form, and required control produce explicit failures', () => {
    const validarEstrutura = loadValidator();
    const estrutura = supportedStructure();
    estrutura.frames[0] = null;
    estrutura.frames[1].form = null;
    estrutura.frames[2].saveControl = false;

    const resultado = validarEstrutura(estrutura, false);
    assert.equal(resultado.ok, false);
    assert.match(resultado.erros.join('; '), /frame topFrame indisponivel/);
    assert.match(resultado.erros.join('; '), /form myForm ausente/);
    assert.match(resultado.erros.join('; '), /controle btnGravar ausente no bottomFrame/);
});

test('mismatched page and frame paths fail closed', () => {
    const validarEstrutura = loadValidator();
    const estrutura = supportedStructure();
    estrutura.entryPath = '/WebPonto/just_user/outro.asp';
    estrutura.frames[1].path = '/WebPonto/just_user/outro_corpo.asp';

    const resultado = validarEstrutura(estrutura, false);
    assert.equal(resultado.ok, false);
    assert.match(resultado.erros.join('; '), /pagina principal nao e justuser.asp/);
    assert.match(resultado.erros.join('; '), /caminho do mainFrame inesperado/);
});

test('popup preconditions require the documented page, form, selector, and save control', () => {
    const validarEstrutura = loadValidator();
    const estrutura = supportedStructure();
    estrutura.popup = {
        path: '/WebPontoDotNet/Justificativa/TrocarHorario.aspx',
        readyState: 'complete',
        form: true,
        dateSelector: true,
        saveControl: true
    };

    const valido = validarEstrutura(estrutura, true);
    assert.equal(valido.ok, true);
    assert.equal(valido.erros.length, 0);

    estrutura.popup.saveControl = false;
    const resultado = validarEstrutura(estrutura, true);
    assert.equal(resultado.ok, false);
    assert.match(resultado.erros.join('; '), /controle btnGravar ausente no popup/);
});

test('exigirEstrutura flags failure and cancels run when preconditions fail', () => {
    const window = {
        top: {
            location: { pathname: '/WebPonto/just_user/invalid.asp' },
            frames: []
        }
    };
    const source = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    vm.runInNewContext(source, { window });

    const AF = window.AutomacaoFolha;
    let statusSet = null;
    AF.painel = {
        setStatus(texto, cor) {
            statusSet = { texto, cor };
        }
    };

    const ok = AF.core.exigirEstrutura('teste');
    assert.equal(ok, false);
    assert.equal(AF.estado.falhaPrecondicao, true);
    assert.equal(AF.estado.cancelado, true);
    assert.match(statusSet.texto, /Interrompido \(teste\):/);
    assert.equal(statusSet.cor, '#f87171');
});

test('popup interaction stops before edits or save if popup structure is invalid', () => {
    const window = {
        AutomacaoFolha: {
            estado: { cancelado: false }
        }
    };
    const coreSource = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    const popupSource = readFileSync(join(__dirname, '..', '30-popup.js'), 'utf8');
    vm.runInNewContext(coreSource, { window });
    vm.runInNewContext(popupSource, { window });

    const AF = window.AutomacaoFolha;
    let clicked = false;
    let dispatched = false;

    // Simula popup que não atende as precondições (ex: página errada)
    const mockPopup = {
        closed: false,
        location: { pathname: '/WebPontoDotNet/Outro.aspx' },
        document: {
            readyState: 'complete',
            querySelector(sel) {
                if (sel === 'input[name="btnGravar"]') return { click() { clicked = true; } };
                return null;
            },
            getElementById(id) {
                if (id === 'rpnPeriodo_ddlDatas') {
                    return {
                        options: [{ text: '10/10/2026', value: '1', index: 0 }],
                        dispatchEvent() { dispatched = true; }
                    };
                }
                return null;
            }
        }
    };

    AF.popup.tentarIndiceDatas(mockPopup, ['10/10/2026'], 0, {
        isActive: () => true,
        setTimeout() {
            throw new Error('A estrutura invalida nao deve agendar a gravacao.');
        },
        setInterval() {
            throw new Error('A estrutura invalida nao deve iniciar polling.');
        },
        clearTimer() {}
    });

    // Como exigirEstrutura falhou, nem o dispatch de alteração nem o clique de gravar devem ter ocorrido
    assert.equal(dispatched, false);
    assert.equal(clicked, false);
    assert.equal(AF.estado.falhaPrecondicao, true);
    assert.equal(AF.estado.cancelado, true);
});

test('phase 4 fields modification and footer save stop when structure is invalid', async () => {
    const window = {
        top: {
            location: { pathname: '/WebPonto/just_user/invalid.asp' },
            frames: []
        },
        AutomacaoFolha: {
            estado: { cancelado: false }
        }
    };
    const coreSource = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    const fasesSource = readFileSync(join(__dirname, '..', '40-fases.js'), 'utf8');
    vm.runInNewContext(coreSource, { window });
    vm.runInNewContext(fasesSource, { window });

    const AF = window.AutomacaoFolha;

    const nsMarcados = AF.fases.processarFase4();
    assert.equal(Array.isArray(nsMarcados), true);
    assert.equal(nsMarcados.length, 0);
    assert.equal(AF.estado.falhaPrecondicao, true);
    assert.equal(AF.estado.cancelado, true);

    // Testar gravar
    AF.estado.falhaPrecondicao = false;
    AF.estado.cancelado = false;
    AF.core.iniciarExecucaoAjuste();
    let saved = false;
    await AF.fases.gravar(['1']);
    assert.equal(AF.estado.falhaPrecondicao, true);
    assert.equal(AF.estado.cancelado, true);
});

function loadCoreWithSounds() {
    const window = { top: { location: { pathname: '/WebPonto/just_user/invalid.asp' }, frames: [] } };
    const source = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    vm.runInNewContext(source, { window, console: { log() {}, error() {} } });
    const AF = window.AutomacaoFolha;
    const sons = [];
    AF.sons = { tocar(tipo) { sons.push(tipo); } };
    return { AF, sons };
}

test('structure failure during an active adjustment plays the failure sound once and no completion sound', () => {
    const { AF, sons } = loadCoreWithSounds();
    AF.estado.execucaoAjuste = AF.core.iniciarExecucaoAjuste();

    assert.equal(AF.core.exigirEstrutura('inicio do ajuste', null, true), false);

    assert.deepEqual(sons, ['falha']);
});

test('an error after the user already stopped the run does not play a second sound', () => {
    const { AF, sons } = loadCoreWithSounds();
    const execucao = AF.core.iniciarExecucaoAjuste();
    AF.estado.execucaoAjuste = execucao;

    AF.core.pararExecucaoAjuste({ status: 'cancelled', stage: 'user-stop', reason: 'Parada solicitada pelo usuario.' }, execucao);
    AF.core.pararExecucaoAjuste({ status: 'error', stage: 'popup-save', reason: 'falha tardia' }, execucao);

    assert.deepEqual(sons, []);
});

test('a user-stop cancellation never plays the failure sound', () => {
    const { AF, sons } = loadCoreWithSounds();
    AF.estado.execucaoAjuste = AF.core.iniciarExecucaoAjuste();

    AF.core.cancelarTudo();

    assert.deepEqual(sons, []);
});

test('an error stop without an active adjustment does not play the failure sound', () => {
    const { AF, sons } = loadCoreWithSounds();

    AF.core.pararExecucaoAjuste({ status: 'error', stage: 'qualquer', reason: 'sem execucao' });

    assert.deepEqual(sons, []);
});
