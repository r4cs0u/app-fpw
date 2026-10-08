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
        setItem: (key, value) => { data.set(key, String(value)); },
        removeItem: key => { data.delete(key); }
    };
}

function loadModelo(storage = createStorage()) {
    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {}
        },
        sessionStorage: storage
    };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(__dirname, '..', '10-utils.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(__dirname, '..', '27-modelo-relatorio.js'), 'utf8'), context);
    return { AF: window.AutomacaoFolha, storage };
}

test('1.1: Modelo unificado permite Ajuste apos Analise sem apagar Analise', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA'], 'Setembro 2026');
    AF.modelo.registrarAnalise('ANA', { folgas: 5, cod47: 2, irregs: 1 });
    AF.modelo.registrarAnalise('BIA', { folgas: 0, cod47: 0, irregs: 0 });
    AF.modelo.encerrarExecucao('analise', 'concluida');

    // Executa Ajuste em ANA
    AF.modelo.iniciarExecucao('ajuste', null, null);
    AF.modelo.registrarAjuste('ANA', { movidas: 4, presas: [{ data: '12/09/2026', motivo: 'sem destino' }], cod47Conv: 2, cod47Rest: 0 });
    AF.modelo.encerrarExecucao('ajuste', 'concluida');

    const ana = AF.modelo.obterDadosFunc('ANA');
    const bia = AF.modelo.obterDadosFunc('BIA');

    assert.equal(ana.folgas.texto, '4/5');
    assert.equal(ana.cod47.texto, '2/2');
    assert.equal(ana.folgas.estado, 'atencao');
    assert.equal(ana.folgas.presas, 1);

    // BIA manteve dados de analise intactos
    assert.equal(bia.folgas.texto, '0');
    assert.equal(bia.folgas.estado, 'zero');
});

test('1.1 & 1.2: Nova Analise apos Ajuste reseta a fracao para numero inteiro', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ANA']);
    AF.modelo.registrarAjuste('ANA', { movidas: 4, presas: [{ data: '12/09/2026' }], cod47Conv: 1, cod47Rest: 1 });
    AF.modelo.encerrarExecucao('ajuste');

    assert.equal(AF.modelo.obterDadosFunc('ANA').folgas.texto, '4/5');

    // Nova analise
    AF.modelo.iniciarExecucao('analise', ['ANA']);
    AF.modelo.registrarAnalise('ANA', { folgas: 1, cod47: 1, irregs: 0 });
    AF.modelo.encerrarExecucao('analise');

    const ana = AF.modelo.obterDadosFunc('ANA');
    assert.equal(ana.folgas.texto, '1');
    assert.equal(ana.folgas.estado, 'pendente');
    assert.equal(ana.cod47.texto, '1');
});

test('1.2: Ajuste sem Analise previa (2/2) e ajuste com presas sem movidas (0/1)', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['CARLOS', 'DANI']);
    AF.modelo.registrarAjuste('CARLOS', { movidas: 2, presas: [] });
    AF.modelo.registrarAjuste('DANI', { movidas: 0, presas: [{ data: '15/09/2026', motivo: 'popup rejeitou' }] });

    const carlos = AF.modelo.obterDadosFunc('CARLOS');
    assert.equal(carlos.folgas.texto, '2/2');
    assert.equal(carlos.folgas.estado, 'concluida');

    const dani = AF.modelo.obterDadosFunc('DANI');
    assert.equal(dani.folgas.texto, '0/1');
    assert.equal(dani.folgas.estado, 'atencao');
});

test('1.2: Ajuste repetido acumula movidas e mantem presas mais recentes', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ANA']);
    AF.modelo.registrarAjuste('ANA', { movidas: 4, presas: [{ data: '12/09/2026' }] });
    // Segunda rodada de ajuste
    AF.modelo.registrarAjuste('ANA', { movidas: 0, presas: [{ data: '12/09/2026' }] });

    const ana = AF.modelo.obterDadosFunc('ANA');
    assert.equal(ana.folgas.texto, '4/5');
    assert.equal(ana.folgas.num, 4);
    assert.equal(ana.folgas.den, 5);
});

