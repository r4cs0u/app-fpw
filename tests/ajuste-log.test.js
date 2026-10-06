'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const plain = value => JSON.parse(JSON.stringify(value));

function createStorage() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, String(value)); }
    };
}

function load(files, withCore) {
    const window = {
        AutomacaoFolha: withCore ? undefined : {
            utils: {}, core: {}, mapa: {}, estado: {}, popup: {}, fases: {}, analisar: {},
            planejamento: {}, relatorios: {}, sons: { tocar() {} }
        },
        sessionStorage: createStorage()
    };
    const context = { window, console: { log() {} }, Event: class {}, MouseEvent: class {} };
    for (const file of files) {
        vm.runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), context);
    }
    return window.AutomacaoFolha;
}

function loadFases() {
    const AF = load(['05-log.js', '10-utils.js', '35-planejamento.js', '37-regras-folha.js', '20-mapa.js', '25-detector.js', '27-modelo-relatorio.js', '40-fases.js', '50-analisar.js']);
    AF.core.log = (msg, cor, opcoes) => AF.log.registrar(msg, cor, opcoes);
    AF.core.norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return AF;
}

const ALVO = new Date(2026, 8, 1);

function dd(dia, mes = 9) {
    return String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/2026';
}

function linha(dia, marc1, marc2, irre = ' ', cabecalho) {
    return { n: String(dia), dataStr: dd(dia), cabecalho: cabecalho || (dd(dia) + ' Qua'), marc1, marc2, irre, codJust: '' };
}

function estadoSintetico(AF, linhas, cod47 = [], folgas = 0) {
    const deteccao = AF.detector.detectarFolha(linhas, ALVO);
    return AF.fases.montarEstadoFolha({ semanas: {} }, deteccao, cod47, folgas);
}

test('state snapshot lists folgas, absences, holidays, hidden days, cod 47 and irregularity days', () => {
    const AF = loadFases();
    const itens = [
        { inp: {}, num: '1', dataStr: dd(2), valor: 'Ausencia de Marcacao', cabecalho: dd(2) + ' Qua' },
        { inp: {}, num: '2', dataStr: dd(7), valor: ' ', cabecalho: dd(7) + ' Seg Horario: Feriado' },
        { inp: {}, num: '3', dataStr: dd(13), valor: ' ', cabecalho: dd(13) + ' Dom Horario: Folga' }
    ];
    const mapa = AF.mapa.construirMapaFolha(ALVO, itens);
    const deteccao = AF.detector.detectarFolha([
        linha(5, '08:00 ', '', 's/marc de entrada/sa\u00edda', dd(5) + ' Sab [Interjornada]')
    ], ALVO);

    const estado = AF.fases.montarEstadoFolha(mapa, deteccao, [dd(20), dd(8), dd(20)], 3);

    assert.equal(estado.folgasAMovimentar, 3);
    assert.deepEqual(plain(estado.folgas), [dd(13)]);
    assert.deepEqual(plain(estado.ausencias), [dd(2)]);
    assert.deepEqual(plain(estado.feriados), [dd(7)]);
    assert.ok(estado.domingosOcultos.length > 0);
    assert.deepEqual(plain(estado.cod47), [dd(8), dd(20)]);
    assert.deepEqual(plain(estado.irregularidades.semEntradaSaida), { total: 1, dias: [dd(5)] });
    assert.deepEqual(plain(estado.irregularidades.interjornada), { total: 1, dias: [dd(5)] });
    assert.equal(estado.contagens.semES, 1);
    assert.equal(AF.fases.estadoParaLog(estado).deteccao, undefined);
    assert.equal(AF.fases.estadoParaLog(estado).coletado, true);
});

