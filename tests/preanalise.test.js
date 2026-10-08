'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

function date(day, month = 9, year = 2026) {
    return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year;
}

function loadPreanalise() {
    const window = {
        AutomacaoFolha: {
            utils: {},
            core: {},
            mapa: {},
            estado: {},
            fases: {},
            analisar: {},
            regras: {},
            preanalise: {}
        }
    };
    const context = { window, console: { log() {} } };
    vm.runInNewContext(readFileSync(join(root, '10-utils.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(root, '37-regras-folha.js'), 'utf8'), context);
    vm.runInNewContext(readFileSync(join(root, '38-preanalise.js'), 'utf8'), context);
    return window.AutomacaoFolha;
}

test('intervalo calculates target month plus transition week through Sunday', () => {
    const AF = loadPreanalise();

    // Setembro 2026: 30/09 é quarta-feira -> semana termina domingo 04/10/2026 (34 dias)
    const set26 = AF.preanalise.intervalo(new Date(2026, 8, 1));
    assert.equal(set26.inicioStr, '01/09/2026');
    assert.equal(set26.fimStr, '04/10/2026');
    assert.equal(set26.totalDias, 34);
    assert.equal(set26.texto, '01/09/2026 até 04/10/2026 (34 dias)');

    // Mês terminando em domingo (ex: Maio 2026 termina em 31/05/2026 que é domingo)
    const mai26 = AF.preanalise.intervalo(new Date(2026, 4, 1));
    assert.equal(mai26.fimStr, '31/05/2026');
    assert.equal(mai26.totalDias, 31);
    assert.equal(mai26.texto, '01/05/2026 até 31/05/2026 (31 dias)');

    // Mês terminando em segunda-feira (ex: Agosto 2026 termina em 31/08/2026 que é segunda) -> vai até domingo 06/09/2026 (37 dias)
    const ago26 = AF.preanalise.intervalo(new Date(2026, 7, 1));
    assert.equal(ago26.fimStr, '06/09/2026');
    assert.equal(ago26.totalDias, 37);
});

test('montar e texto geram resumo com campos esperados e formatam datas unicas ordenadas', () => {
    const AF = loadPreanalise();
    const alvo = new Date(2026, 8, 1);

    const leitura = {
        nome: 'MARIA 2 SILVA 4812',
        vazia: false,
        folgasDias: [date(25), date(2), date(7), date(2)], // repetido e desordenado
        cod47Dias: [date(2, 10), date(7)],
        semES: 2,
        interj: 1,
        britanica: 3,
        naoPreenchida: { flag: true, pctNaoPreenchida: 73 },
        HE: '07:19',
        HEF: '00:00',
        HEC: '-08:13'
    };

    const resumo = AF.preanalise.montar(leitura, alvo);

    assert.equal(resumo.nome, 'MARIA 2 SILVA');
    assert.equal(resumo.folgas.total, 3);
    assert.deepEqual(plain(resumo.folgas.dias), [date(2), date(7), date(25)]);
    assert.equal(resumo.cod47.total, 2);
    assert.deepEqual(plain(resumo.cod47.dias), [date(7), date(2, 10)]);
    assert.equal(resumo.irregularidades.semES, 2);
    assert.equal(resumo.irregularidades.interj, 1);
    assert.equal(resumo.irregularidades.britanica, 3);
    assert.equal(resumo.irregularidades.naoPreenchida.pct, 73);

    const texto = AF.preanalise.texto(resumo);
    const esperado = [
        'Nome: MARIA 2 SILVA',
        'Range da análise: 01/09/2026 até 04/10/2026 (34 dias)',
        '',
        'Ajustes previstos na folha atual',
        'Folgas a movimentar: 3 (dias: 02/09/2026, 07/09/2026, 25/09/2026)',
        'Códigos 47 a ajustar: 2 (dias: 07/09/2026, 02/10/2026)',
        '',
        'Resumo das irregularidades',
        '- Sem E/S - 2',
        '- Interj. - 1',
        '- Britânicas - 3',
        '- % Não preenchida - 73%',
        '',
        'Resumo de horas',
        '- 100% (Acima das 10h): 07:19',
        '- 100% (Feriado): 00:00',
        '- 70% (Compensável): -08:13',
        '',
        '*Após os ajustes, todos os valores acima podem mudar.'
    ].join('\n');

    assert.equal(texto, esperado);
});

test('montar e texto para folha sem marcacoes informam que nao ha o que ajustar', () => {
    const AF = loadPreanalise();
    const resumo = AF.preanalise.montar({ nome: 'JOAO PEREIRA 99', vazia: true }, new Date(2026, 8, 1));

    assert.equal(resumo.vazia, true);
    assert.equal(resumo.nome, 'JOAO PEREIRA');

    const texto = AF.preanalise.texto(resumo);
    assert.equal(texto, 'Nome: JOAO PEREIRA\nFolha sem marcações indicadas. Não há ajustes previstos.');
});

test('texto quando nao preenchida nao esta sinalizada exibe "não sinalizada"', () => {
    const AF = loadPreanalise();
    const leitura = {
        nome: 'ANA SILVA',
        vazia: false,
        folgasDias: [],
        cod47Dias: [],
        semES: 0,
        interj: 0,
        britanica: 0,
        naoPreenchida: null,
        HE: '00:00',
        HEF: '00:00',
        HEC: '00:00'
    };
    const texto = AF.preanalise.texto(AF.preanalise.montar(leitura, new Date(2026, 8, 1)));
    assert.match(texto, /- % Não preenchida - não sinalizada/);
    assert.match(texto, /Folgas a movimentar: 0/);
    assert.match(texto, /Códigos 47 a ajustar: 0/);
});

test('lerFolhaAtual e somente leitura e produz resumo equivalente a analise', () => {
    const AF = loadPreanalise();

    let eventosDisparados = 0;
    AF.core.nomeAtual = () => 'CARLOS SILVA 101';
    AF.core.paginaVaziaAgora = () => false;
    AF.utils.mesAlvoDaTabela = () => new Date(2026, 8, 1);
    AF.mapa.mapearFolhaAtual = () => ({
        semanas: {
            s1: {
                folgas: [{ dataStr: date(2) }],
                ausencias: [{ dataStr: date(1) }],
                feriados: []
            }
        }
    });
    AF.analisar.analisarFolhaAtual = () => ({
        vazia: false,
        folgas: 1,
        cod47: 1,
        cod47Dias: [date(7)],
        irregs: 2,
        interj: 1,
        britanica: 0,
        naoPreenchida: { flag: false },
        HE: '02:00',
        HEF: '00:00',
        HEC: '01:00'
    });

    const res = AF.preanalise.lerFolhaAtual();

    assert.equal(eventosDisparados, 0);
    assert.equal(res.nome, 'CARLOS SILVA');
    assert.equal(res.folgas.total, 1);
    assert.deepEqual(plain(res.folgas.dias), [date(2)]);
    assert.equal(res.cod47.total, 1);
    assert.deepEqual(plain(res.cod47.dias), [date(7)]);
    assert.equal(res.irregularidades.semES, 2);
    assert.equal(res.irregularidades.interj, 1);
    assert.equal(res.horas.HE, '02:00');
    assert.equal(res.horas.HEC, '01:00');
});
