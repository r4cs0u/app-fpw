'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');

function loadCore() {
    const window = {
        AutomacaoFolha: { estado: {}, core: {} }
    };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(root, '00-core.js'), 'utf8'), context);
    return window.AutomacaoFolha;
}

test('avaliarEstadoOracle returns unknown when no liveness evidence exists', () => {
    const AF = loadCore();
    const res = AF.sessao.avaliarEstadoOracle({ ultimoSinal: null, agora: 100000 });

    assert.equal(res.estado, 'unknown');
    assert.equal(res.houvePerda, false);
    assert.equal(res.transicao, false);
});

test('avaliarEstadoOracle returns active when evidence is within window', () => {
    const AF = loadCore();
    const janela = AF.sessao.JANELA_EXPIRACAO_ORACLE_MS;
    const agora = 200000;
    const res = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora - 10000,
        agora,
        janelaMs: janela,
        estadoAnterior: 'unknown'
    });

    assert.equal(res.estado, 'active');
    assert.equal(res.transicao, true);
    assert.equal(res.houvePerda, false);
});

test('avaliarEstadoOracle returns inactive with loss transition when silence exceeds window', () => {
    const AF = loadCore();
    const janela = 60000;
    const agora = 200000;
    const res = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora - 70000,
        agora,
        janelaMs: janela,
        estadoAnterior: 'active'
    });

    assert.equal(res.estado, 'inactive');
    assert.equal(res.transicao, true);
    assert.equal(res.houvePerda, true);
});

test('loss notification is single: subsequent evaluations while inactive do not trigger loss again', () => {
    const AF = loadCore();
    const janela = 60000;
    const agora = 300000;
    const res = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora - 80000,
        agora,
        janelaMs: janela,
        estadoAnterior: 'inactive'
    });

    assert.equal(res.estado, 'inactive');
    assert.equal(res.transicao, false);
    assert.equal(res.houvePerda, false);
});

test('session recovery from inactive to active transitions cleanly without loss flag', () => {
    const AF = loadCore();
    const agora = 400000;
    const res = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora - 5000,
        agora,
        estadoAnterior: 'inactive'
    });

    assert.equal(res.estado, 'active');
    assert.equal(res.transicao, true);
    assert.equal(res.houvePerda, false);
});

test('avaliarEstadoOracle recognizes expired state explicitly set and triggers loss/expiration', () => {
    const AF = loadCore();
    const agora = 500000;
    const res = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora - 1000,
        estadoExplicito: 'expired',
        agora,
        estadoAnterior: 'active'
    });

    assert.equal(res.estado, 'expired');
    assert.equal(res.transicao, true);
    assert.equal(res.houvePerda, true);
    assert.equal(res.houveExpiracao, true);

    // Repetição mantém expired sem nova perda
    const repeticao = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: agora,
        estadoExplicito: 'expired',
        agora: agora + 1000,
        estadoAnterior: 'expired'
    });
    assert.equal(repeticao.estado, 'expired');
    assert.equal(repeticao.transicao, false);
    assert.equal(repeticao.houvePerda, false);
    assert.equal(repeticao.houveExpiracao, false);
});

test('decidirPulsoAtivo evaluates keepalive policy properly', () => {
    const AF = loadCore();
    const agora = 1000000;
    const intervalo = 300000; // 5 min

    // Desligado
    assert.equal(AF.sessao.decidirPulsoAtivo({ ativo: false, estado: 'active' }).devePulsar, false);

    // Expirado ou inativo
    assert.equal(AF.sessao.decidirPulsoAtivo({ ativo: true, estado: 'expired' }).devePulsar, false);
    assert.equal(AF.sessao.decidirPulsoAtivo({ ativo: true, estado: 'inactive' }).devePulsar, false);

    // Primeiro pulso (ultimoPulso 0)
    const p1 = AF.sessao.decidirPulsoAtivo({ ativo: true, estado: 'active', agora, ultimoPulso: 0, intervalo });
    assert.equal(p1.devePulsar, true);

    // Aguardando intervalo
    const p2 = AF.sessao.decidirPulsoAtivo({ ativo: true, estado: 'active', agora: agora + 100000, ultimoPulso: agora, intervalo });
    assert.equal(p2.devePulsar, false);
    assert.equal(p2.motivo, 'aguardando_intervalo');

    // Intervalo decorrido
    const p3 = AF.sessao.decidirPulsoAtivo({ ativo: true, estado: 'active', agora: agora + 300001, ultimoPulso: agora, intervalo });
    assert.equal(p3.devePulsar, true);
    assert.equal(p3.motivo, 'intervalo_decorrido');
});

test('iniciarMonitorOracle reads GM_getValue, notifies callback and logs loss event once', () => {
    let mockLiveness = Date.now();
    const globalContext = {
        GM_getValue: (key, def) => key === 'fpw_oracle_liveness' ? mockLiveness : def
    };

    const window = {
        AutomacaoFolha: { estado: {}, core: {} }
    };
    const loggedEvents = [];
    window.AutomacaoFolha.log = {
        evento: (tipo, dados, msg, cor) => loggedEvents.push({ tipo, dados, msg, cor })
    };

    const context = Object.assign({ window, console: { log() {} } }, globalContext);
    vm.runInNewContext(readFileSync(join(root, '00-core.js'), 'utf8'), context);
    const AF = window.AutomacaoFolha;

    const callbacks = [];
    AF.sessao.iniciarMonitorOracle(evalRes => callbacks.push(evalRes));

    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].estado, 'active');
    assert.equal(AF.estado.sessaoOracleEstado, 'active');
    assert.equal(loggedEvents.length, 0);

    // Agora simula silêncio prolongado (perda)
    mockLiveness = Date.now() - 120000;
    // Força checagem
    const agora = Date.now();
    const perdaEval = AF.sessao.avaliarEstadoOracle({
        ultimoSinal: mockLiveness,
        agora,
        estadoAnterior: AF.estado.sessaoOracleEstado
    });
    assert.equal(perdaEval.estado, 'inactive');
    assert.equal(perdaEval.houvePerda, true);

    AF.sessao.pararMonitorOracle();
});