test('compararComAnalise reports only the fields that differ', () => {
    const AF = loadFases();
    const atual = { folgas: 4, cod47: 2, semES: 1, interj: 0, britanica: 3, naoPreenchida: 0 };
    const anterior = { folgas: 5, cod47: 2, semES: 1, interj: 0, britanica: 3, naoPreenchida: 0 };
    assert.deepEqual(plain(AF.fases.compararComAnalise(atual, anterior)), [{ campo: 'folgas', analise: 5, atual: 4 }]);
    assert.deepEqual(plain(AF.fases.compararComAnalise(atual, atual)), []);
});

function harness(options = {}) {
    const AF = loadFases();
    const linhas = options.linhas || [linha(2, '06:00 ', '18:00 ')];
    let capturas = 0;
    const estados = [
        estadoSintetico(AF, linhas, [dd(8)], options.folgasAntes === undefined ? 5 : options.folgasAntes),
        estadoSintetico(AF, linhas, [], 0)
    ];

    AF.core.nomeAtual = () => 'ANA';
    AF.core.paginaVaziaAgora = () => false;
    AF.core.esperarDelayAjuste = () => { throw new Error('no waits are allowed in state capture'); };
    AF.fases.capturarEstadoFolha = () => estados[Math.min(capturas++, 1)];
    AF.fases.processarFase1 = async () => ({
        movidas: 4,
        presas: [{ fase: 1, semanaId: 's', dataFolga: dd(12), motivo: 'sem destino elegivel na semana (planejador)' }]
    });
    AF.fases.processarFase2 = async () => ({ movidas: 0, presas: [] });
    AF.fases.processarFase4 = () => [];
    AF.mapa.mapearFolhaAtual = () => ({ semanas: {} });
    AF.planejamento.planejarFase3 = (mapa, presas) => ({ acoes: options.acoesFase3 || [], presasFinais: presas });
    AF.analisar.somarHorasExtras = () => ({ HE: '01:00', HEF: '00:00' });
    AF.analisar.lerSaldoHEC = () => '00:00';
    AF.popup.executarAcaoFolga = options.executarAcaoFolga || (async () => ({ ok: true }));

    let ativo = true;
    const execucao = { isActive: () => ativo };
    if (options.stopAfterPhase === 1) {
        const original = AF.fases.processarFase1;
        AF.fases.processarFase1 = async (e) => { const r = await original(e); ativo = false; return r; };
    }
    const entry = { nome: 'ANA', lido: false };
    const relStats = { totalFolhas: 0, semMarcacoes: 0, folgasAlteradas: 0, folgasNaoAlteradas: 0, irregsRestantes: 0, interjRestantes: 0, linhas47: 0 };
    AF.log.iniciarExecucao('ajuste');
    if (options.anterior) AF.estado.ultimaAnalise = { ANA: options.anterior };
    return { AF, entry, relStats, execucao, run: () => AF.fases.processarFolhaAtual(relStats, [entry], { ANA: entry }, execucao) };
}

test('adjustment without a previous analysis records before/after state and the trapped folga reason', async () => {
    const h = harness();
    await h.run();

    const texto = h.AF.log.texto();
    assert.match(texto, /Estado antes do ajuste/);
    assert.match(texto, /Sem analise anterior para este funcionario/);
    assert.match(texto, /Estado depois do ajuste/);
    assert.match(texto, /Folga presa: 12\/09\/2026 \(fase 1\)/);
    assert.match(texto, /motivo: sem destino elegivel na semana \(planejador\)/);
    assert.ok(texto.indexOf('Estado antes do ajuste') < texto.indexOf('Estado depois do ajuste'));
    assert.equal(h.entry.lido, true);
    assert.equal(h.entry.folgasAlteradas, 4);
    assert.equal(h.entry.folgasSemAlteracao, 1);
    assert.ok('britanica' in h.entry && 'naoPreenchida' in h.entry && 'dias' in h.entry);
    assert.deepEqual(plain(h.AF.estado.preAnalise.ANA.folgas), 5);
});