test('1.2: Cores e estados (concluida, atencao, pendente, zero, nao-processado)', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['F_PEND', 'F_ZERO', 'F_NAO']);
    AF.modelo.registrarAnalise('F_PEND', { folgas: 3 });
    AF.modelo.registrarAnalise('F_ZERO', { folgas: 0 });

    assert.equal(AF.modelo.obterDadosFunc('F_PEND').folgas.estado, 'pendente');
    assert.equal(AF.modelo.obterDadosFunc('F_ZERO').folgas.estado, 'zero');
    assert.equal(AF.modelo.obterDadosFunc('F_NAO').folgas.estado, 'nao-processado');
    assert.equal(AF.modelo.obterDadosFunc('F_NAO').folgas.texto, '-');
});

test('1.3: Resumo geral (Big Numbers) calcula totais, pendentes, presas, minimos e maximos sem zeros', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['F1', 'F2', 'F3']);
    AF.modelo.registrarAnalise('F1', { folgas: 0, irregs: 4, HE: '00:09', HEC: '+11:00' });
    AF.modelo.registrarAnalise('F2', { folgas: 8, irregs: 1, HE: '07:19', HEC: '-35:00' });
    AF.modelo.registrarAnalise('F3', { folgas: 0, irregs: 0, HE: '00:00', HEC: '-08:13' });

    // Ajustamos F1 com 12 movidas e 3 presas (simulando historico)
    AF.modelo.iniciarExecucao('ajuste', null);
    AF.modelo.registrarAjuste('F1', { movidas: 12, presas: [{}, {}, {}] });

    const resumo = AF.modelo.resumo();

    // Folgas: 12 movidas, 3 presas, 8 pendentes (de F2) -> totalConsiderado: 23
    assert.equal(resumo.folgas.movidas, 12);
    assert.equal(resumo.folgas.presas, 3);
    assert.equal(resumo.folgas.pendentes, 8);
    assert.equal(resumo.folgas.totalConsiderado, 23);
    assert.equal(resumo.folgas.fracaoTexto, '12/23');

    // Irregularidades
    assert.equal(resumo.irregularidades.semES.total, 5);
    assert.equal(resumo.irregularidades.semES.funcs, 2);

    // Horas HE: exclui 00:00 -> min 00:09 (F1), max 07:19 (F2)
    assert.equal(resumo.he.min, '00:09');
    assert.equal(resumo.he.minNome, 'F1');
    assert.equal(resumo.he.max, '07:19');
    assert.equal(resumo.he.maxNome, 'F2');

    // HEC Positivo: +11:00
    assert.equal(resumo.hecPos.total, '11:00');
    assert.equal(resumo.hecPos.min, '+11:00');

    // HEC Negativo: -08:13 e -35:00 -> max magnitude é -35:00
    assert.equal(resumo.hecNeg.total, '-43:13');
    assert.equal(resumo.hecNeg.min, '-08:13');
    assert.equal(resumo.hecNeg.max, '-35:00');
    assert.equal(resumo.hecNeg.maxNome, 'F2');
});

test('1.4: Filtros retornam subconjunto de funcionarios e ordenacao respeita pendentes e processados', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO']);
    AF.modelo.registrarAnalise('ANA', { folgas: 3, irregs: 1 });
    AF.modelo.registrarAnalise('BIA', { folgas: 0, irregs: 0 });
    // CAIO não processado

    assert.deepEqual(plain(AF.modelo.filtrar('semES')), ['ANA']);
    assert.deepEqual(plain(AF.modelo.filtrar('pendentes')), ['ANA']);
    assert.deepEqual(plain(AF.modelo.filtrar('presas')), []);

    const ordenados = AF.modelo.ordenar(['BIA', 'CAIO', 'ANA'], 'nome', 1);
    // Processados primeiro, CAIO por último
    assert.equal(ordenados[0], 'ANA');
    assert.equal(ordenados[1], 'BIA');
    assert.equal(ordenados[2], 'CAIO');
});

test('1.5: TSV sob demanda formata fracoes com aspas e valores negativos', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ANA']);
    AF.modelo.registrarAjuste('ANA', {
        movidas: 4, presas: [{}], cod47Conv: 1, cod47Rest: 0,
        leitura: { HEC: '-05:00', semES: { total: 2 } }
    });

    const tsv = AF.modelo.tsv();
    assert.match(tsv, /ANA\t'4\/5\t1\t'1\/1\t2\t0\t0\t-\t00:00\t00:00\t'-05:00/);
});

