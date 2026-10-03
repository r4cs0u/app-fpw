(function () {
    'use strict';

    var AF = window.AutomacaoFolha;
    AF.popup = AF.popup || {};

    AF.popup.popupAindaAberto = function () {
        try {
            return AF.estado.ultimoPopup && !AF.estado.ultimoPopup.closed;
        } catch (e) {
            return false;
        }
    };

    AF.popup.acharLinkAjuste = function () {
        for (var f = 0; f < window.top.frames.length; f++) {
            try {
                var links = Array.from(window.top.frames[f].document.querySelectorAll('a'));
                for (var li = 0; li < links.length; li++) {
                    if ((links[li].innerText || '').includes('Ajuste Jornada Plan')) {
                        return links[li];
                    }
                }
            } catch (e) {}
        }
        return null;
    };

    AF.popup.acharRadioPorNumero = function (num) {
        if (!num) return null;
        try {
            return AF.core.getDoc1().querySelector('input[type=radio][onclick*="submitPage(' + num + ')"]');
        } catch (e) {
            return null;
        }
    };

    AF.popup.aguardarPopupPronto = function (execucao, tentativa) {
        var prazo = AF.core.prazosEsperaAjuste.popupReadiness;
        return AF.core.esperarAjuste({
            stage: 'popup-readiness',
            deadlineMs: prazo.deadlineMs,
            pollIntervalMs: prazo.pollIntervalMs,
            isCancelled: function () { return !execucao.isActive(); },
            onCancel: function (callback) { return execucao.onCancel(callback); },
            inspecionar: function () {
                var popup = tentativa.popup;
                if (!popup) return { ready: false, reason: 'A janela do popup ainda nao foi capturada.' };
                if (popup.closed) throw new Error('Popup fechado antes de ficar pronto.');

                var doc = popup.document;
                var caminho = String(popup.location.pathname || '').toLowerCase().replace(/\/+$/, '');
                if (!caminho || caminho.endsWith('/redirecionamentoaspx.asp')) {
                    return { ready: false, reason: 'Popup aguardando redirecionamento para Ajuste Jornada Plan.' };
                }

                if (doc.readyState !== 'complete') {
                    return { ready: false, reason: 'Documento do popup ainda carregando.' };
                }
                if (!caminho.endsWith('/webpontodotnet/justificativa/trocarhorario.aspx')) {
                    throw new Error('Caminho do popup de Ajuste Jornada Plan inesperado: ' + caminho);
                }

                var form = doc.querySelector('form#form1');
                var seletor = doc.getElementById('rpnPeriodo_ddlDatas');
                var gravar = doc.querySelector('input[name="btnGravar"]');
                if (form && seletor && seletor.options && seletor.options.length > 0 && gravar) {
                    return { ready: true, value: popup };
                }
                return { ready: false, reason: 'Estrutura suportada do popup ainda incompleta.' };
            }
        });
    };

    AF.popup.observarReloadPrincipal = AF.core.observarTransicaoCorpo;

    AF.popup.tentarIndiceDatas = async function (popup, datasCandidatas, idx, execucao, tentativa) {
        function erro(etapa, motivo) {
            return { status: 'error', stage: etapa, reason: motivo };
        }

        function aindaAtiva() {
            return execucao.isActive();
        }

        while (aindaAtiva()) {
            try {
                if (popup.closed) return erro('popup-readiness', 'Popup fechado antes do envio.');
            } catch (erroJanela) {
                return erro('popup-readiness', erroJanela.message || String(erroJanela));
            }

            if (idx >= datasCandidatas.length) {
                tentativa.exhausted = true;
                sessionStorage.setItem('autopopupSemSucesso', '1');
                try {
                    var btnOkFinal = popup.document.getElementById('ppcMsg_btnMsgErro_CD');
                    if (btnOkFinal && btnOkFinal.offsetParent) btnOkFinal.click();
                } catch (erroMensagemFinal) {
                    return erro('candidate-exhaustion', erroMensagemFinal.message || String(erroMensagemFinal));
                }
                var esperaFechamento = await AF.core.esperarDelayAjuste(
                    execucao,
                    'candidate-exhaustion-stabilization',
                    800
                );
                if (esperaFechamento.status !== 'ready' || !aindaAtiva()) {
                    return { status: esperaFechamento.status, stage: esperaFechamento.stage, reason: esperaFechamento.reason };
                }
                try {
                    if (!popup.closed) popup.close();
                } catch (erroFechar) {
                    return erro('candidate-exhaustion', erroFechar.message || String(erroFechar));
                }
                return { status: 'no-change', exhausted: true };
            }

            var dataAtual = datasCandidatas[idx];
            var seletor;
            var opcoes;
            try {
                seletor = popup.document.getElementById('rpnPeriodo_ddlDatas');
                if (!seletor || !seletor.options || seletor.options.length === 0) {
                    return erro('popup-edit', 'Seletor de datas deixou de estar disponivel.');
                }
                opcoes = Array.from(seletor.options);
            } catch (erroInspecao) {
                return erro('popup-edit', erroInspecao.message || String(erroInspecao));
            }

            var opcaoAtual = null;
            for (var i = 0; i < opcoes.length; i++) {
                if ((opcoes[i].text || '').indexOf(dataAtual) >= 0 ||
                    (opcoes[i].value || '').indexOf(dataAtual) >= 0) {
                    opcaoAtual = opcoes[i];
                    break;
                }
            }
            if (!opcaoAtual) {
                idx++;
                continue;
            }

            if (!aindaAtiva()) return { status: 'cancelled', stage: 'popup-edit' };
            if (AF.core && typeof AF.core.exigirEstrutura === 'function' &&
                !AF.core.exigirEstrutura('edicao no popup', popup)) {
                return erro('popup-edit', 'As pre-condicoes estruturais do popup falharam.');
            }

            try {
                for (var oi = 0; oi < seletor.options.length; oi++) seletor.options[oi].selected = false;
                opcaoAtual.selected = true;
                seletor.selectedIndex = opcaoAtual.index;
                seletor.value = opcaoAtual.value;
                seletor.dispatchEvent(new Event('input', { bubbles: true }));
                seletor.dispatchEvent(new Event('change', { bubbles: true }));
                seletor.dispatchEvent(new Event('blur', { bubbles: true }));
            } catch (erroEdicao) {
                return erro('popup-edit', erroEdicao.message || String(erroEdicao));
            }

            var estabilizacao = await AF.core.esperarDelayAjuste(
                execucao,
                'popup-edit-stabilization',
                1400
            );
            if (estabilizacao.status !== 'ready' || !aindaAtiva()) {
                return { status: estabilizacao.status, stage: estabilizacao.stage, reason: estabilizacao.reason };
            }

            try {
                if (popup.closed) return erro('popup-save', 'Popup fechado antes do envio.');
            } catch (erroJanelaAntesEnvio) {
                return erro('popup-save', erroJanelaAntesEnvio.message || String(erroJanelaAntesEnvio));
            }
            if (AF.core && typeof AF.core.exigirEstrutura === 'function' &&
                !AF.core.exigirEstrutura('gravacao no popup', popup)) {
                return erro('popup-save', 'As pre-condicoes estruturais do popup falharam.');
            }

            var botaoGravar;
            try {
                botaoGravar = popup.document.querySelector('input[name="btnGravar"]');
            } catch (erroControleGravar) {
                return erro('popup-save', erroControleGravar.message || String(erroControleGravar));
            }
            if (!botaoGravar) return erro('popup-save', 'Controle de gravacao ausente no popup.');

            var observadorReload;
            try {
                if (!aindaAtiva()) return { status: 'cancelled', stage: 'popup-save' };
                observadorReload = AF.popup.observarReloadPrincipal(execucao, tentativa);
                observadorReload.marcarEnvio();
                if (!aindaAtiva()) {
                    observadorReload.dispose();
                    return { status: 'cancelled', stage: 'popup-save' };
                }
                botaoGravar.click();
            } catch (erroEnvio) {
                if (observadorReload) observadorReload.dispose();
                return {
                    status: 'error',
                    stage: 'popup-save',
                    reason: erroEnvio.message || String(erroEnvio),
                    unconfirmed: tentativa.submitted
                };
            }

            var prazoReload = AF.core.prazosEsperaAjuste.bodyReload;
            var prazoFechamento = AF.core.prazosEsperaAjuste.popupCompletion;
            var resultadoTentativa;
            try {
                var restanteReload = Math.max(1, prazoReload.deadlineMs - (Date.now() - tentativa.submittedAt));
                resultadoTentativa = await AF.core.esperarAjuste({
                    stage: 'popup-save-completion',
                    deadlineMs: restanteReload,
                    pollIntervalMs: prazoReload.pollIntervalMs,
                    isCancelled: function () { return !aindaAtiva(); },
                    onCancel: function (callback) { return execucao.onCancel(callback); },
                    inspecionar: function () {
                        if (!aindaAtiva()) return false;
                        if (popup.closed) tentativa.popupClosed = true;

                        var reload = observadorReload.inspecionar();
                        if (reload.ready) {
                            tentativa.bodyReloaded = true;
                            tentativa.bodyGeneration = reload.value.generation;
                        }

                        if (!tentativa.popupClosed) {
                            var rejeicao = popup.document.getElementById('ppcMsg_btnMsgErro_CD');
                            if (rejeicao && rejeicao.offsetParent) {
                                tentativa.rejected = true;
                                return { ready: true, value: { kind: 'rejected' } };
                            }
                        }

                        if (tentativa.popupClosed && tentativa.bodyReloaded) {
                            return { ready: true, value: { kind: 'completed' } };
                        }
                        return {
                            ready: false,
                            reason: tentativa.bodyReloaded ?
                                'Reload observado; aguardando fechamento do popup.' :
                                'Aguardando fechamento do popup e reload estrutural.'
                        };
                    }
                });

                if (resultadoTentativa.status === 'timeout' && tentativa.bodyReloaded) {
                    var restantePopup = Math.max(
                        1,
                        prazoFechamento.deadlineMs - (Date.now() - tentativa.submittedAt)
                    );
                    resultadoTentativa = await AF.core.esperarAjuste({
                        stage: 'popup-close-after-reload',
                        deadlineMs: restantePopup,
                        pollIntervalMs: prazoFechamento.pollIntervalMs,
                        isCancelled: function () { return !aindaAtiva(); },
                        onCancel: function (callback) { return execucao.onCancel(callback); },
                        inspecionar: function () {
                            if (popup.closed) {
                                tentativa.popupClosed = true;
                                return { ready: true };
                            }
                            return { ready: false, reason: 'Reload observado; aguardando fechamento do popup.' };
                        }
                    });
                }
            } finally {
                observadorReload.dispose();
            }

            if (resultadoTentativa.status !== 'ready') {
                return {
                    status: resultadoTentativa.status,
                    stage: resultadoTentativa.stage,
                    reason: resultadoTentativa.reason,
                    unconfirmed: tentativa.submitted && !tentativa.bodyReloaded
                };
            }

            if (resultadoTentativa.value && resultadoTentativa.value.kind === 'rejected') {
                if (!aindaAtiva() || popup.closed) {
                    return { status: 'error', stage: 'candidate-rejection', reason: 'Popup indisponivel ao confirmar rejeicao.' };
                }
                var botaoRejeicao = popup.document.getElementById('ppcMsg_btnMsgErro_CD');
                if (!botaoRejeicao || !botaoRejeicao.offsetParent) {
                    return { status: 'error', stage: 'candidate-rejection', reason: 'Mensagem de rejeicao deixou de estar disponivel.' };
                }
                try {
                    if (!aindaAtiva()) return { status: 'cancelled', stage: 'candidate-rejection' };
                    botaoRejeicao.click();
                } catch (erroRejeicao) {
                    return erro('candidate-rejection', erroRejeicao.message || String(erroRejeicao));
                }
                var esperaFallback = await AF.core.esperarDelayAjuste(
                    execucao,
                    'candidate-rejection-stabilization',
                    1700
                );
                if (esperaFallback.status !== 'ready') {
                    return { status: esperaFallback.status, stage: esperaFallback.stage, reason: esperaFallback.reason };
                }
                idx++;
                continue;
            }

            if (resultadoTentativa.value && resultadoTentativa.value.kind === 'completed') {
                return { status: 'ready', submitted: true, bodyReloaded: true, popupClosed: true };
            }
        }

        return { status: 'cancelled', stage: 'popup-attempt' };
    };

    AF.popup.executarAcaoFolga = async function (acao, execucao) {
        if (!execucao || !execucao.isActive()) return { ok: false, semAlteracao: true };

        var tentativa = {
            execucao: execucao,
            popup: null,
            submitted: false,
            popupClosed: false,
            bodyReloaded: false,
            rejected: false,
            exhausted: false
        };

        var radio = AF.popup.acharRadioPorNumero(acao.numAbrirPopup);
        if (!radio) {
            AF.core.log('ERRO: Radio nao encontrado (' + acao.numAbrirPopup + ').', '#f87171');
            return { ok: false, semAlteracao: true };
        }

        radio.click();
        var estabilizacao = await AF.core.esperarDelayAjuste(execucao, 'radio-open-stabilization', 800);
        if (estabilizacao.status !== 'ready' || !execucao.isActive()) {
            return { ok: false, semAlteracao: true };
        }

        var link = AF.popup.acharLinkAjuste();
        if (!link) {
            AF.core.log('ERRO: Link Ajuste nao encontrado.', '#f87171');
            return { ok: false, semAlteracao: true };
        }

        sessionStorage.removeItem('autopopupSemSucesso');
        sessionStorage.setItem('autodataTrocar', acao.dataOrigem);
        sessionStorage.setItem('autodataFallback', '');
        sessionStorage.setItem('autodatasCandidatasPopup', JSON.stringify(
            acao.candidatos && acao.candidatos.length ? acao.candidatos : [acao.dataOrigem]
        ));

        if (!execucao.isActive()) return { ok: false, semAlteracao: true };
        AF.estado.ajustePopupTentativa = tentativa;
        AF.estado.ultimoPopup = null;
        link.click();

        AF.core.log(
            'Popup aberto: ausencia ' + acao.dataAusencia + ' <- origem ' + acao.dataOrigem,
            '#0043ff'
        );

        var pronto = await AF.popup.aguardarPopupPronto(execucao, tentativa);
        if (!execucao.isActive()) {
            return {
                ok: false,
                semAlteracao: true,
                outcome: { status: 'cancelled', stage: 'popup-readiness', unconfirmed: false }
            };
        }
        if (pronto.status !== 'ready') {
            AF.core.pararExecucaoAjuste({
                status: pronto.status,
                stage: pronto.stage,
                reason: pronto.reason,
                unconfirmed: false
            }, execucao);
            return { ok: false, fatal: true, outcome: pronto };
        }

        var resultado = await AF.popup.tentarIndiceDatas(
            pronto.value,
            acao.candidatos && acao.candidatos.length ? acao.candidatos : [acao.dataOrigem],
            0,
            execucao,
            tentativa
        );
        if (!execucao.isActive()) {
            var canceladoDuranteEnvio = {
                status: 'cancelled',
                stage: resultado.stage || 'popup-save-completion',
                reason: 'Parada solicitada durante a gravacao no popup.',
                unconfirmed: tentativa.submitted && !tentativa.bodyReloaded
            };
            if (canceladoDuranteEnvio.unconfirmed) {
                AF.core.pararExecucaoAjuste(canceladoDuranteEnvio, execucao);
            }
            return {
                ok: false,
                semAlteracao: true,
                outcome: canceladoDuranteEnvio
            };
        }

        if (resultado.status === 'ready') {
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            AF.estado.ajustePopupTentativa = null;
            AF.estado.ultimoPopup = null;
            return { ok: true, semAlteracao: false, outcome: resultado };
        }

        if (resultado.status === 'no-change') {
            sessionStorage.removeItem('autopopupSemSucesso');
            AF.core.log('Sem alteracao para ausencia ' + acao.dataAusencia + '.', '#ffb000');
            var estabilizacaoSemAlteracao = await AF.core.esperarDelayAjuste(
                execucao,
                'no-change-stabilization',
                400
            );
            if (estabilizacaoSemAlteracao.status !== 'ready' || !execucao.isActive()) {
                return { ok: false, semAlteracao: true };
            }
            sessionStorage.removeItem('autodataTrocar');
            sessionStorage.removeItem('autodataFallback');
            sessionStorage.removeItem('autodatasCandidatasPopup');
            AF.estado.ajustePopupTentativa = null;
            AF.estado.ultimoPopup = null;
            return { ok: false, semAlteracao: true, outcome: resultado };
        }

        if (!execucao.isActive()) return { ok: false, semAlteracao: true };
        var outcome = {
            status: resultado.status,
            stage: resultado.stage,
            reason: resultado.reason,
            unconfirmed: !!resultado.unconfirmed
        };
        AF.core.pararExecucaoAjuste(outcome, execucao);
        return { ok: false, fatal: true, outcome: resultado };
    };
    console.log('[FPW] 30-popup carregado. v1.3 - fix(log): atualizar cores do log - azul #0043ff, amarelo #ffb000');
})();