test('adjustment equal to the previous analysis logs no divergence', async () => {
    const h = harness({ anterior: { folgas: 5, cod47: 1, semES: 0, interj: 0, britanica: 0, naoPreenchida: 0 } });
    await h.run();
    const texto = h.AF.log.texto();
    assert.match(texto, /Estado inicial igual ao da analise anterior/);
    assert.doesNotMatch(texto, /Estado inicial diverge/);
});

test('adjustment diverging from the previous analysis logs both values and proceeds', async () => {
    const h = harness({ anterior: { folgas: 6, cod47: 1, semES: 0, interj: 0, britanica: 0, naoPreenchida: 0 } });
    await h.run();
    const texto = h.AF.log.texto();
    assert.match(texto, /Estado inicial diverge da analise anterior; usando o estado atual/);
    assert.match(texto, /campo=folgas, analise=6, atual=5/);
    assert.equal(h.entry.lido, true);
});

test('interrupted sheet keeps the before state and marks the after state as not collected', async () => {
    const h = harness({ stopAfterPhase: 1 });
    await h.run();
    const texto = h.AF.log.texto();
    assert.match(texto, /Estado antes do ajuste/);
    assert.match(texto, /Estado depois: nao coletado \(folha interrompida\)/);
    assert.match(texto, /coletado: false/);
    assert.doesNotMatch(texto, /Estado depois do ajuste/);
    assert.equal(h.entry.parcial, true);
});

test('state capture failure is recorded and the sheet still completes', async () => {
    const h = harness();
    h.AF.fases.capturarEstadoFolha = () => { throw new Error('leitura indisponivel'); };
    h.AF.fases.analisarFolha = () => ({ irregs: 2, interj: 1, britanica: 0, naoPreenchida: null });
    await h.run();
    const texto = h.AF.log.texto();
    assert.match(texto, /Falha ao registrar o estado inicial: leitura indisponivel/);
    assert.match(texto, /Falha ao registrar o estado final: leitura indisponivel/);
    assert.equal(h.entry.lido, true);
    assert.equal(h.entry.irregs, 2);
    assert.equal(h.relStats.irregsRestantes, 2);
});

test('phase 3 actions and results are recorded with origin and destination', async () => {
    const h = harness({
        acoesFase3: [{ tipo: 'domingo_oculto', semanaId: 's', dataAusencia: dd(2), dataOrigem: dd(6), numAbrirPopup: '4' }],
        executarAcaoFolga: async () => ({ ok: false, semAlteracao: true, outcome: { status: 'no-change', stage: 'popup-save' } })
    });
    await h.run();
    const texto = h.AF.log.texto();
    assert.match(texto, /Fase 3: ausencia 02\/09\/2026 <- origem 06\/09\/2026 => sem-alteracao/);
    assert.match(texto, /tipo: domingo_oculto/);
    assert.match(texto, /Folga presa: 06\/09\/2026 \(fase 3\)/);
    assert.match(texto, /motivo: sem alteracao no popup \(fase 3\)/);
});