test('1.6: Persistencia e recuperacao de execucao interrompida', () => {
    const storage = createStorage();
    const m1 = loadModelo(storage);
    m1.AF.modelo.iniciarExecucao('analise', ['ANA']);
    m1.AF.modelo.registrarAnalise('ANA', { folgas: 2 });
    m1.AF.modelo.salvar();

    // Simula reload em m2
    const m2 = loadModelo(storage);
    const estado = m2.AF.modelo.obterEstado();
    assert.equal(estado.execs.analise.status, 'interrompida');
    assert.equal(m2.AF.modelo.obterDadosFunc('ANA').folgas.texto, '2');
});

test('Ajuste apos Analise mantem as irregularidades (lista de dias do detector, nao so o total)', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA']);
    AF.modelo.registrarAnalise('ANA', {
        folgas: 2, irregs: 4, interj: 1, britanica: 3,
        dias: { semES: [{ data: '08/09/2026' }], interj: [{ data: '05/09/2026' }], britanica: [{ data: '02/09/2026' }] },
        naoPreenchida: { avaliada: true, flag: true, pctNaoPreenchida: 40, criterios: ['fracao'], visiveis: 20, preenchidos: 12 },
        HE: '01:00', HEF: '00:00', HEC: '-02:00'
    });

    // Formato real enviado por 40-fases: {total, dias}
    AF.modelo.iniciarExecucao('ajuste', null);
    AF.modelo.registrarAjuste('ANA', {
        movidas: 2, presas: [], cod47Conv: 0, cod47Rest: 0,
        leitura: {
            semES: { total: 4, dias: [{ data: '08/09/2026' }] },
            interj: { total: 1, dias: [{ data: '05/09/2026' }] },
            britanica: { total: 3, dias: [{ data: '02/09/2026' }] },
            naoPreenchida: { avaliada: true, flag: true, pctNaoPreenchida: 40, criterios: ['fracao'], visiveis: 20, preenchidos: 12 },
            HE: '01:00', HEF: '00:00', HEC: '-02:00'
        }
    });

    const d = AF.modelo.obterDadosFunc('ANA');
    assert.equal(d.semES.total, 4);
    assert.equal(d.interj.total, 1);
    assert.equal(d.britanica.total, 3);
    assert.equal(d.naoPreenchida.texto, '40%');
    assert.equal(d.HEC, '-02:00');
});

test('o modelo tambem aceita a lista de dias pura (array) sem perder o total', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ANA']);
    AF.modelo.registrarAjuste('ANA', {
        movidas: 0, presas: [],
        leitura: {
            semES: [{ data: '08/09/2026' }, { data: '09/09/2026' }],
            interj: [],
            britanica: [{ data: '02/09/2026' }, { data: '10/09/2026' }, { data: '15/09/2026' }],
            HE: '00:00', HEF: '00:00', HEC: '00:00'
        }
    });
    const d = AF.modelo.obterDadosFunc('ANA');
    assert.equal(d.semES.total, 2);
    assert.equal(d.interj.total, 0);
    assert.equal(d.britanica.total, 3);
    assert.equal(plain(d.britanica.dias).length, 3);
});

test('folha sem marcacoes mostra "-" em todas as colunas, na Analise e no Ajuste', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['VAZIA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    AF.modelo.iniciarExecucao('ajuste', null);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'ajuste');

    const d = AF.modelo.obterDadosFunc('VAZIA');
    assert.equal(d.processado, true);
    assert.equal(d.vazia, true);
    assert.equal(d.folgas.texto, '-');
    assert.equal(d.cod47.texto, '-');
    assert.equal(d.semES.total, null);
    assert.equal(d.interj.total, null);
    assert.equal(d.britanica.total, null);
    assert.equal(d.naoPreenchida.texto, '-');
    assert.equal(d.HE, null);
    assert.equal(d.HEF, null);
    assert.equal(d.HEC, null);
});

test('folha sem marcacoes nao entra nos indicadores, nos filtros nem no TSV', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['VAZIA', 'ANA']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    AF.modelo.registrarAnalise('ANA', { folgas: 3, irregs: 2, HE: '01:00' });

    const resumo = AF.modelo.resumo();
    assert.equal(resumo.folgas.pendentes, 3);
    assert.equal(resumo.irregularidades.semES.funcs, 1);
    assert.deepEqual(plain(AF.modelo.filtrar('pendentes')), ['ANA']);
    assert.deepEqual(plain(AF.modelo.filtrar('semES')), ['ANA']);
    assert.doesNotMatch(AF.modelo.tsv(), /VAZIA/);
});
function equipeComHoras() {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO', 'DANI', 'ZERO']);
    AF.modelo.registrarAnalise('ANA',  { folgas: 0, HE: '07:19', HEF: '00:00', HEC: '11:00' });
    AF.modelo.registrarAnalise('BIA',  { folgas: 0, HE: '00:09', HEF: '01:54', HEC: '-35:00' });
    AF.modelo.registrarAnalise('CAIO', { folgas: 0, HE: '05:46', HEF: '08:42', HEC: '00:19' });
    AF.modelo.registrarAnalise('DANI', { folgas: 0, HE: '00:26', HEF: '00:00', HEC: '-08:13' });
    AF.modelo.registrarAnalise('ZERO', { folgas: 0, HE: '00:00', HEF: '00:00', HEC: '00:00' });
    return AF;
}

