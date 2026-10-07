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
    assert.match(tbody, /aria-current="true"/);
    assert.doesNotMatch(tbody, /processando|badge-proc/);
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

test('linha de folha sem marcacoes mostra o nome e uma unica celula mesclada, sem selo nem "-" por coluna', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['VAZIA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    const tbody = AF.relatorios.gerarTbodyHTML(['VAZIA'], null, null);
    const thead = AF.relatorios.gerarTheadHTML('nome', 1);
    const colunas = (thead.match(/<th\b/g) || []).length;

    assert.equal((tbody.match(/<td\b/g) || []).length, 2);
    assert.match(tbody, new RegExp('<td class="cell-sem-marcacoes" colspan="' + (colunas - 1) + '">Sem Marcações na Folha</td>'));
    assert.doesNotMatch(tbody, /badge-vazia|s\/ marca/);
    assert.doesNotMatch(tbody, /chip-dash|chip-zero/);
});

test('linha em processamento pulsa sem texto de status e as demais nao', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA']);
    AF.modelo.registrarAnalise('ANA', { folgas: 1, cod47: 0, irregs: 0, interj: 0, britanica: 0 });

    const tbody = AF.relatorios.gerarTbodyHTML(['ANA', 'BIA'], 'BIA', null);
    const linhas = tbody.split('</tr>').filter(Boolean);

    assert.match(linhas[1], /row-processing/);
    assert.doesNotMatch(linhas[0], /row-processing|aria-current/);
    assert.doesNotMatch(tbody, /processando/);
    const esqueleto = AF.relatorios.gerarEsqueletoHTML();
    assert.match(esqueleto, /@keyframes pulse-row/);
    assert.match(esqueleto, /prefers-reduced-motion/);
    assert.doesNotMatch(esqueleto, /badge-proc/);
});

test('selo de parcial fica fora do trecho truncavel do nome', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('ajuste', ['MARIA DA SILVA SOUZA']);
    AF.modelo.registrarAjusteParcial('MARIA DA SILVA SOUZA', { movidas: 1, presas: [] });

    const tbody = AF.relatorios.gerarTbodyHTML(['MARIA DA SILVA SOUZA'], null, null);

    assert.match(tbody, /<span class="nome-txt">[^<]+<\/span><span class="badge badge-parcial">parcial<\/span>/);
    const esqueleto = AF.relatorios.gerarEsqueletoHTML();
    assert.match(esqueleto, /\.nome-txt\{[^}]*text-overflow:ellipsis/);
    assert.match(esqueleto, /\.badge\{[^}]*flex-shrink:0/);
});

test('linha sem marcacoes some com filtro por indicador e aparece sem filtro', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['VAZIA', 'ANA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    AF.modelo.registrarAnalise('ANA', { folgas: 0, cod47: 0, irregs: 2, interj: 0, britanica: 0 });

    assert.deepEqual(Array.from(AF.modelo.filtrar(null)), ['VAZIA', 'ANA']);
    assert.deepEqual(Array.from(AF.modelo.filtrar('semES')), ['ANA']);
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

function janelaComElementos(copiados = [], timeouts = []) {
    const elementos = new Map();
    function el(id) {
        const e = { id, textContent: '', style: {}, _html: '', classList: { add() {}, remove() {} } };
        Object.defineProperty(e, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
        e.querySelectorAll = sel => {
            const alvo = { '.mm[data-mm]': ['data-mm', /data-mm="([^"]+)"/g],
                '.card[data-filtro]': ['data-filtro', /data-filtro="([^"]+)"/g],
                'th[data-col]': ['data-col', /data-col="([^"]+)"/g],
                'tr[data-nome]': ['data-nome', /data-nome="([^"]+)"/g],
                '.btn-copy-irreg[data-nome]': ['data-nome', /<button[^>]*class="btn-copy-irreg"[^>]*data-nome="([^"]+)"([^>]*)>/g],
                '.btn-detalhe-ajuste[data-nome]': ['data-nome', /<button[^>]*class="btn-detalhe-ajuste[^"]*"[^>]*data-nome="([^"]+)"([^>]*)>/g],
                '.detail-row': ['data-detalhe-de', /<tr[^>]*class="detail-row"[^>]*data-detalhe-de="([^"]+)"/g] }[sel];
            if (!alvo) return [];
            // mesmos objetos enquanto o HTML nao muda, como num DOM real
            e._cache = e._cache || {};
            const chave = sel + '|' + e._html;
            if (!e._cache[chave]) {
                e._cache[chave] = [...e._html.matchAll(alvo[1])].map(m => ({
                    getAttribute: () => m[1], onclick: null, textContent: '📋',
                    disabled: /\sdisabled(?:\s|>|$)/.test(m[2]),
                    classList: { add() {}, remove() {} }
                }));
            }
            return e._cache[chave];
        };
        elementos.set(id, e);
        return e;
    }
    ['fpw-hdr-meta', 'fpw-cards-grid', 'fpw-thead-tr', 'fpw-tbody', 'fpw-rodape-contagem', 'fpw-notice-bar',
        'btn-janela-log', 'btn-janela-copiar', 'btn-exportar-irregularidades', 'fpw-busca'].forEach(el);
    const win = {
        closed: false, focus() {},
        setTimeout: callback => { timeouts.push(callback); return timeouts.length; },
        navigator: { clipboard: { writeText: texto => { copiados.push(texto); return Promise.resolve(); } } },
        document: { open() {}, close() {}, write() {}, getElementById: id => elementos.get(id) || null, querySelectorAll: () => [] }
    };
    return { win, elementos };
}