test('phase 1 and 2 actions record results and trapped reasons', async () => {
    const AF = loadFases();
    AF.log.iniciarExecucao('ajuste');
    const execucao = { isActive: () => true };
    AF.mapa.mapearFolhaAtual = () => ({});

    const rodadas1 = [
        { presa: { fase: 1, semanaId: 's', dataFolga: dd(12), numFolga: '3' } },
        { acao: { dataAusencia: dd(2), dataOrigem: dd(13), semanaId: 's', numAbrirPopup: '4' } },
        { acao: { dataAusencia: dd(9), dataOrigem: dd(14), semanaId: 's', numAbrirPopup: '5' } },
        { acabou: true }
    ];
    AF.planejamento.planejarFase1Rodada = () => rodadas1.shift();
    const resultados = [
        { ok: true, semAlteracao: false },
        { ok: false, semAlteracao: true, outcome: { status: 'no-change', stage: 'popup-save' } }
    ];
    AF.popup.executarAcaoFolga = async () => resultados.shift();

    const r1 = await AF.fases.processarFase1(execucao);
    assert.equal(r1.movidas, 1);
    assert.equal(r1.presas.length, 2);
    assert.equal(r1.presas[0].motivo, 'sem destino elegivel na semana (planejador)');
    assert.equal(r1.presas[1].motivo, 'sem alteracao no popup (destino nao aceito)');

    const rodadas2 = [{ acao: { dataAusencia: dd(16), dataOrigem: dd(20), semanaId: 's', numAbrirPopup: '6' }, tipo: 'oculta' }];
    AF.planejamento.planejarFase2Rodada = () => rodadas2.length ? rodadas2.shift() : { acabou: true };
    AF.popup.executarAcaoFolga = async () => ({ ok: false, semAlteracao: true });
    const r2 = await AF.fases.processarFase2(execucao);
    assert.equal(r2.presas[0].motivo, 'sem alteracao no popup (folga oculta)');

    const texto = AF.log.texto();
    assert.match(texto, /Fase 1: ausencia 02\/09\/2026 <- origem 13\/09\/2026 => movida/);
    assert.match(texto, /Fase 1: ausencia 09\/09\/2026 <- origem 14\/09\/2026 => sem-alteracao/);
    assert.match(texto, /Fase 2: ausencia 16\/09\/2026 <- origem 20\/09\/2026 => sem-alteracao/);
    assert.match(texto, /resultado: movida/);
});

test('phase 4 records each 47 to 48 change with its date', () => {
    const AF = loadFases();
    AF.log.iniciarExecucao('ajuste');
    AF.utils.mesAlvoDaTabela = () => ALVO;
    AF.mapa.obterDataDoInput = inp => inp.data;

    function criarLinha(num, data) {
        const select = {
            options: [{ value: '47' }, { value: '48' }], value: '47',
            dispatchEvent() {}
        };
        const tr = { querySelector: sel => (sel === 'select[name="lstNome' + num + '"]' ? select : null) };
        return { name: 'CodJust' + num, value: '47', data, closest: () => tr, select };
    }
    const linhas = [criarLinha('7', dd(8)), criarLinha('9', dd(10))];
    AF.core.getDoc1 = () => ({
        querySelectorAll: () => linhas,
        querySelector: sel => (sel === '[name="CodJust7"]' ? { value: '47' } : sel === '[name="CodJust9"]' ? { value: '47' } : null)
    });

    const marcados = AF.fases.processarFase4({ isActive: () => true });

    assert.deepEqual(plain(marcados), ['7', '9']);
    assert.equal(linhas[0].select.value, '48');
    const texto = AF.log.texto();
    assert.match(texto, /Fase 4: 08\/09\/2026 47 -> 48/);
    assert.match(texto, /Fase 4: 10\/09\/2026 47 -> 48/);
    assert.match(texto, /para: 48/);
});

test('failures and stops record stage, reason and unconfirmed result as structured data', () => {
    const AF = load(['00-core.js', '05-log.js'], true);
    AF.log.iniciarExecucao('ajuste');
    AF.log.definirFuncionario('ANA');

    AF.core.pararExecucaoAjuste({ status: 'error', stage: 'footer-save', reason: 'reload nao observado', unconfirmed: true });
    AF.core.pararExecucaoAjuste({ status: 'cancelled', stage: 'user-stop', reason: 'Parada solicitada pelo usuario.' });

    const eventos = AF.log.eventosDaExecucao();
    const falha = eventos.find(e => e.tipo === 'falha');
    assert.deepEqual(plain(falha.dados), { status: 'error', stage: 'footer-save', reason: 'reload nao observado', unconfirmed: true });
    assert.equal(falha.func, 'ANA');
    assert.ok(eventos.some(e => e.tipo === 'parada' && e.dados.stage === 'user-stop'));
    const texto = AF.log.texto();
    assert.match(texto, /Interrompido \(footer-save\): reload nao observado \(resultado nao confirmado\)/);
    assert.match(texto, /unconfirmed: true/);
});