test('extremo "max" ordena do maior para o menor e exclui quem esta zerado na coluna', () => {
    const AF = equipeComHoras();
    const nomes = ['ANA', 'BIA', 'CAIO', 'DANI', 'ZERO'];
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'he', 'max', 0)), ['ANA', 'CAIO', 'DANI', 'BIA']);
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'hef', 'max', 0)), ['CAIO', 'BIA']);
});

test('extremo "min" ordena do menor para o maior e tambem exclui os zerados', () => {
    const AF = equipeComHoras();
    const nomes = ['ANA', 'BIA', 'CAIO', 'DANI', 'ZERO'];
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'he', 'min', 0)), ['BIA', 'DANI', 'CAIO', 'ANA']);
});

test('extremos de HEC separam positivos e negativos; no negativo "max" e o de maior magnitude', () => {
    const AF = equipeComHoras();
    const nomes = ['ANA', 'BIA', 'CAIO', 'DANI', 'ZERO'];
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'hec', 'max', 1)), ['ANA', 'CAIO']);
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'hec', 'min', 1)), ['CAIO', 'ANA']);
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'hec', 'max', -1)), ['BIA', 'DANI']);
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(nomes, 'hec', 'min', -1)), ['DANI', 'BIA']);
});

test('extremos ignoram nao processados e folhas sem marcacoes, e respeitam um filtro previo', () => {
    const AF = equipeComHoras();
    AF.modelo.iniciarExecucao('analise', ['VAZIA', 'NOVO']);
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');
    const todos = ['ANA', 'BIA', 'CAIO', 'DANI', 'ZERO', 'VAZIA', 'NOVO'];
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(todos, 'he', 'max', 0)), ['ANA', 'CAIO', 'DANI', 'BIA']);
    assert.deepEqual(plain(AF.modelo.ordenarPorExtremo(['BIA', 'CAIO'], 'he', 'max', 0)), ['CAIO', 'BIA']);
});

test('exportacao formata datas em ordem cronologica, remove repetidas e preserva datas invalidas no fim', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA']);
    AF.modelo.registrarAnalise('ANA', {
        irregs: 5,
        dias: {
            semES: [
                { data: '04/10/2026' }, '01/09/2026', '04/10/2026',
                { data: '07/09/2026' }, '31/02/2026'
            ]
        }
    });
    assert.equal(
        AF.modelo.textoIrregularidades('ANA'),
        '*ANA\n- s/marcação de entrada ou saída nos dias, 01/09, 07/09, 04/10, 31/02/2026.'
    );
});

test('exportacao gera todas as linhas na ordem definida e informa quando faltam datas', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA']);
    AF.modelo.registrarAnalise('ANA', {
        irregs: 3,
        interj: 1,
        britanica: 3,
        dias: {
            semES: [{ data: '27/09/2026' }, '01/09/2026', '03/09/2026'],
            interj: [{ data: '07/09/2026' }],
            britanica: ['06/09/2026', '04/09/2026', '05/09/2026']
        }
    });
    AF.modelo.registrarAnalise('BIA', { irregs: 2, interj: 0, britanica: 0 });

    assert.equal(AF.modelo.textoIrregularidades('ANA'), [
        '*ANA',
        '- s/marcação de entrada ou saída nos dias, 01/09, 03/09, 27/09.',
        '- Checar se interjornada é devida nos dias, 07/09.',
        '- Ajustar marcações britânicas, nos dias 04/09, 05/09, 06/09.'
    ].join('\n'));
    assert.equal(AF.modelo.textoIrregularidades('BIA'),
        '*BIA\n- s/marcação de entrada ou saída nos dias, (2 ocorrências; datas não disponíveis).');
});

