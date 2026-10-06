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
function equipeParaCards(AF) {
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO']);
    AF.modelo.registrarAnalise('ANA',  { folgas: 0, HE: '07:19', HEF: '00:00', HEC: '11:00' });
    AF.modelo.registrarAnalise('BIA',  { folgas: 0, HE: '00:09', HEF: '01:54', HEC: '-35:00' });
    AF.modelo.registrarAnalise('CAIO', { folgas: 0, HE: '00:00', HEF: '00:00', HEC: '00:19' });
}

test('Compensaveis tem dois quadrados (positivo e negativo) com sinal colorido so no caractere', () => {
    const AF = loadRelatorios();
    equipeParaCards(AF);
    const html = AF.relatorios.gerarCardsHTML(AF.modelo.resumo(), null, null);

    assert.equal((html.match(/class="mini"/g) || []).length, 2);
    // so o caractere do sinal recebe cor; o valor fica com a cor do texto
    assert.match(html, /<span class="sg-pos">\+<\/span>11:19/);
    assert.match(html, /<span class="sg-neg">−<\/span>35:00/);
    assert.doesNotMatch(html, /sg-pos">\+11:19/);
    assert.match(html, /data-mm="hec:min:1"/);
    assert.match(html, /data-mm="hec:max:1"/);
    assert.match(html, /data-mm="hec:min:-1"/);
    assert.match(html, /data-mm="hec:max:-1"/);
});

test('mín e máx de HE e HEF sao clicaveis; sem valores ficam desativados; o ativo e destacado', () => {
    const AF = loadRelatorios();
    equipeParaCards(AF);
    const resumo = AF.modelo.resumo();
    const normal = AF.relatorios.gerarCardsHTML(resumo, null, null);
    assert.match(normal, /data-mm="he:min:0"/);
    assert.match(normal, /data-mm="he:max:0"/);
    assert.doesNotMatch(normal, /mm-active/);

    const ativo = AF.relatorios.gerarCardsHTML(resumo, null, { col: 'he', modo: 'max', sinal: 0 });
    assert.equal((ativo.match(/mm-active/g) || []).length, 1);

    const vazio = loadRelatorios();
    vazio.modelo.iniciarExecucao('analise', ['X']);
    vazio.modelo.registrarAnalise('X', { folgas: 0, HE: '00:00', HEF: '00:00', HEC: '00:00' });
    const semSaldo = vazio.relatorios.gerarCardsHTML(vazio.modelo.resumo(), null, null);
    assert.doesNotMatch(semSaldo, /data-mm="he:/);
    assert.match(semSaldo, /mm-off/);
});

test('cabecalho mostra mes, progresso e a duracao da ultima Analise e do ultimo Ajuste', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA'], 'Setembro 2026');
    AF.modelo.registrarAnalise('ANA', { folgas: 0 });
    const est = AF.modelo.obterEstado();
    est.execs.analise.inicio = new Date(2026, 9, 6, 0, 10, 0).getTime();
    est.execs.analise.fim = new Date(2026, 9, 6, 0, 13, 12).getTime();
    est.execs.analise.status = 'concluida';
    est.execs.ajuste = { status: 'em-andamento', inicio: new Date(2026, 9, 6, 0, 20, 0).getTime(), fim: null };

    const html = AF.relatorios.gerarMetaHTML(est, new Date(2026, 9, 6, 0, 21, 5).getTime());
    assert.match(html, /Setembro 2026/);
    assert.match(html, /Processados:<\/b> 1 \/ 2/);
    assert.match(html, /Análise:<\/b> concluída • 3min 12s • 00:13/);
    assert.match(html, /Ajuste:<\/b> em andamento • 1min 05s/);
    assert.doesNotMatch(html, /Ajuste:<\/b> em andamento • 1min 05s • /);
});

function janelaComElementos() {
    const elementos = new Map();
    function el(id) {
        const e = { id, textContent: '', style: {}, _html: '', classList: { add() {}, remove() {} } };
        Object.defineProperty(e, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
        e.querySelectorAll = sel => {
            const alvo = { '.mm[data-mm]': ['data-mm', /data-mm="([^"]+)"/g],
                '.card[data-filtro]': ['data-filtro', /data-filtro="([^"]+)"/g],
                'th[data-col]': ['data-col', /data-col="([^"]+)"/g],
                'tr[data-nome]': ['data-nome', /data-nome="([^"]+)"/g] }[sel];
            if (!alvo) return [];
            // mesmos objetos enquanto o HTML nao muda, como num DOM real
            e._cache = e._cache || {};
            const chave = sel + '|' + e._html;
            if (!e._cache[chave]) {
                e._cache[chave] = [...e._html.matchAll(alvo[1])].map(m => ({
                    getAttribute: () => m[1], onclick: null, classList: { add() {}, remove() {} }
                }));
            }
            return e._cache[chave];
        };
        elementos.set(id, e);
        return e;
    }
    ['fpw-hdr-meta', 'fpw-cards-grid', 'fpw-thead-tr', 'fpw-tbody', 'fpw-rodape-contagem', 'fpw-notice-bar',
        'btn-janela-log', 'btn-janela-copiar'].forEach(el);
    const win = {
        closed: false, focus() {},
        document: { open() {}, close() {}, write() {}, getElementById: id => elementos.get(id) || null, querySelectorAll: () => [] }
    };
    return { win, elementos };
}

