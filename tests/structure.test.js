'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadValidator() {
    const window = {};
    const source = readFileSync(join(__dirname, '..', '00-core.js'), 'utf8');
    vm.runInNewContext(source, { window });
    return window.AutomacaoFolha.core.validarEstrutura;
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
                    action: 'justuser_corpo.asp',
                    target: 'mainFrame'
                },
                employeeSelector: true
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
                }
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

test('supported Justificativas structure passes without employee or sheet data', () => {
    const validarEstrutura = loadValidator();

    const resultado = validarEstrutura(supportedStructure(), false);
    assert.equal(resultado.ok, true);
    assert.equal(resultado.erros.length, 0);
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