test('folha nao preenchida exporta somente o aviso e suprime as outras irregularidades', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['THALES']);
    AF.modelo.registrarAnalise('THALES', {
        irregs: 5,
        interj: 2,
        britanica: 3,
        dias: {
            semES: ['01/09/2026', '03/09/2026'],
            interj: ['05/09/2026', '06/09/2026'],
            britanica: ['02/09/2026', '08/09/2026', '15/09/2026']
        },
        naoPreenchida: { avaliada: true, flag: true, pctNaoPreenchida: 79 }
    });

    assert.equal(AF.modelo.textoIrregularidades('THALES'),
        '*THALES\n- Realizar o preenchimento da folha (79% dos dias sem marcação).');
});

test('exportacao omite sem irregularidades, folha vazia e funcionario nao processado', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'VAZIA', 'NOVO']);
    AF.modelo.registrarAnalise('ANA', { folgas: 1 });
    AF.modelo.registrarAnalise('BIA', { britanica: 1, dias: { britanica: ['05/09/2026'] } });
    AF.modelo.registrarSemMarcacoes('VAZIA', 'analise');

    assert.equal(AF.modelo.textoIrregularidades('ANA'), '');
    assert.equal(AF.modelo.textoIrregularidades('VAZIA'), '');
    assert.equal(AF.modelo.textoIrregularidades('NOVO'), '');
    assert.equal(AF.modelo.textoIrregularidades('BIA'),
        '*BIA\n- Ajustar marcações britânicas, nos dias 05/09.');
});

test('exportacao remove o sufixo numerico do seletor, preservando numeros internos ao nome', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['MARIA 2 SILVA 4812']);
    AF.modelo.registrarAnalise('MARIA 2 SILVA 4812', {
        britanica: 1,
        dias: { britanica: ['05/09/2026'] }
    });

    assert.equal(AF.modelo.textoIrregularidades('MARIA 2 SILVA 4812'),
        '*MARIA 2 SILVA\n- Ajustar marcações britânicas, nos dias 05/09.');
});

test('exportacao do time respeita nomes recebidos, adiciona mes e rotulo do filtro', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA', 'BIA', 'CAIO'], 'Outubro 2026');
    AF.modelo.registrarAnalise('ANA', { britanica: 1, dias: { britanica: ['02/10/2026'] } });
    AF.modelo.registrarAnalise('BIA', { irregs: 1, dias: { semES: ['03/10/2026'] } });
    AF.modelo.registrarAnalise('CAIO', { folgas: 0 });

    assert.equal(AF.modelo.textoIrregularidadesTime(['ANA', 'BIA'], 'britanica'), [
        '*Irregularidades – Outubro 2026 – Marc. Britânicas',
        '',
        '*ANA',
        '- Ajustar marcações britânicas, nos dias 02/10.',
        '',
        '*BIA',
        '- s/marcação de entrada ou saída nos dias, 03/10.'
    ].join('\n'));
    assert.equal(AF.modelo.textoIrregularidadesTime(['CAIO'], null),
        '*Irregularidades – Outubro 2026\n\nNenhuma irregularidade para exportar.');
});

test('exportacao usa a leitura mais recente e persiste os dias apos recarga', () => {
    const storage = createStorage();
    const first = loadModelo(storage);
    first.AF.modelo.iniciarExecucao('analise', ['ANA'], 'Setembro 2026');
    first.AF.modelo.registrarAnalise('ANA', { irregs: 1, dias: { semES: ['02/09/2026'] } });
    first.AF.modelo.iniciarExecucao('ajuste', null);
    first.AF.modelo.registrarAjuste('ANA', {
        movidas: 0, presas: [],
        leitura: { semES: { total: 1, dias: [{ data: '08/09/2026' }] } }
    });
    const textoAntes = first.AF.modelo.textoIrregularidades('ANA');
    assert.match(textoAntes, /08\/09/);
    assert.doesNotMatch(textoAntes, /02\/09/);

    first.AF.modelo.salvar();
    const restored = loadModelo(storage);
    assert.equal(restored.AF.modelo.restaurar(), true);
    assert.equal(restored.AF.modelo.textoIrregularidades('ANA'), textoAntes);
});
function equipeParaFiltros() {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('analise', ['ANA SILVA 12', 'BIA SOUZA', 'CAIO ÁVILA', 'DINA', 'VAZIA SILVA', 'NOVO'], 'Setembro 2026');
    AF.modelo.registrarAnalise('ANA SILVA 12', { folgas: 2, irregs: 1, interj: 1 });
    AF.modelo.registrarAnalise('BIA SOUZA', { folgas: 0, interj: 2 });
    AF.modelo.registrarAnalise('CAIO ÁVILA', { folgas: 0, britanica: 1 });
    AF.modelo.registrarAnalise('DINA', { folgas: 0 });
    AF.modelo.registrarSemMarcacoes('VAZIA SILVA', 'analise');
    return AF;
}