function ordemDaTabela(elementos) {
    return [...elementos.get('fpw-tbody').innerHTML.matchAll(/<tr[^>]*data-nome="([^"]+)"/g)].map(m => m[1]);
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

test('lista de nomes visiveis aplica filtro, extremo ou ordenacao e exclui zeros do extremo', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO']);
    AF.modelo.registrarAnalise('ANA', { britanica: 1, HE: '07:00', dias: { britanica: ['01/10/2026'] } });
    AF.modelo.registrarAnalise('BIA', { britanica: 1, HE: '03:00', dias: { britanica: ['02/10/2026'] } });
    AF.modelo.registrarAnalise('CAIO', { britanica: 0, HE: '00:00' });

    assert.deepEqual(JSON.parse(JSON.stringify(AF.relatorios.obterNomesVisiveis({
        filtro: 'britanica', col: 'nome', dir: 1, extremo: null
    }))), ['ANA', 'BIA']);
    assert.deepEqual(JSON.parse(JSON.stringify(AF.relatorios.obterNomesVisiveis({
        filtro: null, col: 'nome', dir: 1, extremo: { col: 'he', modo: 'max', sinal: 0 }
    }))), ['ANA', 'BIA']);
    assert.deepEqual(JSON.parse(JSON.stringify(AF.relatorios.obterNomesVisiveis({
        filtro: null, col: 'nome', dir: 1, extremo: null
    }))), ['ANA', 'BIA', 'CAIO']);
});

