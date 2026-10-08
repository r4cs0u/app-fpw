'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadSons() {
    const agendadas = [];
    const osciladores = [];
    class FakeAudioContext {
        constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
        resume() {}
        createOscillator() {
            const osc = { type: 'sine', frequency: { value: 0 }, connect() {}, start() {}, stop() {} };
            osciladores.push(osc);
            return osc;
        }
        createGain() {
            return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
    }
    const window = { AudioContext: FakeAudioContext };
    const context = {
        window,
        console: { log() {} },
        setTimeout(fn, ms) { agendadas.push(ms); fn(); return agendadas.length; }
    };
    window.AutomacaoFolha = {};
    vm.runInNewContext(readFileSync(join(__dirname, '..', '70-sons.js'), 'utf8'), context);
    return { AF: window.AutomacaoFolha, agendadas, osciladores };
}

test('copy sound no longer exists and schedules nothing', () => {
    const { AF, agendadas, osciladores } = loadSons();
    AF.sons.tocar('copia');
    assert.equal(agendadas.length, 0);
    assert.equal(osciladores.length, 0);
});

test('completion sound starts immediately without a fixed delay', () => {
    const { AF, agendadas, osciladores } = loadSons();
    AF.sons.tocar('fim');
    assert.equal(agendadas[0], 0);
    assert.equal(osciladores.length, 3);
});

test('failure sound plays two low square notes distinct from the stop sound', () => {
    const falha = loadSons();
    falha.AF.sons.tocar('falha');
    assert.equal(falha.osciladores.length, 2);
    assert.deepEqual(falha.osciladores.map(o => o.type), ['square', 'square']);
    assert.deepEqual(falha.osciladores.map(o => o.frequency.value), [330, 220]);

    const parada = loadSons();
    parada.AF.sons.tocar('parada');
    assert.deepEqual(parada.osciladores.map(o => o.type), ['sine', 'sine']);
    assert.notDeepEqual(
        parada.osciladores.map(o => o.frequency.value),
        falha.osciladores.map(o => o.frequency.value)
    );
});

test('attention sound plays two soft notes on confirmation open', () => {
    const { AF, osciladores } = loadSons();
    AF.sons.tocar('atencao');
    assert.equal(osciladores.length, 2);
    assert.deepEqual(osciladores.map(o => o.type), ['sine', 'sine']);
    assert.deepEqual(osciladores.map(o => o.frequency.value), [587, 740]);
});

test('unknown sound names are ignored', () => {
    const { AF, osciladores } = loadSons();
    AF.sons.tocar('inexistente');
    assert.equal(osciladores.length, 0);
});