test('filtros por indicador se somam sem duplicar quem tem mais de um', () => {
    const AF = equipeParaFiltros();

    assert.deepEqual(plain(AF.modelo.filtrar(['semES'])), ['ANA SILVA 12']);
    assert.deepEqual(plain(AF.modelo.filtrar(['semES', 'interj'])), ['ANA SILVA 12', 'BIA SOUZA']);
    assert.deepEqual(plain(AF.modelo.filtrar(['interj', 'britanica', 'semES'])),
        ['ANA SILVA 12', 'BIA SOUZA', 'CAIO ÁVILA']);
    assert.deepEqual(plain(AF.modelo.filtrar(['semES', 'semES'])), ['ANA SILVA 12']);
});

test('indicadores ativos excluem nao processados e folhas sem marcacoes; sem indicador tudo aparece', () => {
    const AF = equipeParaFiltros();

    assert.equal(AF.modelo.filtrar([]).length, 6);
    assert.equal(AF.modelo.filtrar(null).length, 6);
    const comIndicador = plain(AF.modelo.filtrar(['semES', 'interj', 'britanica', 'pendentes', 'presas', 'naoPreenchida']));
    assert.ok(!comIndicador.includes('NOVO'));
    assert.ok(!comIndicador.includes('VAZIA SILVA'));
});

test('Movim. lista quem tem folgas depois da Analise e depois do Ajuste, inclusive presas', () => {
    const AF = equipeParaFiltros();
    assert.deepEqual(plain(AF.modelo.filtrar(['pendentes'])), ['ANA SILVA 12']);

    AF.modelo.iniciarExecucao('ajuste', null);
    AF.modelo.registrarAjuste('ANA SILVA 12', { movidas: 2, presas: [], cod47Conv: 0, cod47Rest: 0 });
    AF.modelo.registrarAjuste('BIA SOUZA', { movidas: 0, presas: [{ fase: 1, dataFolga: '02/09/2026', motivo: 'x' }], cod47Conv: 0, cod47Rest: 0 });
    AF.modelo.registrarAjuste('DINA', { movidas: 0, presas: [], cod47Conv: 0, cod47Rest: 0 });

    assert.deepEqual(plain(AF.modelo.filtrar(['pendentes'])), ['ANA SILVA 12', 'BIA SOUZA']);
    assert.deepEqual(plain(AF.modelo.filtrar(['presas'])), ['BIA SOUZA']);
    assert.deepEqual(plain(AF.modelo.filtrar('pendentes')), ['ANA SILVA 12', 'BIA SOUZA']);
});

test('busca por nome ignora acentos, caixa e sufixo numerico e exige todas as palavras', () => {
    const AF = equipeParaFiltros();

    assert.deepEqual(plain(AF.modelo.filtrar([], 'silva')), ['ANA SILVA 12', 'VAZIA SILVA']);
    assert.deepEqual(plain(AF.modelo.filtrar([], 'avila')), ['CAIO ÁVILA']);
    assert.deepEqual(plain(AF.modelo.filtrar([], 'ÁVILA caio')), ['CAIO ÁVILA']);
    assert.deepEqual(plain(AF.modelo.filtrar([], '12')), []);
    assert.deepEqual(plain(AF.modelo.filtrar([], 'ana souza')), []);
    assert.equal(AF.modelo.filtrar([], '   ').length, 6);
});

test('busca se combina por intersecao com os indicadores e sem indicador inclui nao processados', () => {
    const AF = equipeParaFiltros();

    assert.deepEqual(plain(AF.modelo.filtrar(['interj'], 'silva')), ['ANA SILVA 12']);
    assert.deepEqual(plain(AF.modelo.filtrar(['interj', 'britanica'], 'souza')), ['BIA SOUZA']);
    assert.deepEqual(plain(AF.modelo.filtrar([], 'novo')), ['NOVO']);
    assert.deepEqual(plain(AF.modelo.filtrar(['interj'], 'novo')), []);
});