test('relatorio copia por funcionario sem propagar clique e exporta a mesma lista filtrada em janela reutilizavel', async () => {
    const copiados = [];
    const rowTimeouts = [];
    const { win: relatorioWin, elementos } = janelaComElementos(copiados, rowTimeouts);
    const exportElements = new Map();
    const exportTimeouts = [];
    let exportHTML = '';
    const exportWin = {
        closed: false,
        focus() {},
        setTimeout: callback => { exportTimeouts.push(callback); return exportTimeouts.length; },
        navigator: { clipboard: { writeText: texto => { copiados.push(texto); return Promise.resolve(); } } },
        document: {
            open() {},
            close() {},
            write(html) {
                exportHTML = html;
                for (const m of html.matchAll(/id="([^"]+)"/g)) {
                    exportElements.set(m[1], {
                        textContent: '', classList: { add() {}, remove() {} }, onclick: null
                    });
                }
            },
            getElementById: id => exportElements.get(id) || null
        }
    };
    const AF = loadRelatorios((url, name) => name === 'fpw-relatorio' ? relatorioWin : exportWin);
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO'], 'Outubro 2026');
    AF.modelo.registrarAnalise('ANA', {
        britanica: 1, irregs: 1, HE: '07:00',
        dias: { britanica: ['01/10/2026'], semES: ['03/10/2026'] }
    });
    AF.modelo.registrarAnalise('BIA', { britanica: 1, interj: 1, HE: '03:00', dias: {
        britanica: ['02/10/2026'], interj: ['04/10/2026']
    } });
    AF.modelo.registrarAnalise('CAIO', { britanica: 0, HE: '00:00' });

    AF.relatorios.abrirJanela();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA', 'BIA', 'CAIO']);
    const botaoANA = elementos.get('fpw-tbody').querySelectorAll('.btn-copy-irreg[data-nome]')
        .find(button => button.getAttribute() === 'ANA');
    let stopped = false;
    botaoANA.onclick({ stopPropagation() { stopped = true; } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(stopped, true);
    assert.match(copiados[0], /^\*ANA\n/);
    assert.doesNotMatch(copiados[0], /Interjornada/);
    assert.equal(botaoANA.textContent, '✓');
    const botaoCAIO = elementos.get('fpw-tbody').querySelectorAll('.btn-copy-irreg[data-nome]')
        .find(button => button.getAttribute() === 'CAIO');
    assert.equal(botaoCAIO.disabled, true);

    const cardBritanica = elementos.get('fpw-cards-grid').querySelectorAll('.card[data-filtro]')
        .find(card => card.getAttribute() === 'britanica');
    cardBritanica.onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA', 'BIA']);
    AF.estado.rodando = true;
    const estadoDuranteExecucao = JSON.stringify(AF.estado);
    elementos.get('btn-exportar-irregularidades').onclick();
    assert.equal(JSON.stringify(AF.estado), estadoDuranteExecucao);
    assert.match(exportHTML, /fpw-irregularidades-texto/);
    assert.equal(exportElements.get('fpw-irregularidades-titulo').textContent, 'Exportar irregularidades');
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*ANA/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /^\*Irregularidades – Outubro 2026 – Marc\. Britânicas/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*BIA/);
    assert.doesNotMatch(exportElements.get('fpw-irregularidades-texto').textContent, /\*CAIO/);
    assert.match(exportElements.get('fpw-irregularidades-horario').textContent,
        /^Gerado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
    exportElements.get('fpw-irregularidades-copiar').onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(copiados[1], exportElements.get('fpw-irregularidades-texto').textContent);
    assert.equal(exportElements.get('fpw-irregularidades-copiar').textContent, 'Copiado!');
    assert.equal(rowTimeouts.length, 1);
    assert.equal(exportTimeouts.length, 1);
    assert.match(copiados[1], /^\*Irregularidades – Outubro 2026 – Marc. Britânicas/);
    assert.match(copiados[1], /\*ANA/);
    assert.match(copiados[1], /\*BIA/);

    cardBritanica.onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA', 'BIA', 'CAIO']);
    elementos.get('btn-exportar-irregularidades').onclick();
    assert.equal(exportElements.get('fpw-irregularidades-titulo').textContent, 'Exportar irregularidades');
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /^\*Irregularidades – Outubro 2026\n/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*ANA/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*BIA/);
    assert.doesNotMatch(exportElements.get('fpw-irregularidades-texto').textContent, /\*CAIO/);

    AF.estado.rodando = false;
    elementos.get('fpw-cards-grid').querySelectorAll('.mm[data-mm]')
        .find(extremo => extremo.getAttribute() === 'he:min:0').onclick({});
    assert.deepEqual(ordemDaTabela(elementos), ['BIA', 'ANA']);
    elementos.get('btn-exportar-irregularidades').onclick();
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /^\*Irregularidades – Outubro 2026\n/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*ANA/);
    assert.match(exportElements.get('fpw-irregularidades-texto').textContent, /\*BIA/);
    assert.doesNotMatch(exportElements.get('fpw-irregularidades-texto').textContent, /\*CAIO/);

    elementos.get('fpw-cards-grid').querySelectorAll('.card[data-filtro]')
        .find(card => card.getAttribute() === 'presas').onclick();
    assert.deepEqual(ordemDaTabela(elementos), []);
    elementos.get('btn-exportar-irregularidades').onclick();
    assert.equal(exportElements.get('fpw-irregularidades-texto').textContent,
        '*Irregularidades – Outubro 2026 – Presas\n\nNenhuma irregularidade para exportar.');

    relatorioWin.navigator.clipboard.writeText = () => Promise.reject(new Error('clipboard indisponivel'));
    cardBritanica.onclick();
    const botaoFalha = elementos.get('fpw-tbody').querySelectorAll('.btn-copy-irreg[data-nome]')
        .find(button => button.getAttribute() === 'ANA');
    botaoFalha.onclick({ stopPropagation() {} });
    await new Promise(resolve => setImmediate(resolve));
    assert.match(elementos.get('fpw-notice-bar').textContent, /Não foi possível copiar/);
});
test('linha sem marcacoes continua fora do TSV, do texto de irregularidades e da exportacao do time', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['VAZIA', 'ANA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    AF.modelo.registrarAnalise('ANA', { folgas: 0, cod47: 0, irregs: 1, interj: 0, britanica: 0, dias: { semES: [{ data: '02/09/2026' }] } });

    assert.equal(AF.modelo.textoIrregularidades('VAZIA'), '');
    assert.doesNotMatch(AF.modelo.tsv(), /VAZIA/);
    const exportacao = AF.modelo.textoIrregularidadesTime(['VAZIA', 'ANA'], null);
    assert.doesNotMatch(exportacao, /VAZIA/);
    assert.match(exportacao, /\*ANA/);
});

