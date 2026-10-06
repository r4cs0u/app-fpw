'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createStorage() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); },
        removeItem: key => { data.delete(key); }
    };
}

function loadRelatorios(openStub) {
    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {
                getDocC: () => ({ getElementById: () => null })
            },
            estado: { rodando: false },
            log: { abrirJanela() {} }
        },
        sessionStorage: createStorage()
    };
    if (openStub) window.open = openStub;
    const context = { window, console: { log() {}, error() {} }, Event: class {} };
    vm.runInNewContext(readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(__dirname, '..', '27-modelo-relatorio.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(__dirname, '..', '60-relatorios.js'), 'utf8'), context);
    return window.AutomacaoFolha;
}

test('3.1: gerarTheadHTML, gerarCardsHTML e gerarTbodyHTML produzem marcação correta', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA']);
    AF.modelo.registrarAnalise('ANA', {
        folgas: 5,
        cod47: 2,
        irregs: 3,
        interj: 1,
        britanica: 3,
        dias: {
            semES: [{ data: '02/09/2026' }],
            interj: [{ data: '05/09/2026' }],
            britanica: [{ data: '02/09/2026' }, { data: '10/09/2026' }, { data: '15/09/2026' }]
        },
        naoPreenchida: { avaliada: true, flag: true, pctNaoPreenchida: 73, criterios: ['fracao'], visiveis: 28, preenchidos: 7 }
    });

    const thead = AF.relatorios.gerarTheadHTML('nome', 1);
    assert.match(thead, /data-col="nome"/);
    assert.match(thead, /Sem E\/S/);
    assert.match(thead, /% Não Preench\./);

    const resumo = AF.modelo.resumo();
    const cards = AF.relatorios.gerarCardsHTML(resumo, null);
    assert.match(cards, /data-filtro="semES"/);
    assert.match(cards, /data-filtro="britanica"/);
    assert.match(cards, /Folhas não Preenchidas/);

    const tbody = AF.relatorios.gerarTbodyHTML(['ANA', 'BIA'], 'ANA', null);
    assert.match(tbody, /row-processing/);
    assert.match(tbody, /badge-proc/);
    assert.match(tbody, /chip-blue/); // folgas 5
    assert.match(tbody, /73%/); // nao preenchida
    assert.match(tbody, /Sem Entrada\/Saída: 02\/09\/2026/); // tooltip
    assert.match(tbody, /Marcação Britânica: 02\/09\/2026, 10\/09\/2026, 15\/09\/2026/);
});

test('3.2 & 3.3: abrirJanela condutor, clique bloqueado durante execucao e navegação quando ocioso', () => {
    let navigations = 0;
    const fakeDocC = {
        yourform: { lstNome: {}, CodEmpresaEmpregado: {} },
        getElementById: id => (id === 'lstNome' ? {
            options: [{ text: 'ANA' }, { text: 'BIA' }],
            selectedIndex: 0,
            dispatchEvent() { navigations++; }
        } : null),
        querySelector: () => null
    };

    let writtenHTML = '';
    const fakeElements = new Map();
    const fakeWin = {
        closed: false,
        focus() {},
        document: {
            open() {},
            close() {},
            write(h) {
                writtenHTML = h;
                for (const m of h.matchAll(/id="([^"]+)"/g)) {
                    fakeElements.set(m[1], {
                        id: m[1],
                        innerHTML: '',
                        textContent: '',
                        style: {},
                        querySelectorAll: () => [],
                        querySelector: () => null
                    });
                }
            },
            getElementById: id => fakeElements.get(id) || null,
            querySelectorAll: () => []
        }
    };

    const AF = loadRelatorios(() => fakeWin);
    AF.core.getDocC = () => fakeDocC;

    const win = AF.relatorios.abrirJanela();
    assert.ok(win);
    assert.match(writtenHTML, /FPW — Relatório Unificado/);
});

test('indicadores em tres grupos tematicos, um por linha: folgas, irregularidades e hora extra', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA']);
    AF.modelo.registrarAnalise('ANA', { folgas: 3, irregs: 2, interj: 1, britanica: 3, HE: '07:19', HEF: '01:54', HEC: '-35:00' });

    const html = AF.relatorios.gerarCardsHTML(AF.modelo.resumo(), null);
    const posVerde = html.indexOf('grp-green');
    const posVermelho = html.indexOf('grp-red');
    const posAzul = html.indexOf('grp-blue');
    assert.ok(posVerde >= 0 && posVermelho > posVerde && posAzul > posVermelho, 'ordem: folgas, irregularidades, hora extra');
    assert.equal((html.match(/class="grp grp-/g) || []).length, 3);

    const verde = html.slice(posVerde, posVermelho);
    assert.match(verde, />Folgas</);
    assert.match(verde, /Movim\./);
    assert.match(verde, /Presas/);

    const vermelho = html.slice(posVermelho, posAzul);
    assert.match(vermelho, />Irregularidades</);
    assert.match(vermelho, /Sem Entrada\/Saída/);
    assert.match(vermelho, /Marc\. Britânicas/);
    assert.match(vermelho, /Folhas não Preenchidas/);

    const azul = html.slice(posAzul);
    assert.match(azul, />Hora Extra</);
    assert.match(azul, /100% \(Acima das 10h\)/);
    assert.match(azul, /100% \(Feriado\)/);
    assert.match(azul, /70% \(Compensáveis\)/);
});

test('cada grupo de indicadores e uma linha propria no layout', () => {
    const AF = loadRelatorios();
    const esqueleto = AF.relatorios.gerarEsqueletoHTML();
    assert.match(esqueleto, /\.cards-grid\{display:flex;flex-direction:column/);
    assert.match(esqueleto, /\.grp\{width:100%/);
});

test('cliques dos indicadores: Movim. filtra pendentes, Presas filtra presas, e um filtro ativo fica destacado', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA']);
    AF.modelo.registrarAnalise('ANA', { folgas: 3, irregs: 0 });
    const resumo = AF.modelo.resumo();

    const semFiltro = AF.relatorios.gerarCardsHTML(resumo, null);
    assert.match(semFiltro, /data-filtro="pendentes"/);
    assert.match(semFiltro, /data-filtro="presas"/);
    assert.doesNotMatch(semFiltro, /card-active/);

    const comFiltro = AF.relatorios.gerarCardsHTML(resumo, 'presas');
    assert.equal((comFiltro.match(/card-active/g) || []).length, 1);
});

test('linha de folha sem marcacoes mostra "-" nas colunas e o selo s/ marcacoes', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['VAZIA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    const tbody = AF.relatorios.gerarTbodyHTML(['VAZIA'], null, null);
    assert.match(tbody, /badge-vazia/);
    assert.equal((tbody.match(/chip-dash/g) || []).length, 9);
    assert.doesNotMatch(tbody, /chip-zero/);
});