function ordemDaTabela(elementos) {
    return [...elementos.get('fpw-tbody').innerHTML.matchAll(/data-nome="([^"]+)"/g)].map(m => m[1]);
}

test('janela: clicar em mín/máx ordena a tabela sem os zerados; novo clique ou cabecalho limpa', () => {
    const { win, elementos } = janelaComElementos();
    const AF = loadRelatorios(() => win);
    equipeParaCards(AF);

    AF.relatorios.abrirJanela();
    assert.equal(ordemDaTabela(elementos).length, 3);

    // clica em "máx" de HE 100%: ANA (07:19) antes de BIA (00:09); CAIO (00:00) some
    const cards = () => elementos.get('fpw-cards-grid');
    const maxHE = cards().querySelectorAll('.mm[data-mm]').find(m => m.getAttribute() === 'he:max:0');
    maxHE.onclick({ stopPropagation() {} });
    assert.deepEqual(ordemDaTabela(elementos), ['ANA', 'BIA']);
    assert.match(cards().innerHTML, /mm-active/);
    assert.match(elementos.get('fpw-rodape-contagem').textContent, /maiores HE, sem zerados/);

    // "mín" do mesmo indicador inverte a ordem
    cards().querySelectorAll('.mm[data-mm]').find(m => m.getAttribute() === 'he:min:0').onclick({});
    assert.deepEqual(ordemDaTabela(elementos), ['BIA', 'ANA']);

    // novo clique no mesmo extremo limpa e volta a todos
    cards().querySelectorAll('.mm[data-mm]').find(m => m.getAttribute() === 'he:min:0').onclick({});
    assert.equal(ordemDaTabela(elementos).length, 3);
    assert.doesNotMatch(cards().innerHTML, /mm-active/);

    // HEC negativo: so quem tem saldo negativo
    cards().querySelectorAll('.mm[data-mm]').find(m => m.getAttribute() === 'hec:max:-1').onclick({});
    assert.deepEqual(ordemDaTabela(elementos), ['BIA']);

    // clicar no cabecalho de uma coluna cancela o extremo
    elementos.get('fpw-thead-tr').querySelectorAll('th[data-col]').find(t => t.getAttribute() === 'nome').onclick();
    assert.equal(ordemDaTabela(elementos).length, 3);
    assert.doesNotMatch(elementos.get('fpw-cards-grid').innerHTML, /mm-active/);
});