function equipeParaJanela(AF) {
    AF.modelo.iniciarExecucao('analise', ['ANA SILVA', 'BIA SOUZA', 'CAIO SILVA', 'DINA'], 'Outubro 2026');
    AF.modelo.registrarAnalise('ANA SILVA', { irregs: 1, dias: { semES: ['03/10/2026'] } });
    AF.modelo.registrarAnalise('BIA SOUZA', { interj: 1, dias: { interj: ['04/10/2026'] } });
    AF.modelo.registrarAnalise('CAIO SILVA', { interj: 1, irregs: 1, dias: { interj: ['05/10/2026'], semES: ['06/10/2026'] } });
    AF.modelo.registrarAnalise('DINA', { folgas: 0 });
}

function cardPorFiltro(elementos, id) {
    return elementos.get('fpw-cards-grid').querySelectorAll('.card[data-filtro]')
        .find(card => card.getAttribute() === id);
}

test('janela: indicadores se somam, cada clique liga ou desliga so o indicador clicado e o rodape lista os filtros', () => {
    const { win, elementos } = janelaComElementos();
    const AF = loadRelatorios(() => win);
    equipeParaJanela(AF);
    AF.relatorios.abrirJanela();

    cardPorFiltro(elementos, 'semES').onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA SILVA', 'CAIO SILVA']);

    cardPorFiltro(elementos, 'interj').onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA SILVA', 'BIA SOUZA', 'CAIO SILVA']);
    assert.equal((elementos.get('fpw-cards-grid').innerHTML.match(/card-active/g) || []).length, 2);
    assert.match(elementos.get('fpw-rodape-contagem').textContent, /Filtros ativos: Sem Entrada\/Saída \+ Interjornada/);

    cardPorFiltro(elementos, 'interj').onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA SILVA', 'CAIO SILVA']);

    cardPorFiltro(elementos, 'semES').onclick();
    assert.deepEqual(ordemDaTabela(elementos).length, 4);
    assert.doesNotMatch(elementos.get('fpw-rodape-contagem').textContent, /Filtros ativos/);
});

test('janela: busca por nome filtra, combina com indicadores, persiste nas atualizacoes e entra na exportacao', () => {
    const timeouts = [];
    const { win, elementos } = janelaComElementos([], timeouts);
    const exportElements = new Map();
    const exportWin = {
        closed: false, focus() {},
        setTimeout() { return 1; },
        navigator: { clipboard: { writeText: () => Promise.resolve() } },
        document: {
            open() {}, close() {},
            write(html) {
                for (const m of html.matchAll(/id="([^"]+)"/g)) {
                    exportElements.set(m[1], { textContent: '', classList: { add() {}, remove() {} }, onclick: null });
                }
            },
            getElementById: id => exportElements.get(id) || null
        }
    };
    const AF = loadRelatorios((url, name) => name === 'fpw-relatorio' ? win : exportWin);
    equipeParaJanela(AF);
    AF.relatorios.abrirJanela();

    const busca = elementos.get('fpw-busca');
    busca.value = 'silva';
    busca.oninput();
    while (timeouts.length) timeouts.shift()();
    assert.deepEqual(ordemDaTabela(elementos), ['ANA SILVA', 'CAIO SILVA']);

    cardPorFiltro(elementos, 'interj').onclick();
    assert.deepEqual(ordemDaTabela(elementos), ['CAIO SILVA']);
    assert.match(elementos.get('fpw-rodape-contagem').textContent, /Busca: "silva"/);

    // atualizacao do modelo com busca e indicador ativos: ambos permanecem e o campo nao e reconstruido
    AF.modelo.registrarAnalise('DINA', { folgas: 0, interj: 1, dias: { interj: ['07/10/2026'] } });
    AF.relatorios.abrirJanela();
    assert.deepEqual(ordemDaTabela(elementos), ['CAIO SILVA']);
    assert.equal(busca.value, 'silva');

    elementos.get('btn-exportar-irregularidades').onclick();
    const texto = exportElements.get('fpw-irregularidades-texto').textContent;
    assert.match(texto, /^\*Irregularidades – Outubro 2026 – Interjornada – Busca: "silva"\n/);
    assert.match(texto, /\*CAIO SILVA/);
    assert.doesNotMatch(texto, /\*BIA SOUZA|\*DINA/);

    busca.value = '';
    busca.oninput();
    while (timeouts.length) timeouts.shift()();
    assert.deepEqual(ordemDaTabela(elementos), ['BIA SOUZA', 'CAIO SILVA', 'DINA']);
});

