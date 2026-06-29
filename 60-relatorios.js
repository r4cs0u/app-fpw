(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.relatorios = AF.relatorios || {};

    // ── Utilitário: formatar minutos em HH:MM ──────────────────────

    function fmtMin(t) {
        return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    }

    // ── Normalizar hora: garante formato HH:MM ─────────────────────

    function normHora(v) {
        var s = String(v || '00:00').trim();
        var neg = s.charAt(0) === '-';
        var base = neg ? s.slice(1) : s;
        var partes = base.split(':');
        var h   = (partes[0] || '00').padStart(2, '0');
        var min = (partes[1] || '00').padStart(2, '0');
        return (neg ? '-' : '') + h + ':' + min;
    }

    // ── Escapar para Excel: prefixo ' em valores negativos ───────────

    function xls(v) {
        var s = String(v);
        return s.charAt(0) === '-' ? "'" + s : s;
    }

    // ── Abreviar nome ─────────────────────────────────────────────

    function abrevNome(nome) {
        var clean = nome.replace(/\s+\d+$/, '');
        var parts = clean.split(' ');
        if (parts.length <= 2) return parts.join(' ');
        var skip = ['DE', 'DA', 'DO