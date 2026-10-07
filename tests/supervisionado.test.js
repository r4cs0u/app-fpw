'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function createFakeWindow() {
    const elements = new Map();
    let isClosed = false;

    function getEl(id) {
        if (!elements.has(id)) {
            elements.set(id, {
                id,
                textContent: '',
                className: '',
                disabled: false,
                style: {},
                onclick: null
            });
        }
        return elements.get(id);
    }

    const doc = {
        open() {},
        close() {},
        write(html) {
            for (const match of html.matchAll(/id="([^"]+)"/g)) {
                getEl(match[1]);
            }
            if (html.includes('disabled title="Folha sem marcações')) {
                getEl('btn-aplicar').disabled = true;
            }
        },
        getElementById(id) {
            return elements.get(id) || null;
        }
    };

    return {
        get closed() { return isClosed; },
        close() { isClosed = true; },
        document: doc,
        elements
    };
}

function loadSupervisionado(fakeWin, options = {}) {
    const AF = {
        estado: { rodando: false, cancelado: false, confirmacaoPendente: false },
        core: {
            getSelNome: () => options.hasSel ? { selectedIndex: 0, options: [{ text: options.nomeAtual || 'ANA' }] } : null,
            nomeAtual: () => options.hasSel ? (options.nomeAtual || 'ANA') : '',
            setBotoes: () => {}
        },
        painel: {
            setStatus: (t, c) => { AF.ultimoStatus = { t, c }; }
        },
        sons: {
            tocar: s => { AF.sonsTocados = AF.sonsTocados || []; AF.sonsTocados.push(s); }
        },
        preanalise: {
            lerFolhaAtual: () => options.resumo || {
                nome: options.nomeAtual || 'ANA',
                vazia: !!options.vazia,
                intervalo: { texto: '01/09/2026 até 04/10/2026 (34 dias)' },
                folgas: { total: 1, dias: ['02/09/2026'] },
                cod47: { total: 1, dias: ['07/09/2026'] },
                irregularidades: { semES: 0, interj: 0, britanica: 0, naoPreenchida: null },
                horas: { HE: '00:00', HEF: '00:00', HEC: '00:00' }
            },
            texto: r => r.vazia ? 'Folha sem marcações' : 'Resumo teste'
        },
        modelo: {
            textoDetalheAjuste: n => n + '\n|_Folgas movimentadas\n  |_ 04/09/2026 <- origem 02/09/2026 => alterado'
        },
        fases: {
            processarTodas: async opts => {
                AF.processarTodasChamadoCom = opts;
                if (options.falhaAjuste) {
                    AF.estado.falhaAjuste = options.falhaAjuste;
                } else if (options.cancelarAjuste) {
                    AF.estado.cancelado = true;
                    AF.estado.motivoParadaAjuste = { reason: 'Parado pelo teste' };
                }
            }
        },
        supervisionado: {}
    };

    const window = {
        AutomacaoFolha: AF,
        open: () => fakeWin
    };

    const context = {
        window,
        setInterval: () => 1,
        clearInterval: () => {},
        console: { log() {}, error() {} }
    };

    vm.runInNewContext(readFileSync(join(root, '65-supervisionado.js'), 'utf8'), context);
    return AF;
}

test('iniciarConfirmacao avisa e recusa quando nao ha folha selecionada', async () => {
    const AF = loadSupervisionado(createFakeWindow(), { hasSel: false });
    const win = await AF.supervisionado.iniciarConfirmacao();

    assert.equal(win, null);
    assert.match(AF.ultimoStatus.t, /Selecione uma folha ou mude para Automático/);
    assert.equal(AF.supervisionado.obterEstado(), 'ocioso');
});

test('iniciarConfirmacao avisa quando popup e bloqueado pelo navegador', async () => {
    const AF = loadSupervisionado(null, { hasSel: true, nomeAtual: 'ANA' });
    const win = await AF.supervisionado.iniciarConfirmacao();

    assert.equal(win, null);
    assert.match(AF.ultimoStatus.t, /Popup bloqueado pelo navegador/);
    assert.equal(AF.supervisionado.obterEstado(), 'ocioso');
});

test('iniciarConfirmacao abre janela, toca som de atencao, e cancelamento volta ao ocioso', async () => {
    const fakeWin = createFakeWindow();
    const AF = loadSupervisionado(fakeWin, { hasSel: true, nomeAtual: 'CARLOS' });
    const win = await AF.supervisionado.iniciarConfirmacao();

    assert.ok(win);
    assert.equal(AF.supervisionado.obterEstado(), 'confirmando');
    assert.equal(AF.estado.confirmacaoPendente, true);
    assert.deepEqual(AF.sonsTocados, ['atencao']);

    // Clicar em cancelar
    fakeWin.document.getElementById('btn-cancelar').onclick();

    assert.equal(AF.supervisionado.obterEstado(), 'ocioso');
    assert.equal(AF.estado.confirmacaoPendente, false);
    assert.equal(fakeWin.closed, true);
    // Cancelamento não toca sons de desfecho
    assert.deepEqual(AF.sonsTocados, ['atencao']);
});

test('folha sem marcacoes informa que nao ha ajustes e desabilita aplicar', async () => {
    const fakeWin = createFakeWindow();
    const AF = loadSupervisionado(fakeWin, { hasSel: true, nomeAtual: 'VAZIA', vazia: true });
    await AF.supervisionado.iniciarConfirmacao();

    const btnAplicar = fakeWin.document.getElementById('btn-aplicar');
    assert.equal(btnAplicar.disabled, true);
});

test('aplicar executa somente a folha atual com nome esperado e exibe status concluido com detalhe', async () => {
    const fakeWin = createFakeWindow();
    const AF = loadSupervisionado(fakeWin, { hasSel: true, nomeAtual: 'ANA SILVA' });
    await AF.supervisionado.iniciarConfirmacao();

    const btnAplicar = fakeWin.document.getElementById('btn-aplicar');
    await btnAplicar.onclick();

    assert.deepEqual(plain(AF.processarTodasChamadoCom), { somenteFolhaAtual: true, nomeEsperado: 'ANA SILVA' });
    assert.equal(AF.supervisionado.obterEstado(), 'concluido');

    const statusBox = fakeWin.document.getElementById('box-status');
    assert.match(statusBox.textContent, /Ajuste concluído com sucesso/);
    const boxConteudo = fakeWin.document.getElementById('box-conteudo');
    assert.match(boxConteudo.textContent, /\|_Folgas movimentadas/);
});

test('aplicar exibe status interrompido quando ajuste falha', async () => {
    const fakeWin = createFakeWindow();
    const AF = loadSupervisionado(fakeWin, {
        hasSel: true,
        nomeAtual: 'ANA',
        falhaAjuste: { stage: 'supervised-revalidation', reason: 'folha mudou' }
    });
    await AF.supervisionado.iniciarConfirmacao();

    await fakeWin.document.getElementById('btn-aplicar').onclick();

    assert.equal(AF.supervisionado.obterEstado(), 'interrompido');
    const statusBox = fakeWin.document.getElementById('box-status');
    assert.match(statusBox.textContent, /Interrompido \(supervised-revalidation\): folha mudou/);
});
