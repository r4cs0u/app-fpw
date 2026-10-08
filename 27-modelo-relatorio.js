(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.modelo = AF.modelo || {};

    var CHAVE_STORAGE = 'fpw.relatorio.v1';

    var estado = {
        v: 1,
        versao: 0,
        mes: '',
        execs: {
            analise: null,
            ajuste: null
        },
        atual: null,
        ordem: [],
        funcs: {}
    };

    var timerSalvar = null;
    var avisouFalhaPersistencia = false;

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

    function incVersao() {
        estado.versao = (estado.versao || 0) + 1;
        agendarSalvar();
    }

    // ── Persistência em sessionStorage ─────────────────────────────────

    AF.modelo.salvar = function () {
        try {
            var st = armazenamento();
            if (!st) return false;
            st.setItem(CHAVE_STORAGE, JSON.stringify(estado));
            return true;
        } catch (e) {
            if (!avisouFalhaPersistencia) {
                avisouFalhaPersistencia = true;
                if (AF.log && typeof AF.log.registrar === 'function') {
                    AF.log.registrar('Falha ao persistir modelo de relatorio: ' + (e && e.message ? e.message : e), '#ffb000', { tipo: 'aviso' });
                }
            }
            return false;
        }
    };

    function agendarSalvar() {
        if (typeof setTimeout === 'function') {
            if (timerSalvar) return;
            timerSalvar = setTimeout(function () {
                timerSalvar = null;
                AF.modelo.salvar();
            }, 400);
        } else {
            AF.modelo.salvar();
        }
    }

    AF.modelo.restaurar = function () {
        try {
            var st = armazenamento();
            var bruto = st ? st.getItem(CHAVE_STORAGE) : null;
            if (!bruto) return false;
            var salvo = JSON.parse(bruto);
            if (!salvo || salvo.v !== 1 || !salvo.funcs) return false;

            estado.v = salvo.v || 1;
            estado.versao = salvo.versao || 0;
            estado.mes = salvo.mes || '';
            estado.execs = salvo.execs || { analise: null, ajuste: null };
            estado.atual = null;
            estado.ordem = Array.isArray(salvo.ordem) ? salvo.ordem : [];
            estado.funcs = salvo.funcs || {};

            ['analise', 'ajuste'].forEach(function (tipo) {
                if (estado.execs[tipo] && estado.execs[tipo].status === 'em-andamento') {
                    estado.execs[tipo].status = 'interrompida';
                    estado.execs[tipo].fim = Date.now();
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    };

    // Aceita a lista de dias (array de strings ou de {data}) ou o objeto {total, dias}.
    function normalizarOcorrencias(v) {
        if (v === null || v === undefined) return { total: 0, dias: [] };
        if (Array.isArray(v)) return { total: v.length, dias: v };
        return { total: v.total != null ? v.total : (v.dias ? v.dias.length : 0), dias: v.dias || [] };
    }

    // ── Inicialização de funcionário ────────────────────────────────────

    function obterOuCriarFunc(nome) {
        if (!estado.funcs[nome]) {
            estado.funcs[nome] = {
                vazia: false,
                analise: null,
                ajuste: null,
                leitura: null
            };
        }
        return estado.funcs[nome];
    }

    // ── Ciclo de Execução ───────────────────────────────────────────────

    AF.modelo.iniciarExecucao = function (tipo, nomes, mes, opcoes) {
        opcoes = opcoes || {};
        if (mes) estado.mes = mes;
        if (Array.isArray(nomes)) {
            nomes.forEach(function (n) {
                n = String(n || '').trim();
                if (!n) return;
                if (estado.ordem.indexOf(n) === -1) {
                    estado.ordem.push(n);
                }
                obterOuCriarFunc(n);
            });
        }
        var totalFinal = opcoes.total != null ? opcoes.total : ((nomes && nomes.length) || estado.ordem.length);
        estado.execs[tipo] = {
            status: 'em-andamento',
            inicio: Date.now(),
            fim: null,
            total: totalFinal,
            feitas: 0
        };
        estado.atual = null;
        incVersao();
        AF.modelo.salvar();
    };

    AF.modelo.definirAtual = function (nome) {
        estado.atual = nome ? String(nome).trim() : null;
        incVersao();
    };

    AF.modelo.encerrarExecucao = function (tipo, status) {
        if (estado.execs[tipo]) {
            estado.execs[tipo].status = status || 'concluida';
            estado.execs[tipo].fim = Date.now();
        }
        estado.atual = null;
        incVersao();
        AF.modelo.salvar();
    };

    // ── Registro de Dados ───────────────────────────────────────────────

    AF.modelo.registrarSemMarcacoes = function (nome, tipo) {
        nome = String(nome || '').trim();
        var f = obterOuCriarFunc(nome);
        f.vazia = true;
        if (tipo === 'analise') {
            f.analise = { ts: Date.now(), folgas: 0, cod47: 0, cod47Dias: [] };
            f.ajuste = null;
        } else if (tipo === 'ajuste') {
            f.ajuste = { ts: Date.now(), movidas: 0, presas: [], cod47Conv: 0, cod47Rest: 0, parcial: false };
        }
        f.leitura = {
            ts: Date.now(),
            origem: tipo,
            semES: { total: 0, dias: [] },
            interj: { total: 0, dias: [] },
            britanica: { total: 0, dias: [] },
            naoPreenchida: { avaliada: false, flag: false, pctNaoPreenchida: 0, criterios: [], visiveis: 0, preenchidos: 0 },
            HE: '00:00', HEF: '00:00', HEC: '00:00'
        };
        if (estado.execs[tipo]) estado.execs[tipo].feitas++;
        incVersao();
    };

    AF.modelo.registrarAnalise = function (nome, dados) {
        nome = String(nome || '').trim();
        var f = obterOuCriarFunc(nome);
        f.vazia = false;
        f.analise = {
            ts: Date.now(),
            folgas: dados.folgas || 0,
            cod47: dados.cod47 || 0,
            cod47Dias: dados.cod47Dias || []
        };
        f.ajuste = null; // Análise reseta o Ajuste do funcionário

        f.leitura = {
            ts: Date.now(),
            origem: 'analise',
            semES: { total: dados.irregs || 0, dias: (dados.dias && dados.dias.semES) || [] },
            interj: { total: dados.interj || 0, dias: (dados.dias && dados.dias.interj) || [] },
            britanica: { total: dados.britanica || 0, dias: (dados.dias && dados.dias.britanica) || [] },
            naoPreenchida: dados.naoPreenchida || { avaliada: false, flag: false, pctNaoPreenchida: 0, criterios: [], visiveis: 0, preenchidos: 0 },
            HE: dados.HE || '00:00',
            HEF: dados.HEF || '00:00',
            HEC: dados.HEC || '00:00'
        };
        if (estado.execs.analise) estado.execs.analise.feitas++;
        incVersao();
    };

    AF.modelo.registrarAjuste = function (nome, dados) {
        nome = String(nome || '').trim();
        var f = obterOuCriarFunc(nome);
        f.vazia = false;

        var movidasAnteriores = (f.ajuste && f.ajuste.movidas) || 0;
        var cod47ConvAnteriores = (f.ajuste && f.ajuste.cod47Conv) || 0;
        var acoesAnteriores = (f.ajuste && f.ajuste.acoes) || [];
        var cod47DiasAnteriores = (f.ajuste && f.ajuste.cod47Dias) || [];

        var novasAcoes = acoesAnteriores.concat(dados.acoes || []);
        var novosCod47Dias = cod47DiasAnteriores.slice();
        (dados.cod47Dias || []).forEach(function (d) {
            if (novosCod47Dias.indexOf(d) === -1) novosCod47Dias.push(d);
        });

        f.ajuste = {
            ts: Date.now(),
            movidas: movidasAnteriores + (dados.movidas || 0),
            presas: (dados.presas || []).slice(),
            cod47Conv: cod47ConvAnteriores + (dados.cod47Conv || 0),
            cod47Rest: dados.cod47Rest != null ? dados.cod47Rest : 0,
            acoes: novasAcoes,
            cod47Dias: novosCod47Dias,
            parcial: false
        };

        if (dados.leitura) {
            f.leitura = {
                ts: Date.now(),
                origem: 'ajuste',
                semES: normalizarOcorrencias(dados.leitura.semES),
                interj: normalizarOcorrencias(dados.leitura.interj),
                britanica: normalizarOcorrencias(dados.leitura.britanica),
                naoPreenchida: dados.leitura.naoPreenchida || { avaliada: false, flag: false, pctNaoPreenchida: 0, criterios: [], visiveis: 0, preenchidos: 0 },
                HE: dados.leitura.HE || '00:00',
                HEF: dados.leitura.HEF || '00:00',
                HEC: dados.leitura.HEC || '00:00'
            };
        }
        if (estado.execs.ajuste) estado.execs.ajuste.feitas++;
        incVersao();
    };

    AF.modelo.registrarAjusteParcial = function (nome, dados) {
        nome = String(nome || '').trim();
        var f = obterOuCriarFunc(nome);
        var movidasAnteriores = (f.ajuste && f.ajuste.movidas) || 0;
        var cod47ConvAnteriores = (f.ajuste && f.ajuste.cod47Conv) || 0;
        var cod47RestAnteriores = (f.ajuste && f.ajuste.cod47Rest) || 0;
        var acoesAnteriores = (f.ajuste && f.ajuste.acoes) || [];
        var cod47DiasAnteriores = (f.ajuste && f.ajuste.cod47Dias) || [];

        var novasAcoes = acoesAnteriores.concat(dados.acoes || []);
        var novosCod47Dias = cod47DiasAnteriores.slice();
        (dados.cod47Dias || []).forEach(function (d) {
            if (novosCod47Dias.indexOf(d) === -1) novosCod47Dias.push(d);
        });

        f.ajuste = {
            ts: Date.now(),
            movidas: movidasAnteriores + (dados.movidas || 0),
            presas: (dados.presas || []).slice(),
            cod47Conv: cod47ConvAnteriores + (dados.cod47Conv || 0),
            cod47Rest: dados.cod47Rest != null ? dados.cod47Rest : cod47RestAnteriores,
            acoes: novasAcoes,
            cod47Dias: novosCod47Dias,
            parcial: true
        };
        incVersao();
    };

    AF.modelo.contagensDaAnalise = function (nome) {
        nome = String(nome || '').trim();
        var f = estado.funcs[nome];
        if (!f || !f.analise) return null;
        var l = f.leitura || {};
        return {
            folgas: f.analise.folgas || 0,
            cod47: f.analise.cod47 || 0,
            semES: l.semES ? l.semES.total : 0,
            interj: l.interj ? l.interj.total : 0,
            britanica: l.britanica ? l.britanica.total : 0,
            naoPreenchida: (l.naoPreenchida && l.naoPreenchida.flag) ? 1 : 0
        };
    };

    // ── Derivados por Funcionário ───────────────────────────────────────

    AF.modelo.obterDadosFunc = function (nome) {
        var f = estado.funcs[nome];
        if (!f || (!f.analise && !f.ajuste && !f.vazia)) {
            return {
                nome: nome,
                processado: false,
                vazia: false,
                parcial: false,
                temAjuste: false,
                folgas: { texto: '-', estado: 'nao-processado', num: 0, den: 0, presas: 0 },
                cod47: { texto: '-', estado: 'nao-processado', num: 0, den: 0, rest: 0 },
                semES: { total: null, dias: [] },
                interj: { total: null, dias: [] },
                britanica: { total: null, dias: [] },
                naoPreenchida: { texto: '-', pct: null, sinalizada: false, avaliada: false, criterios: [] },
                HE: null,
                HEF: null,
                HEC: null
            };
        }

        var vazia = !!f.vazia;
        var parcial = !!(f.ajuste && f.ajuste.parcial);

        // Folha sem marcações: foi lida, mas não há dados; todas as colunas mostram '-'.
        if (vazia) {
            return {
                nome: nome,
                processado: true,
                vazia: true,
                parcial: false,
                temAjuste: false,
                folgas: { texto: '-', estado: 'nao-processado', num: 0, den: 0, presas: 0, presasDetalhe: [] },
                cod47: { texto: '-', estado: 'nao-processado', num: 0, den: 0, rest: 0, dias: [] },
                semES: { total: null, dias: [] },
                interj: { total: null, dias: [] },
                britanica: { total: null, dias: [] },
                naoPreenchida: { texto: '-', pct: null, sinalizada: false, avaliada: false, criterios: [], visiveis: 0, preenchidos: 0 },
                HE: null,
                HEF: null,
                HEC: null
            };
        }

        // Folgas
        var folgasInfo = { texto: '-', estado: 'zero', num: 0, den: 0, presas: 0, presasDetalhe: [] };
        if (f.ajuste) {
            var presasCount = (f.ajuste.presas || []).length;
            var denF = f.ajuste.movidas + presasCount;
            folgasInfo.num = f.ajuste.movidas;
            folgasInfo.den = denF;
            folgasInfo.presas = presasCount;
            folgasInfo.presasDetalhe = f.ajuste.presas || [];
            if (denF === 0) {
                folgasInfo.texto = '0';
                folgasInfo.estado = 'zero';
            } else {
                folgasInfo.texto = f.ajuste.movidas + '/' + denF;
                folgasInfo.estado = presasCount > 0 ? 'atencao' : 'concluida';
            }
        } else if (f.analise) {
            var valF = f.analise.folgas || 0;
            folgasInfo.num = 0;
            folgasInfo.den = valF;
            folgasInfo.texto = String(valF);
            folgasInfo.estado = valF > 0 ? 'pendente' : 'zero';
        }

        // Cod 47
        var cod47Info = { texto: '-', estado: 'zero', num: 0, den: 0, rest: 0, dias: [] };
        if (f.ajuste) {
            var denC = f.ajuste.cod47Conv + f.ajuste.cod47Rest;
            cod47Info.num = f.ajuste.cod47Conv;
            cod47Info.den = denC;
            cod47Info.rest = f.ajuste.cod47Rest;
            if (denC === 0) {
                cod47Info.texto = '0';
                cod47Info.estado = 'zero';
            } else {
                cod47Info.texto = f.ajuste.cod47Conv + '/' + denC;
                cod47Info.estado = f.ajuste.cod47Rest > 0 ? 'atencao' : 'concluida';
            }
        } else if (f.analise) {
            var valC = f.analise.cod47 || 0;
            cod47Info.texto = String(valC);
            cod47Info.estado = valC > 0 ? 'pendente' : 'zero';
            cod47Info.dias = f.analise.cod47Dias || [];
        }

        var l = f.leitura || {};
        var np = l.naoPreenchida || {};
        var npTexto = '-';
        if (np.avaliada && np.flag) {
            npTexto = (np.pctNaoPreenchida != null ? np.pctNaoPreenchida : 0) + '%';
        }

        return {
            nome: nome,
            processado: true,
            vazia: vazia,
            parcial: parcial,
            temAjuste: !!f.ajuste,
            folgas: folgasInfo,
            cod47: cod47Info,
            semES: l.semES || { total: 0, dias: [] },
            interj: l.interj || { total: 0, dias: [] },
            britanica: l.britanica || { total: 0, dias: [] },
            naoPreenchida: {
                texto: npTexto,
                pct: np.pctNaoPreenchida,
                sinalizada: !!np.flag,
                avaliada: !!np.avaliada,
                criterios: np.criterios || [],
                visiveis: np.visiveis || 0,
                preenchidos: np.preenchidos || 0
            },
            HE: l.HE || '00:00',
            HEF: l.HEF || '00:00',
            HEC: l.HEC || '00:00'
        };
    };

    // ── Resumo Geral (Big Numbers) ──────────────────────────────────────

    function parseMin(s) {
        if (!s) return 0;
        var str = String(s).replace(/^'/, '').trim();
        var neg = str.charAt(0) === '-';
        if (neg) str = str.slice(1);
        var p = str.split(':');
        var m = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
        return neg ? -m : m;
    }

    function formatMin(m) {
        var neg = m < 0;
        var abs = Math.abs(m);
        var h = Math.floor(abs / 60);
        var min = abs % 60;
        return (neg ? '-' : '') + String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
    }

    AF.modelo.resumo = function () {
        var totalFolgasMovidas = 0;
        var totalFolgasPresas = 0;
        var totalFolgasPendentes = 0;

        var irregs = {
            semES: { total: 0, funcs: 0 },
            interj: { total: 0, funcs: 0 },
            britanica: { total: 0, funcs: 0 },
            naoPreenchida: { total: 0, funcs: 0 }
        };

        var heList = [];
        var hefList = [];
        var hecPosList = [];
        var hecNegList = [];

        var nomes = estado.ordem.length ? estado.ordem : Object.keys(estado.funcs);

        nomes.forEach(function (nome) {
            var f = AF.modelo.obterDadosFunc(nome);
            if (!f.processado) return;

            // Folgas
            if (f.folgas.estado === 'pendente') {
                totalFolgasPendentes += f.folgas.den;
            } else if (f.folgas.estado === 'concluida' || f.folgas.estado === 'atencao') {
                totalFolgasMovidas += f.folgas.num;
                totalFolgasPresas += f.folgas.presas;
            }

            // Irregularidades
            if (f.semES.total > 0) {
                irregs.semES.total += f.semES.total;
                irregs.semES.funcs++;
            }
            if (f.interj.total > 0) {
                irregs.interj.total += f.interj.total;
                irregs.interj.funcs++;
            }
            if (f.britanica.total > 0) {
                irregs.britanica.total += f.britanica.total;
                irregs.britanica.funcs++;
            }
            if (f.naoPreenchida.sinalizada) {
                irregs.naoPreenchida.total++;
                irregs.naoPreenchida.funcs++;
            }

            // Horas Extras
            if (f.HE) {
                var mHe = parseMin(f.HE);
                if (mHe > 0) heList.push({ nome: f.nome, val: mHe, str: f.HE });
            }
            if (f.HEF) {
                var mHef = parseMin(f.HEF);
                if (mHef > 0) hefList.push({ nome: f.nome, val: mHef, str: f.HEF });
            }
            if (f.HEC) {
                var mHec = parseMin(f.HEC);
                if (mHec > 0) hecPosList.push({ nome: f.nome, val: mHec, str: f.HEC });
                else if (mHec < 0) hecNegList.push({ nome: f.nome, val: mHec, str: f.HEC });
            }
        });

        function calcMinMaxTotal(lista) {
            if (!lista.length) {
                return { total: '00:00', min: '-', max: '-', minNome: '', maxNome: '' };
            }
            var tot = 0;
            var minItem = lista[0];
            var maxItem = lista[0];
            lista.forEach(function (x) {
                tot += x.val;
                if (x.val < minItem.val) minItem = x;
                if (x.val > maxItem.val) maxItem = x;
            });
            return {
                total: formatMin(tot),
                min: minItem.str,
                minNome: minItem.nome,
                max: maxItem.str,
                maxNome: maxItem.nome
            };
        }

        function calcMinMaxNegativo(lista) {
            if (!lista.length) {
                return { total: '00:00', min: '-', max: '-', minNome: '', maxNome: '' };
            }
            var tot = 0;
            // No negativo: maior magnitude é mais negativo (ex: -35:00 vs -08:13).
            // Mínimo em magnitude: mais próximo de 0 (ex: -08:13).
            // Máximo em magnitude: maior saldo de débito (ex: -35:00).
            var menorMag = lista[0];
            var maiorMag = lista[0];
            lista.forEach(function (x) {
                tot += x.val;
                if (Math.abs(x.val) < Math.abs(menorMag.val)) menorMag = x;
                if (Math.abs(x.val) > Math.abs(maiorMag.val)) maiorMag = x;
            });
            return {
                total: formatMin(tot),
                min: menorMag.str,
                minNome: menorMag.nome,
                max: maiorMag.str,
                maxNome: maiorMag.nome
            };
        }

        var totalFolgasConsideradas = totalFolgasMovidas + totalFolgasPendentes + totalFolgasPresas;

        return {
            folgas: {
                movidas: totalFolgasMovidas,
                pendentes: totalFolgasPendentes,
                presas: totalFolgasPresas,
                totalConsiderado: totalFolgasConsideradas,
                fracaoTexto: totalFolgasConsideradas > 0 ? (totalFolgasMovidas + '/' + totalFolgasConsideradas) : '0'
            },
            irregularidades: irregs,
            he: calcMinMaxTotal(heList),
            hef: calcMinMaxTotal(hefList),
            hecPos: calcMinMaxTotal(hecPosList),
            hecNeg: calcMinMaxNegativo(hecNegList)
        };
    };

    // ── Filtros e Ordenação ─────────────────────────────────────────────

    // Cada indicador filtrável decide, a partir dos dados derivados do funcionário, se ele o compõe.
    var predicadosFiltro = {
        semES: function (f) { return f.semES.total > 0; },
        interj: function (f) { return f.interj.total > 0; },
        britanica: function (f) { return f.britanica.total > 0; },
        naoPreenchida: function (f) { return f.naoPreenchida.sinalizada; },
        presas: function (f) { return f.folgas.presas > 0; },
        // Movim.: tem folgas no indicador (a movimentar, movidas ou presas), antes e depois do Ajuste.
        pendentes: function (f) { return f.folgas.den > 0; }
    };

    function normalizarFiltros(filtros) {
        var lista = Array.isArray(filtros) ? filtros : (filtros ? [filtros] : []);
        var vistos = {};
        return lista.filter(function (id) {
            if (!predicadosFiltro[id] || vistos[id]) return false;
            vistos[id] = true;
            return true;
        });
    }

    function tokensDaBusca(busca) {
        return normSort(String(busca == null ? '' : busca)).split(/\s+/).filter(Boolean);
    }

    function casaComBusca(nome, tokens) {
        var alvo = normSort(nomeParaExportacao(nome));
        return tokens.every(function (t) { return alvo.indexOf(t) !== -1; });
    }

    // filtros: lista de ids (ou um id); os indicadores se somam (união) e a busca por nome se combina por interseção.
    AF.modelo.filtrar = function (filtros, busca) {
        var nomes = estado.ordem.length ? estado.ordem : Object.keys(estado.funcs);
        var ids = normalizarFiltros(filtros);
        var tokens = tokensDaBusca(busca);
        if (!ids.length && !tokens.length) return nomes.slice();

        return nomes.filter(function (nome) {
            if (tokens.length && !casaComBusca(nome, tokens)) return false;
            if (!ids.length) return true;

            var f = AF.modelo.obterDadosFunc(nome);
            if (!f.processado || f.vazia) return false;
            return ids.some(function (id) { return predicadosFiltro[id](f); });
        });
    };

    function normSort(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    AF.modelo.ordenar = function (nomes, col, dir) {
        dir = dir === -1 ? -1 : 1;
        var arr = (nomes || []).slice();

        arr.sort(function (nA, nB) {
            var a = AF.modelo.obterDadosFunc(nA);
            var b = AF.modelo.obterDadosFunc(nB);

            // Não processados sempre ao final
            if (!a.processado && !b.processado) return 0;
            if (!a.processado) return 1;
            if (!b.processado) return -1;

            if (col === 'nome') {
                var va = normSort(a.nome), vb = normSort(b.nome);
                return va < vb ? -dir : va > vb ? dir : 0;
            }

            if (col === 'folgas') {
                var pendA = a.folgas.estado === 'pendente' ? a.folgas.den : a.folgas.presas;
                var pendB = b.folgas.estado === 'pendente' ? b.folgas.den : b.folgas.presas;
                return (pendB - pendA) * dir;
            }

            if (col === 'cod47') {
                var pendCA = a.cod47.estado === 'pendente' ? a.cod47.den : a.cod47.rest;
                var pendCB = b.cod47.estado === 'pendente' ? b.cod47.den : b.cod47.rest;
                return (pendCB - pendCA) * dir;
            }

            if (col === 'semES') return ((b.semES.total || 0) - (a.semES.total || 0)) * dir;
            if (col === 'interj') return ((b.interj.total || 0) - (a.interj.total || 0)) * dir;
            if (col === 'britanica') return ((b.britanica.total || 0) - (a.britanica.total || 0)) * dir;
            if (col === 'naoPreenchida') {
                var pctA = a.naoPreenchida.sinalizada ? a.naoPreenchida.pct : -1;
                var pctB = b.naoPreenchida.sinalizada ? b.naoPreenchida.pct : -1;
                return (pctB - pctA) * dir;
            }

            if (col === 'he' || col === 'hef' || col === 'hec') {
                var mValA = parseMin(a[col.toUpperCase()]);
                var mValB = parseMin(b[col.toUpperCase()]);
                return (mValB - mValA) * dir;
            }

            return 0;
        });

        return arr;
    };

    // ── Extremos (mín/máx) de horas: filtra zerados e ordena pela magnitude ──
    // col: 'he' | 'hef' | 'hec'; modo: 'min' | 'max'; sinal: 1 (só positivos), -1 (só negativos) ou 0 (qualquer não zero).
    AF.modelo.ordenarPorExtremo = function (nomes, col, modo, sinal) {
        var chave = String(col || '').toUpperCase();
        var itens = [];
        (nomes || []).forEach(function (nome) {
            var d = AF.modelo.obterDadosFunc(nome);
            if (!d.processado || d.vazia) return;
            var m = parseMin(d[chave]);
            if (!m) return;
            if (sinal > 0 && m < 0) return;
            if (sinal < 0 && m > 0) return;
            itens.push({ nome: nome, mag: Math.abs(m) });
        });
        var dir = modo === 'min' ? 1 : -1;
        itens.sort(function (a, b) {
            if (a.mag !== b.mag) return (a.mag - b.mag) * dir;
            return a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0;
        });
        return itens.map(function (x) { return x.nome; });
    };

    function extrairDataIrregularidade(item) {
        var valor = item && typeof item === 'object' ? item.data : item;
        var texto = String(valor == null ? '' : valor).trim();
        var match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return { texto: texto, chave: null, diaMes: texto };

        var dia = parseInt(match[1], 10);
        var mes = parseInt(match[2], 10);
        var ano = parseInt(match[3], 10);
        var data = new Date(Date.UTC(ano, mes - 1, dia));
        if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
            return { texto: texto, chave: null, diaMes: texto };
        }
        return {
            texto: texto,
            chave: ano * 10000 + mes * 100 + dia,
            diaMes: String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0')
        };
    }

    function formatarDiasIrregularidade(dias) {
        var validas = [];
        var invalidas = [];
        var vistas = Object.create(null);
        (dias || []).forEach(function (item, indice) {
            var data = extrairDataIrregularidade(item);
            if (!data.texto) return;
            var chave = data.chave === null ? 'invalida:' + data.texto : 'data:' + data.chave;
            if (vistas[chave]) return;
            vistas[chave] = true;
            var entrada = { data: data, indice: indice };
            if (data.chave === null) invalidas.push(entrada);
            else validas.push(entrada);
        });
        validas.sort(function (a, b) { return a.data.chave - b.data.chave || a.indice - b.indice; });
        return validas.map(function (x) { return x.data.diaMes; })
            .concat(invalidas.map(function (x) { return x.data.texto; }));
    }

    function linhaIrregularidade(ocorrencia, prefixo) {
        var total = Number(ocorrencia && ocorrencia.total) || 0;
        if (total <= 0) return '';
        var dias = formatarDiasIrregularidade(ocorrencia.dias);
        if (!dias.length) {
            return prefixo + ' (' + total + ' ocorrência' + (total === 1 ? '' : 's') + '; datas não disponíveis).';
        }
        return prefixo + ' ' + dias.join(', ') + '.';
    }

    function nomeParaExportacao(nome) {
        return String(nome || '').replace(/\s+\d+$/, '').trim();
    }

    AF.modelo.textoIrregularidades = function (nome) {
        var f = AF.modelo.obterDadosFunc(nome);
        if (!f.processado || f.vazia) return '';

        var linhas = [];
        if (f.naoPreenchida.sinalizada) {
            var pct = f.naoPreenchida.pct;
            linhas.push('- Realizar o preenchimento da folha (' + (pct == null ? '-' : pct) + '% dos dias sem marcação).');
        } else {
            var semES = linhaIrregularidade(f.semES, '- s/marcação de entrada ou saída nos dias,');
            var interj = linhaIrregularidade(f.interj, '- Checar se interjornada é devida nos dias,');
            var britanica = linhaIrregularidade(f.britanica, '- Ajustar marcações britânicas, nos dias');
            if (semES) linhas.push(semES);
            if (interj) linhas.push(interj);
            if (britanica) linhas.push(britanica);
        }
        return linhas.length ? '*' + nomeParaExportacao(f.nome) + '\n' + linhas.join('\n') : '';
    };

    var rotulosFiltroIrregularidade = {
        semES: 'Sem Entrada/Saída',
        interj: 'Interjornada',
        britanica: 'Marc. Britânicas',
        naoPreenchida: 'Folhas não Preenchidas',
        presas: 'Presas',
        pendentes: 'Movim.'
    };

    AF.modelo.rotuloFiltro = function (id) {
        return rotulosFiltroIrregularidade[id] || String(id);
    };

    // filtros: lista de ids (ou um id); busca: texto digitado no campo de busca por nome.
    AF.modelo.textoIrregularidadesTime = function (nomes, filtros, busca) {
        var mes = estado.mes || 'Não definido';
        var rotulos = (Array.isArray(filtros) ? filtros : (filtros ? [filtros] : []))
            .map(AF.modelo.rotuloFiltro);
        var textoBusca = String(busca == null ? '' : busca).trim();
        var titulo = '*Irregularidades – ' + mes
            + (rotulos.length ? ' – ' + rotulos.join(' + ') : '')
            + (textoBusca ? ' – Busca: "' + textoBusca + '"' : '');
        var blocos = [];
        (nomes || []).forEach(function (nome) {
            var texto = AF.modelo.textoIrregularidades(nome);
            if (texto) blocos.push(texto);
        });
        return titulo + '\n\n' + (blocos.length ? blocos.join('\n\n') : 'Nenhuma irregularidade para exportar.');
    };

    // ── Detalhe de Ajuste por Funcionário ───────────────────────────────

    function extrairDataCompleta(item) {
        var valor = item && typeof item === 'object' ? (item.dataFolga || item.data) : item;
        var texto = String(valor == null ? '' : valor).trim();
        var match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return { texto: texto, chave: null, dataFmt: texto };

        var dia = parseInt(match[1], 10);
        var mes = parseInt(match[2], 10);
        var ano = parseInt(match[3], 10);
        var data = new Date(Date.UTC(ano, mes - 1, dia));
        if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
            return { texto: texto, chave: null, dataFmt: texto };
        }
        var dataFmt = String(dia).padStart(2, '0') + '/' + String(mes).padStart(2, '0') + '/' + ano;
        return {
            texto: texto,
            chave: ano * 10000 + mes * 100 + dia,
            dataFmt: dataFmt
        };
    }

    function formatarDatasCompletasUnicas(lista) {
        var validas = [];
        var invalidas = [];
        var vistas = Object.create(null);
        (lista || []).forEach(function (item, indice) {
            var d = extrairDataCompleta(item);
            if (!d.texto) return;
            var chave = d.chave === null ? 'invalida:' + d.texto : 'data:' + d.chave;
            if (vistas[chave]) return;
            vistas[chave] = true;
            var entrada = { data: d, indice: indice };
            if (d.chave === null) invalidas.push(entrada);
            else validas.push(entrada);
        });
        validas.sort(function (a, b) { return a.data.chave - b.data.chave || a.indice - b.indice; });
        return validas.map(function (x) { return x.data.dataFmt; })
            .concat(invalidas.map(function (x) { return x.data.texto; }));
    }

    function normalizarResultadoAcao(r) {
        if (!r) return 'alterado';
        if (r === 'movida' || r === 'alterado') return 'alterado';
        if (r === 'sem-alteracao' || r === 'sem alteração' || r === 'sem alteracao') return 'sem alteração';
        if (r === 'falha') return 'falha';
        return String(r);
    }

    AF.modelo.textoDetalheAjuste = function (nome) {
        nome = String(nome || '').trim();
        var f = estado.funcs[nome];
        var nomeCabecalho = nomeParaExportacao(nome);
        if (!f || !f.ajuste) {
            return nomeCabecalho + '\n|_Nenhum ajuste registrado';
        }

        var aj = f.ajuste;
        var linhas = [nomeCabecalho];
        if (aj.parcial) {
            linhas.push('|_Ajuste parcial (interrompido)');
        }

        var temConteudo = false;

        // 1. Folgas movimentadas
        var acoes = aj.acoes || [];
        if (acoes.length > 0) {
            var ordemPesos = { 'alterado': 3, 'sem alteração': 2, 'falha': 1 };
            var mapaAcoes = Object.create(null);
            var chavesOrdenadas = [];

            acoes.forEach(function (ac) {
                var dest = extrairDataCompleta(ac.ausencia || ac.destino).dataFmt;
                var orig = extrairDataCompleta(ac.origem).dataFmt;
                var res = normalizarResultadoAcao(ac.resultado);
                var chave = dest + '<-' + orig;
                if (!mapaAcoes[chave]) {
                    mapaAcoes[chave] = { dest: dest, orig: orig, res: res };
                    chavesOrdenadas.push(chave);
                } else {
                    var pesoAtual = ordemPesos[mapaAcoes[chave].res] || 0;
                    var novoPeso = ordemPesos[res] || 0;
                    if (novoPeso > pesoAtual) {
                        mapaAcoes[chave].res = res;
                    }
                }
            });

            if (chavesOrdenadas.length > 0) {
                temConteudo = true;
                linhas.push('|_Folgas movimentadas');
                chavesOrdenadas.forEach(function (k) {
                    var item = mapaAcoes[k];
                    linhas.push('  |_ ' + item.dest + ' <- origem ' + item.orig + ' => ' + item.res);
                });
            }
        }

        // 2. Folgas Presas
        var presas = aj.presas || [];
        if (presas.length > 0) {
            var datasPresas = formatarDatasCompletasUnicas(presas);
            if (datasPresas.length > 0) {
                temConteudo = true;
                linhas.push('|_Folgas Presas');
                linhas.push('  |_Dias: ' + datasPresas.join(', '));
            }
        }

        // 3. Códigos 47
        var cod47Dias = aj.cod47Dias || [];
        var cod47Rest = aj.cod47Rest != null ? aj.cod47Rest : 0;
        var datas47 = formatarDatasCompletasUnicas(cod47Dias);
        if (datas47.length > 0 || cod47Rest > 0) {
            temConteudo = true;
            linhas.push('|_Códigos 47');
            if (datas47.length > 0) {
                linhas.push('  |_ Dias: ' + datas47.join(', '));
            }
            if (cod47Rest > 0) {
                linhas.push('  |_ Restantes: ' + cod47Rest);
            }
        }

        if (!temConteudo) {
            linhas.push('|_Nenhum ajuste registrado');
        }

        return linhas.join('\n');
    };

    // ── Exportação TSV ──────────────────────────────────────────────────

    AF.modelo.tsv = function () {
        var T = '\t';
        var cab = ['Nome', 'Folgas', 'Presas', 'Cód 47', 'Sem Entrada/Saída', 'Interjornada', 'Marc. britânicas', '% Folha não preenchida', 'HE100%', 'HEF100%', 'HEC70%'].join(T);
        var linhas = [cab];

        var nomes = estado.ordem.length ? estado.ordem : Object.keys(estado.funcs);
        nomes.forEach(function (nome) {
            var f = AF.modelo.obterDadosFunc(nome);
            if (!f.processado || f.vazia) return;

            var fTexto = f.folgas.texto;
            if (fTexto.indexOf('/') >= 0) fTexto = "'" + fTexto;

            var cTexto = f.cod47.texto;
            if (cTexto.indexOf('/') >= 0) cTexto = "'" + cTexto;

            var hecTexto = f.HEC || '00:00';
            if (hecTexto.charAt(0) === '-') hecTexto = "'" + hecTexto;

            var row = [
                f.nome,
                fTexto,
                f.folgas.presas,
                cTexto,
                f.semES.total != null ? f.semES.total : 0,
                f.interj.total != null ? f.interj.total : 0,
                f.britanica.total != null ? f.britanica.total : 0,
                f.naoPreenchida.texto,
                f.HE || '00:00',
                f.HEF || '00:00',
                hecTexto
            ];
            linhas.push(row.join(T));
        });

        return linhas.join('\r\n');
    };

    // Getters auxiliares
    AF.modelo.obterEstado = function () { return estado; };
    AF.modelo.limpar = function () {
        estado = { v: 1, versao: 0, mes: '', execs: { analise: null, ajuste: null }, atual: null, ordem: [], funcs: {} };
        try {
            var st = armazenamento();
            if (st) st.removeItem(CHAVE_STORAGE);
        } catch (e) {}
    };

    AF.modelo.restaurar();

    try {
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', function () { AF.modelo.salvar(); });
        }
    } catch (e) {}

    console.log('[FPW] 27-modelo-relatorio carregado. v1.0 - modelo de relatorio vivo e unificado');
})();