test('coluna e botao de detalhe de ajustes: expande, recolhe, desabilita sem ajuste e preserva na renderizacao', () => {
    const { win, elementos } = janelaComElementos();
    const AF = loadRelatorios(() => win);
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'VAZIA'], 'Outubro 2026');
    AF.modelo.registrarAnalise('ANA', { folgas: 1 });
    AF.modelo.registrarAnalise('BIA', { folgas: 0 });
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');

    // Ajuste apenas para ANA
    AF.modelo.iniciarExecucao('ajuste', null);
    AF.modelo.registrarAjuste('ANA', {
        movidas: 1,
        presas: [],
        cod47Conv: 1,
        cod47Rest: 0,
        acoes: [{ ausencia: '13/09/2026', origem: '07/09/2026', resultado: 'movida' }],
        cod47Dias: ['07/09/2026']
    });

    AF.relatorios.abrirJanela();

    const thead = elementos.get('fpw-thead-tr').innerHTML;
    assert.match(thead, /class="detail-col"/);

    // Botao de ANA habilitado; BIA e VAZIA desabilitados
    const btns = elementos.get('fpw-tbody').querySelectorAll('.btn-detalhe-ajuste[data-nome]');
    const btnAna = btns.find(b => b.getAttribute() === 'ANA');
    const btnBia = btns.find(b => b.getAttribute() === 'BIA');
    assert.ok(btnAna && !btnAna.disabled);
    assert.ok(btnBia && btnBia.disabled);

    // Vazia nao tem botao de detalhe
    const btnVazia = btns.find(b => b.getAttribute() === 'VAZIA');
    assert.equal(btnVazia, undefined);

    // Clicar no botao de ANA expande a linha sem selecionar a linha (stopPropagation)
    let stopped = false;
    btnAna.onclick({ stopPropagation() { stopped = true; } });
    assert.equal(stopped, true);

    let tbodyHTML = elementos.get('fpw-tbody').innerHTML;
    assert.match(tbodyHTML, /class="detail-row" data-detalhe-de="ANA"/);
    assert.match(tbodyHTML, /13\/09\/2026 (&lt;|<)- origem 07\/09\/2026 (=&gt;|=>) alterado/);
    assert.doesNotMatch(tbodyHTML, /tr class="active-row"/);

    // Atualizacao do modelo mantem expandido
    AF.modelo.registrarAnalise('BIA', { folgas: 2 });
    AF.relatorios.abrirJanela();
    tbodyHTML = elementos.get('fpw-tbody').innerHTML;
    assert.match(tbodyHTML, /class="detail-row" data-detalhe-de="ANA"/);

    // Clicar novamente recolhe
    const btnAna2 = elementos.get('fpw-tbody').querySelectorAll('.btn-detalhe-ajuste[data-nome]').find(b => b.getAttribute() === 'ANA');
    btnAna2.onclick({ stopPropagation() {} });
    tbodyHTML = elementos.get('fpw-tbody').innerHTML;
    assert.doesNotMatch(tbodyHTML, /class="detail-row"/);
});

test('celula mesclada de folha sem marcacoes tem colspan igual ao total de colunas do cabecalho menos 1', () => {
    const AF = loadRelatorios();
    AF.modelo.iniciarExecucao('analise', ['VAZIA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');

    const thead = AF.relatorios.gerarTheadHTML('nome', 1);
    const totalTh = (thead.match(/<th\b/g) || []).length;
    assert.equal(totalTh, 12); // 10 metricas + 1 irreg + 1 detalhe

    const tbody = AF.relatorios.gerarTbodyHTML(['VAZIA'], null, null);
    assert.match(tbody, new RegExp('<td class="cell-sem-marcacoes" colspan="' + (totalTh - 1) + '">Sem Marcações na Folha</td>'));
});