test('titulo da exportacao indica todos os filtros e a busca, preservando o formato com um filtro', () => {
    const AF = equipeParaFiltros();

    assert.match(AF.modelo.textoIrregularidadesTime([], ['semES', 'interj']), /^\*Irregularidades – Setembro 2026 – Sem Entrada\/Saída \+ Interjornada\n/);
    assert.match(AF.modelo.textoIrregularidadesTime([], ['britanica']), /^\*Irregularidades – Setembro 2026 – Marc\. Britânicas\n/);
    assert.match(AF.modelo.textoIrregularidadesTime([], [], ' silva '), /^\*Irregularidades – Setembro 2026 – Busca: "silva"\n/);
    assert.match(AF.modelo.textoIrregularidadesTime([], ['interj'], 'souza'), /^\*Irregularidades – Setembro 2026 – Interjornada – Busca: "souza"\n/);
    assert.match(AF.modelo.textoIrregularidadesTime([], []), /^\*Irregularidades – Setembro 2026\n/);
});

test('registrarAjuste acumula acoes e cod47Dias entre execucoes e descarta na Analise', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ANA']);
    AF.modelo.registrarAjuste('ANA', {
        movidas: 1,
        cod47Conv: 1,
        cod47Rest: 0,
        acoes: [{ ausencia: '13/09/2026', origem: '07/09/2026', resultado: 'movida' }],
        cod47Dias: ['07/09/2026']
    });

    let dados = AF.modelo.obterDadosFunc('ANA');
    assert.equal(dados.temAjuste, true);

    // Segundo ajuste: acumula acoes e cod47Dias sem duplicar
    AF.modelo.registrarAjuste('ANA', {
        movidas: 0,
        cod47Conv: 1,
        cod47Rest: 0,
        acoes: [{ ausencia: '04/09/2026', origem: '02/09/2026', resultado: 'sem-alteracao' }],
        cod47Dias: ['07/09/2026', '25/09/2026']
    });

    const textoAjuste2 = AF.modelo.textoDetalheAjuste('ANA');
    assert.match(textoAjuste2, /13\/09\/2026 <- origem 07\/09\/2026 => alterado/);
    assert.match(textoAjuste2, /04\/09\/2026 <- origem 02\/09\/2026 => sem alteração/);
    assert.match(textoAjuste2, /Dias: 07\/09\/2026, 25\/09\/2026/);

    // Nova analise descarta dados do ajuste
    AF.modelo.registrarAnalise('ANA', { folgas: 3 });
    dados = AF.modelo.obterDadosFunc('ANA');
    assert.equal(dados.temAjuste, false);
    assert.equal(AF.modelo.textoDetalheAjuste('ANA'), 'ANA\n|_Nenhum ajuste registrado');
});

test('registrarAjusteParcial mantem acoes e parcial flag sem registrar cod47 nao confirmados', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['BIA']);
    AF.modelo.registrarAjusteParcial('BIA', {
        movidas: 1,
        acoes: [{ ausencia: '15/09/2026', origem: '08/09/2026', resultado: 'alterado' }],
        cod47Dias: [] // parcial nao confirma cod47
    });

    const dados = AF.modelo.obterDadosFunc('BIA');
    assert.equal(dados.parcial, true);
    assert.equal(dados.temAjuste, true);

    const texto = AF.modelo.textoDetalheAjuste('BIA');
    assert.match(texto, /^BIA\n\|_Ajuste parcial \(interrompido\)\n\|_Folgas movimentadas\n  \|_ 15\/09\/2026 <- origem 08\/09\/2026 => alterado$/);
});

