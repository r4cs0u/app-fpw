(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.log = AF.log || {};

    var CHAVE = 'fpw.log.v1';
    var LIMITE_CHARS = 1200000;
    var MAX_EVENTOS_MEMORIA = 20000;
    var MAX_EXECUCOES = 60;
    var MAX_CHARS_DADOS = 8000;

    var estado = { seq: 0, execSeq: 0, execs: [], eventos: [], truncados: 0 };
    var ctx = { exec: null, func: '', fase: '' };
    var timerSalvar = null;
    var salvando = false;
    var avisouFalhaPersistencia = false;
    var janelaLog = null;
    var ultimoTextoJanela = null;
    var intervaloJanela = null;

    AF.log.relogio = function () { return Date.now(); };

    function armazenamento() {
        try {
            if (window.top && window.top.sessionStorage) return window.top.sessionStorage;
        } catch (e) {}
        try {
            return window.sessionStorage || null;
        } catch (e2) {
            return null;
        }
    }

    // ── Higiene: nunca registrar credenciais nem URLs com parâmetros ──

    function sanitizar(texto) {
        var s = String(texto == null ? '' : texto);
        s = s.replace(/https?:\/\/[^\s"'<>)]+/gi, function (url) {
            return url.split(/[?#]/)[0] + (/[?#]/.test(url) ? '[parametros omitidos]' : '');
        });
        s = s.replace(/\b(authorization)\s*[=:]\s*(?:(?:bearer|basic)\s+)?[^\s;,&]+/gi, '$1=[omitido]');
        s = s.replace(/\b(bearer|basic)\s+[A-Za-z0-9._~+\/=-]{6,}/gi, '$1 [omitido]');
        s = s.replace(/\b(cookie|set-cookie|token|access_token|senha|password|passwd|sessionid|jsessionid|aspsessionid\w*)\s*[=:]\s*[^\s;,&]+/gi, '$1=[omitido]');
        return s;
    }

    function sanitizarDados(dados) {
        if (dados === undefined || dados === null) return null;
        try {
            var json = JSON.stringify(dados, function (chave, valor) {
                return typeof valor === 'string' ? sanitizar(valor) : valor;
            });
            if (json.length > MAX_CHARS_DADOS) {
                return { truncado: true, resumo: json.slice(0, MAX_CHARS_DADOS) };
            }
            return JSON.parse(json);
        } catch (e) {
            return { erro: 'dados nao serializaveis' };
        }
    }

    function nivelDaCor(cor) {
        var c = String(cor || '').toLowerCase();
        if (c === '#f87171') return 'erro';
        if (c === '#ffb000' || c === '#f97316') return 'aviso';
        return 'info';
    }

    // ── Persistência em sessionStorage ─────────────────────────────────

    function serializar(eventos) {
        return JSON.stringify({
            v: 1,
            seq: estado.seq,
            execSeq: estado.execSeq,
            execs: estado.execs,
            eventos: eventos || estado.eventos,
            truncados: estado.truncados
        });
    }

    function descartarAntigos(fracao) {
        var n = Math.max(1, Math.floor(estado.eventos.length * fracao));
        estado.eventos.splice(0, n);
        estado.truncados += n;
        return n;
    }

    AF.log.salvar = function () {
        if (salvando) return false;
        salvando = true;
        var aviso = null;
        try {
            var st = armazenamento();
            if (!st) return false;

            // Limite de armazenamento: descarte deliberado dos eventos mais antigos.
            var texto = serializar();
            var descartados = 0;
            if (texto.length > LIMITE_CHARS) {
                while (texto.length > LIMITE_CHARS * 0.8 && estado.eventos.length > 50) {
                    descartados += descartarAntigos(0.1);
                    texto = serializar();
                }
            }

            // Falha do armazenamento: persiste uma cópia reduzida sem apagar o log em memória.
            var copia = estado.eventos;
            var tentativas = 0;
            var gravado = false;
            while (!gravado) {
                try {
                    st.setItem(CHAVE, texto);
                    gravado = true;
                } catch (erroGravacao) {
                    tentativas++;
                    if (tentativas > 3 || copia.length <= 50) {
                        if (!avisouFalhaPersistencia) {
                            avisouFalhaPersistencia = true;
                            aviso = 'Falha ao persistir o log na sessao: ' +
                                sanitizar(erroGravacao && erroGravacao.message ? erroGravacao.message : erroGravacao);
                        }
                        return false;
                    }
                    copia = copia.slice(Math.max(1, Math.floor(copia.length * 0.3)));
                    texto = serializar(copia);
                }
            }

            if (descartados > 0) {
                aviso = 'Log truncado: ' + descartados + ' evento(s) mais antigos descartados por limite de armazenamento.';
            }
            return true;
        } finally {
            salvando = false;
            if (aviso) AF.log.registrar(aviso, '#ffb000', { tipo: 'aviso' });
        }
    };
    function agendarSalvar() {
        if (typeof setTimeout === 'function') {
            if (timerSalvar) return;
            timerSalvar = setTimeout(function () {
                timerSalvar = null;
                AF.log.salvar();
            }, 400);
        } else {
            AF.log.salvar();
        }
    }

    // ── Registro ───────────────────────────────────────────────────────

    AF.log.registrar = function (msg, cor, opcoes) {
        opcoes = opcoes || {};
        var evento = {
            id: ++estado.seq,
            t: AF.log.relogio(),
            exec: opcoes.exec !== undefined ? opcoes.exec : ctx.exec,
            tipo: opcoes.tipo || 'msg',
            func: opcoes.func !== undefined ? opcoes.func : ctx.func,
            fase: opcoes.fase !== undefined ? opcoes.fase : ctx.fase,
            nivel: nivelDaCor(cor),
            msg: sanitizar(msg),
            cor: cor || '#f9fafb',
            dados: opcoes.dados === undefined ? null : sanitizarDados(opcoes.dados)
        };
        estado.eventos.push(evento);
        if (estado.eventos.length > MAX_EVENTOS_MEMORIA) descartarAntigos(0.1);
        agendarSalvar();
        return evento;
    };

    AF.log.evento = function (tipo, dados, msg, cor) {
        return AF.log.registrar(msg || tipo, cor, { tipo: tipo, dados: dados });
    };

    AF.log.definirFuncionario = function (nome) {
        ctx.func = String(nome == null ? '' : nome).trim();
        ctx.fase = '';
    };

    AF.log.definirFase = function (fase) {
        ctx.fase = String(fase == null ? '' : fase);
    };

    AF.log.contexto = function () {
        return { exec: ctx.exec, func: ctx.func, fase: ctx.fase };
    };

    // ── Execuções ──────────────────────────────────────────────────────

    function execucaoPorId(id) {
        for (var i = estado.execs.length - 1; i >= 0; i--) {
            if (estado.execs[i].id === id) return estado.execs[i];
        }
        return null;
    }

    AF.log.iniciarExecucao = function (tipo) {
        if (ctx.exec !== null && execucaoPorId(ctx.exec)) {
            AF.log.encerrarExecucao('interrompida', 'nova execucao iniciada sem encerrar a anterior');
        }
        var exec = {
            id: ++estado.execSeq,
            tipo: tipo,
            inicio: AF.log.relogio(),
            fim: null,
            status: 'em-andamento'
        };
        estado.execs.push(exec);
        if (estado.execs.length > MAX_EXECUCOES) estado.execs.shift();
        ctx.exec = exec.id;
        ctx.func = '';
        ctx.fase = '';
        AF.log.registrar('Execucao #' + exec.id + ' iniciada (' + tipo + ').', '#c084fc', { tipo: 'execucao-inicio' });
        AF.log.salvar();
        return exec.id;
    };

    AF.log.encerrarExecucao = function (status, detalhe) {
        var exec = execucaoPorId(ctx.exec);
        if (!exec) return null;
        exec.fim = AF.log.relogio();
        exec.status = status || 'concluida';
        ctx.func = '';
        ctx.fase = '';
        AF.log.registrar(
            'Execucao #' + exec.id + ' encerrada: ' + exec.status + (detalhe ? ' (' + detalhe + ')' : '') + '.',
            exec.status === 'concluida' ? '#02ab19' : '#f97316',
            { tipo: 'execucao-fim', exec: exec.id, func: '' }
        );
        ctx.exec = null;
        AF.log.salvar();
        return exec;
    };

    AF.log.execucaoAtual = function () {
        return execucaoPorId(ctx.exec);
    };

    AF.log.execucoes = function () {
        return estado.execs.slice();
    };

    // ── Consulta ───────────────────────────────────────────────────────

    AF.log.eventos = function (filtro) {
        filtro = filtro || {};
        return estado.eventos.filter(function (e) {
            if (filtro.exec !== undefined && filtro.exec !== null && e.exec !== filtro.exec) return false;
            if (filtro.func !== undefined && filtro.func !== null && e.func !== filtro.func) return false;
            return true;
        });
    };

    AF.log.eventosDaExecucao = function (execId) {
        return AF.log.eventos({ exec: execId === undefined ? ctx.exec : execId });
    };

    AF.log.porFuncionario = function (execId) {
        var grupos = [];
        var indice = {};
        var eventos = execId === undefined || execId === null ? estado.eventos : AF.log.eventos({ exec: execId });
        for (var i = 0; i < eventos.length; i++) {
            var e = eventos[i];
            if (!e.func) continue;
            if (!indice.hasOwnProperty(e.func)) {
                indice[e.func] = grupos.length;
                grupos.push({ nome: e.func, linhas: [] });
            }
            grupos[indice[e.func]].linhas.push({ msg: e.msg, cor: e.cor, t: e.t, tipo: e.tipo, fase: e.fase, dados: e.dados });
        }
        return grupos;
    };

    // ── Texto puro ─────────────────────────────────────────────────────

    function dois(n) { return String(n).padStart(2, '0'); }

    function formatarHorario(t) {
        var d = new Date(t);
        return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate()) + ' ' +
            dois(d.getHours()) + ':' + dois(d.getMinutes()) + ':' + dois(d.getSeconds());
    }

    function resumirItem(x) {
        if (x === null || typeof x !== 'object') return String(x);
        return Object.keys(x).map(function (k) {
            var v = x[k];
            return k + '=' + (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
        }).join(', ');
    }

    function renderizarDados(valor, indentacao, saida, chave) {
        var pad = new Array(indentacao + 1).join(' ');
        if (Array.isArray(valor)) {
            var simples = valor.every(function (x) { return x === null || typeof x !== 'object'; });
            if (simples) {
                saida.push(pad + chave + ': ' + (valor.length ? valor.join(', ') : '-'));
            } else {
                saida.push(pad + chave + ':');
                valor.forEach(function (x) { saida.push(pad + '  - ' + resumirItem(x)); });
            }
        } else if (valor !== null && typeof valor === 'object') {
            saida.push(pad + chave + ':');
            Object.keys(valor).forEach(function (k) { renderizarDados(valor[k], indentacao + 2, saida, k); });
        } else {
            saida.push(pad + chave + ': ' + (valor === null || valor === undefined || valor === '' ? '-' : valor));
        }
    }

    AF.log.textoDoEvento = function (e) {
        var exec = e.exec ? execucaoPorId(e.exec) : null;
        var tag = exec ? '[' + String(exec.tipo).toUpperCase() + '#' + exec.id + ']' : '[-]';
        var partes = [];
        if (e.func) partes.push(e.func);
        if (e.fase) partes.push(e.fase);
        partes.push(e.msg);
        var linha = '[' + formatarHorario(e.t) + '] ' + tag + ' ' + partes.join(' | ');
        if (e.dados && typeof e.dados === 'object') {
            var linhas = [];
            Object.keys(e.dados).forEach(function (k) { renderizarDados(e.dados[k], 4, linhas, k); });
            if (linhas.length) linha += '\n' + linhas.join('\n');
        }
        return linha;
    };

    AF.log.texto = function (filtro) {
        var eventos = AF.log.eventos(filtro);
        var linhas = [];
        if (estado.truncados > 0) {
            linhas.push('[log truncado: ' + estado.truncados + ' evento(s) mais antigos foram descartados]');
        }
        for (var i = 0; i < eventos.length; i++) linhas.push(AF.log.textoDoEvento(eventos[i]));
        return linhas.join('\n');
    };

    // ── Restauração ao carregar o módulo ───────────────────────────────

    AF.log.restaurar = function () {
        try {
            var st = armazenamento();
            var bruto = st ? st.getItem(CHAVE) : null;
            if (!bruto) return false;
            var salvo = JSON.parse(bruto);
            if (!salvo || salvo.v !== 1 || !Array.isArray(salvo.eventos)) return false;

            estado.seq = salvo.seq || 0;
            estado.execSeq = salvo.execSeq || 0;
            estado.execs = Array.isArray(salvo.execs) ? salvo.execs : [];
            estado.eventos = salvo.eventos;
            estado.truncados = salvo.truncados || 0;
            ctx.exec = null;

            estado.execs.forEach(function (exec) {
                if (exec.status === 'em-andamento') {
                    exec.status = 'interrompida';
                    exec.fim = AF.log.relogio();
                    AF.log.registrar(
                        'Execucao #' + exec.id + ' interrompida: a pagina foi recarregada durante a execucao.',
                        '#f97316',
                        { tipo: 'execucao-fim', exec: exec.id, func: '' }
                    );
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    };

    // ── Janela de consulta e cópia ─────────────────────────────────────

    function htmlJanela() {
        return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>FPW - Log</title>'
            + '<style>'
            + 'html,body{height:100%;margin:0;background:#0f1117;color:#e2e8f0;font-family:Consolas,"Courier New",monospace;font-size:12px}'
            + '.bar{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.12)}'
            + '.bar b{font-family:system-ui,sans-serif;font-size:13px;margin-right:auto}'
            + 'button{background:#3b82f6;color:#fff;border:0;border-radius:5px;padding:5px 12px;font-size:12px;cursor:pointer}'
            + 'button.ok{background:#22c55e}'
            + '#fpw-log-box{position:absolute;top:44px;bottom:0;left:0;right:0;overflow:auto;padding:10px 14px}'
            + 'pre{margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.5}'
            + '</style></head><body>'
            + '<div class="bar"><b>Log de atividades</b>'
            + '<button id="fpw-log-atualizar">Atualizar</button>'
            + '<button id="fpw-log-copiar">Copiar tudo</button></div>'
            + '<div id="fpw-log-box"><pre id="fpw-log-texto"></pre></div>'
            + '</body></html>';
    }

    function copiarTexto(win, texto) {
        function fallback() {
            try {
                var area = win.document.createElement('textarea');
                area.value = texto;
                win.document.body.appendChild(area);
                area.select();
                var ok = win.document.execCommand('copy');
                win.document.body.removeChild(area);
                return ok;
            } catch (e) {
                return false;
            }
        }
        try {
            if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
                return win.navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return fallback(); });
            }
        } catch (e) {}
        return Promise.resolve(fallback());
    }

    function atualizarJanela(win, forcar) {
        try {
            var el = win.document.getElementById('fpw-log-texto');
            var box = win.document.getElementById('fpw-log-box');
            if (!el) return;
            var texto = AF.log.texto();
            if (!forcar && texto === ultimoTextoJanela) return;
            ultimoTextoJanela = texto;
            var noFim = !box || (box.scrollHeight - box.scrollTop - box.clientHeight < 40);
            el.textContent = texto || 'Nenhum evento registrado.';
            if (box && noFim) box.scrollTop = box.scrollHeight;
        } catch (e) {}
    }

    AF.log.abrirJanela = function () {
        if (janelaLog && !janelaLog.closed) {
            try { janelaLog.focus(); } catch (e) {}
            atualizarJanela(janelaLog, true);
            return janelaLog;
        }

        var win = window.open('', 'fpw-log', 'width=900,height=680,left=100,top=80,resizable=yes,scrollbars=yes');
        if (!win) {
            AF.log.registrar('Popup do log bloqueado pelo navegador.', '#f87171');
            return null;
        }
        janelaLog = win;
        ultimoTextoJanela = null;

        win.document.open();
        win.document.write(htmlJanela());
        win.document.close();

        var btnCopiar = win.document.getElementById('fpw-log-copiar');
        var btnAtualizar = win.document.getElementById('fpw-log-atualizar');
        if (btnAtualizar) btnAtualizar.onclick = function () { atualizarJanela(win, true); };
        if (btnCopiar) {
            btnCopiar.onclick = function () {
                copiarTexto(win, AF.log.texto()).then(function (ok) {
                    btnCopiar.textContent = ok ? 'Copiado!' : 'Falha ao copiar';
                    if (ok && btnCopiar.classList) btnCopiar.classList.add('ok');
                    if (typeof setTimeout === 'function') {
                        setTimeout(function () {
                            btnCopiar.textContent = 'Copiar tudo';
                            if (btnCopiar.classList) btnCopiar.classList.remove('ok');
                        }, 2000);
                    }
                });
            };
        }

        atualizarJanela(win, true);

        if (typeof setInterval === 'function') {
            if (intervaloJanela) clearInterval(intervaloJanela);
            intervaloJanela = setInterval(function () {
                if (!janelaLog || janelaLog.closed) {
                    clearInterval(intervaloJanela);
                    intervaloJanela = null;
                    return;
                }
                atualizarJanela(janelaLog, false);
            }, 1000);
        }
        return win;
    };

    AF.log.restaurar();
    try {
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', function () { AF.log.salvar(); });
        }
    } catch (e) {}

    console.log('[FPW] 05-log carregado. v1.0 - log estruturado, acumulado e persistente na sessao');
})();