test('textoDetalheAjuste formata cenarios da spec com precisao e ordena datas sem duplicar', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['MARIA 2 SILVA 4812']);
    AF.modelo.registrarAjuste('MARIA 2 SILVA 4812', {
        movidas: 1,
        presas: [{ dataFolga: '02/09/2026' }],
        cod47Conv: 2,
        cod47Rest: 0,
        acoes: [
            { ausencia: '13/09/2026', origem: '07/09/2026', resultado: 'alterado' },
            { ausencia: '04/09/2026', origem: '02/09/2026', resultado: 'sem alteração' }
        ],
        cod47Dias: ['25/09/2026', '07/09/2026'] // ordem nao cronologica para testar ordenacao
    });

    const esperadoCenario1 = [
        'MARIA 2 SILVA',
        '|_Folgas movimentadas',
        '  |_ 13/09/2026 <- origem 07/09/2026 => alterado',
        '  |_ 04/09/2026 <- origem 02/09/2026 => sem alteração',
        '|_Folgas Presas',
        '  |_Dias: 02/09/2026',
        '|_Códigos 47',
        '  |_ Dias: 07/09/2026, 25/09/2026'
    ].join('\n');

    assert.equal(AF.modelo.textoDetalheAjuste('MARIA 2 SILVA 4812'), esperadoCenario1);

    // Seção sem conteudo e omitida (ex: so cod47 com restantes)
    AF.modelo.registrarAnalise('MARIA 2 SILVA 4812', { folgas: 0 });
    AF.modelo.registrarAjuste('MARIA 2 SILVA 4812', {
        movidas: 0,
        presas: [],
        cod47Conv: 2,
        cod47Rest: 1,
        acoes: [],
        cod47Dias: ['05/09/2026', '12/09/2026']
    });

    const esperadoCenarioRestantes = [
        'MARIA 2 SILVA',
        '|_Códigos 47',
        '  |_ Dias: 05/09/2026, 12/09/2026',
        '  |_ Restantes: 1'
    ].join('\n');
    assert.equal(AF.modelo.textoDetalheAjuste('MARIA 2 SILVA 4812'), esperadoCenarioRestantes);

    // Ajuste sem nada a registrar
    AF.modelo.registrarAnalise('MARIA 2 SILVA 4812', { folgas: 0 });
    AF.modelo.registrarAjuste('MARIA 2 SILVA 4812', {
        movidas: 0,
        presas: [],
        cod47Conv: 0,
        cod47Rest: 0,
        acoes: [],
        cod47Dias: []
    });
    assert.equal(AF.modelo.textoDetalheAjuste('MARIA 2 SILVA 4812'), 'MARIA 2 SILVA\n|_Nenhum ajuste registrado');
});

test('restauracao de registro antigo sem campos de detalhe funciona normalmente', () => {
    const storage = createStorage();
    const legado = {
        v: 1, versao: 1, mes: 'Outubro 2026',
        execs: { analise: null, ajuste: null },
        atual: null, ordem: ['LEGADO'],
        funcs: {
            LEGADO: {
                vazia: false,
                analise: null,
                ajuste: { ts: Date.now(), movidas: 1, presas: [], cod47Conv: 0, cod47Rest: 0, parcial: false },
                leitura: null
            }
        }
    };
    storage.setItem('fpw.relatorio.v1', JSON.stringify(legado));
    const { AF } = loadModelo(storage);

    const dados = AF.modelo.obterDadosFunc('LEGADO');
    assert.equal(dados.temAjuste, true);
    assert.equal(AF.modelo.textoDetalheAjuste('LEGADO'), 'LEGADO\n|_Nenhum ajuste registrado');
});

test('iniciarExecucao aceita opcoes.total sem alterar comportamento padrao', () => {
    const { AF } = loadModelo();
    // Sem opcoes: total e a quantidade de nomes
    AF.modelo.iniciarExecucao('ajuste', ['ANA', 'BIA', 'CAIO']);
    assert.equal(AF.modelo.obterEstado().execs.ajuste.total, 3);
    assert.equal(AF.modelo.obterEstado().ordem.length, 3);

    // Com opcoes.total: total segue o valor customizado (ex: 1 folha supervisionada)
    AF.modelo.iniciarExecucao('ajuste', ['ANA', 'BIA', 'CAIO'], null, { total: 1 });
    assert.equal(AF.modelo.obterEstado().execs.ajuste.total, 1);
    assert.equal(AF.modelo.obterEstado().ordem.length, 3);
});

test('textoDetalheAjuste consolida acoes com mesmo destino e origem para resultado mais conclusivo', () => {
    const { AF } = loadModelo();
    AF.modelo.iniciarExecucao('ajuste', ['ADOVALDO']);
    AF.modelo.registrarAjuste('ADOVALDO', {
        movidas: 0,
        presas: [{ dataFolga: '13/09/2026' }],
        acoes: [
            { ausencia: '13/09/2026', origem: '07/09/2026', resultado: 'falha' },
            { ausencia: '13/09/2026', origem: '07/09/2026', resultado: 'sem alteração' }
        ]
    });

    const texto = AF.modelo.textoDetalheAjuste('ADOVALDO');
    const linhas = texto.split('\n');
    const acoesLinhas = linhas.filter(l => l.includes('13/09/2026 <- origem 07/09/2026'));
    assert.equal(acoesLinhas.length, 1);
    assert.match(acoesLinhas[0], /=> sem alteração$/);
});
