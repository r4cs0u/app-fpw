## Context

Motivação e escopo em `proposal.md`; requisitos em `specs/team-report` e `specs/report-summary`. Estado do código observado:

- `60-relatorios.js` (cerca de 780 linhas) gera, ao fim de cada execução, uma lista (`AF.estado.relatorioLista`), um TSV e um HTML completo escrito em uma janela com `document.write`. `gerarAnalise` e `gerarFolgas` produzem formatos diferentes (o de Ajuste tem a coluna Presas). `80-painel.js` zera `relatorioLista` ao iniciar qualquer execução e deixa o botão desabilitado até `habilitarCopiar`.
- A janela atual carrega CSS e JavaScript embutidos em strings e, ao clicar em uma linha, navega no seletor de funcionários do cabeçalho da página via `window.opener.top.frames[0]`.
- `40-fases.js` passa `relStats` e `relLista` para `processarFolhaAtual`; `50-analisar.js` monta `lista` e `stats`. Ambos já têm, desde a mudança anterior, o resultado do detector (dias de cada irregularidade) e eventos de log.
- Desde a mudança anterior existe `AF.estado.ultimaAnalise` (memória) usado só para comparar a pré-análise do Ajuste. A Análise conta Cód 47 só no mês alvo, enquanto a Fase 4 converte também a semana de transição (`coletarDiasCod47` com e sem `incluirSemanaTransicao`).
- A janela de log (`05-log.js`) já é conduzida a partir da janela de origem, lendo estado vivo e atualizando por `setInterval`; ela foi validada em runtime.
- Dados reais mostraram que a contagem de folgas a movimentar da Análise não enxerga folgas que só a Fase 3 resolve ou prende, daí o denominador `movidas + presas`.

## Goals / Non-Goals

**Goals:**
- Um modelo único por funcionário, testável sem DOM, que reúna Análise e Ajuste e mantenha os dias das irregularidades.
- Uma janela viva e sempre disponível, desenhada a partir do modelo, com frações, cores, colunas por irregularidade, indicadores e filtros.
- Nenhuma alteração no fluxo que escreve dados nem nas condições de parada.

**Non-Goals:**
- Exportação de irregularidades em texto (mudança C).
- Gráficos, histórico entre meses ou comparação de execuções.
- Persistir além da sessão da aba.
- Indicador agregado de Cód 47 no resumo.

## Decisions

### D1. Dois módulos: modelo puro (`27-modelo-relatorio.js`) e visão (`60-relatorios.js` reescrito)
`AF.modelo` concentra regras (acúmulo, frações, estados, agregados, filtros, TSV) e persistência. `60-relatorios.js` passa a ter funções puras que devolvem HTML (cabeçalho, indicadores, tabela) e um condutor da janela. O `27` carrega após `25-detector.js` e antes de `30-popup.js`, pois `40-fases.js` e `50-analisar.js` o chamam; ele só depende de `10-utils.js`.
- *Por quê:* segue a etapa 3 do roadmap (regras testáveis com dados sintéticos) e separa o que muda com frequência (visual) do que precisa ser exato (números).
- *Alternativa:* manter tudo em `60-relatorios.js`. Rejeitada: as regras de fração e acúmulo ficariam presas a strings de HTML.

### D2. Forma do modelo
```
estado = {
  v: 1, versao: n,                 // versao sobe a cada alteracao (para a janela saber quando redesenhar)
  mes: 'Setembro 2026',
  execs: { analise: {status, inicio, fim, total, feitas}, ajuste: {...} },
  atual: 'NOME' | null,            // funcionario em processamento
  ordem: [nomes do seletor],
  funcs: { NOME: {
      vazia: bool,
      analise: { ts, folgas, cod47, cod47Dias } | null,
      ajuste:  { ts, movidas, presas:[{data, fase, motivo}], cod47Conv, cod47Rest, parcial } | null,
      leitura: { ts, origem, semES:{total,dias}, interj:{...}, britanica:{...},
                 naoPreenchida:{avaliada,flag,pct,criterios,visiveis,preenchidos}, HE, HEF, HEC } | null
  } }
}
```
`leitura` é a última leitura da folha, venha da Análise ou do Ajuste; os campos de irregularidade e horas da tabela vêm dela, e `analise`/`ajuste` ficam separados para as frações.
- A lista de nomes vem do seletor da sessão (`ordem`); novos nomes são acrescentados e nenhum existente é apagado por uma nova execução.

### D3. Regras de acúmulo e fração (funções puras)
- `registrarAnalise`: grava `analise` e `leitura` e **zera `ajuste`** do funcionário (volta ao inteiro).
- `registrarAjuste`: `movidas += movidas da execução`; `presas =` as da execução (substitui); `cod47Conv += convertidos`; `cod47Rest =` restantes lidos no estado final; atualiza `leitura`. Parcial: acumula o que foi confirmado, marca `parcial` e mantém `cod47Rest` anterior.
- Folgas (derivado): sem `ajuste` → inteiro `analise.folgas` (estado `pendente`); com `ajuste` → `num = movidas`, `den = movidas + presas.length`; `den = 0` → `0`. Cód 47: `num = cod47Conv`, `den = cod47Conv + cod47Rest`.
- Estado de cor: `concluida` (azul), `atencao` (laranja, quando `presas > 0` ou `cod47Rest > 0`), `pendente` (azul), `zero` (sem destaque), `nao-processado` (`-`).
- *Alternativa:* guardar a fração pronta. Rejeitada: o acúmulo precisa dos componentes e a pré-análise compara contagens.

### D4. Cód 47 no mesmo escopo
`AF.analisar.coletarDiasCod47` passa a incluir a semana de transição por padrão (o mesmo escopo da Fase 4), e `contarCod47` e `analisarFolhaAtual` herdam isso. Uma opção `somenteMesAlvo` permanece para quem precisar do escopo estrito.
- *Por quê:* garante `convertidos <= total` e acaba com divergência falsa na pré-análise (`compararComAnalise` agora lê as contagens do modelo).
- *Efeito visível:* o número de Cód 47 do relatório de Análise pode subir quando houver 47 na semana de transição. Documentado no `SSD.md` e conferido em folhas reais antes de concluir.

### D5. A pré-análise lê o modelo
`AF.estado.ultimaAnalise` e `AF.estado.preAnalise` deixam de existir; a comparação usa `AF.modelo.contagensDaAnalise(nome)`. Efeito colateral positivo: como o modelo persiste na sessão, a comparação sobrevive a recarregar a página.

### D6. Janela conduzida pela janela de origem, como o log
`AF.relatorios.abrirJanela()` abre `window.open('', 'fpw-relatorio', ...)`, escreve **uma vez** o esqueleto (CSS, regiões de resumo, tabela e barra de ações) e passa a redesenhar as regiões por `innerHTML` a partir de funções puras, a cada ~1 s apenas quando `modelo.versao` ou o estado de visão (ordenação, filtro, seleção, tema) mudou. Os eventos (clique em cabeçalho, linha, indicador, copiar, log) usam delegação e são ligados pelo condutor.
- *Por quê:* já foi validado em runtime para o log, é testável com um documento simulado e evita reescrever o documento inteiro (o que perde ordenação, filtro e seleção).
- *Reabertura:* a janela tem um marcador do condutor dono. Se a página for recarregada, os eventos antigos deixam de funcionar; ao clicar em Relatório, `window.open` com o mesmo nome devolve a janela existente e o novo condutor reescreve o esqueleto e liga novos eventos. O modelo persistido reaparece.
- *Alternativa:* script embutido na janela lendo `window.opener`. Rejeitada: mais difícil de testar e mais frágil a recargas.

### D7. Navegação por linha só com a página ociosa
O clique em uma linha chama a mesma rotina de seleção de funcionário usada hoje (`AjustaCodEmpresaEmpregado` e `AtualizaFuncionario` no cabeçalho), mas **somente se `AF.estado.rodando` for falso**; caso contrário mostra um aviso na barra da janela. Isso é necessário porque o relatório passa a estar disponível durante a execução, e trocar o funcionário no meio de uma Análise ou de um Ajuste quebraria a sequência. A rotina nunca confirma o diálogo de abandono de alterações (regra do `AGENT.md`).

### D8. Indicadores e filtros (puros)
`AF.modelo.resumo(funcs)` devolve folgas (movidas, pendentes, presas, total), as quatro irregularidades (total e funcionários) e HE/HEF/HEC (total, mín e máx sem zeros, com o nome do funcionário; HEC com grupos positivo e negativo, o "máximo" negativo sendo o de maior magnitude). `AF.modelo.filtrar(funcs, chave)` implementa os filtros `semES`, `interj`, `britanica`, `naoPreenchida`, `presas` e `pendentes`. O resumo usa sempre o time inteiro; o filtro só afeta a tabela.
- Folgas pendentes = soma de `analise.folgas` dos funcionários sem `ajuste`. Presas = soma das presas dos ajustados.

### D9. TSV sob demanda
`AF.modelo.tsv()` gera o texto a cada cópia. Colunas: Nome, Folgas, Presas, Cód 47, Sem Entrada/Saída, Interjornada, Marc. britânicas, % Folha não preenchida, HE100%, HEF100%, HEC70%. Frações recebem o prefixo `'` (mesmo recurso já usado para valores negativos) para a planilha não converter `4/5` em data. Linhas de funcionários não processados são omitidas.

### D10. Persistência
Chave `fpw.relatorio.v1` em `window.top.sessionStorage` (como o log), gravação com debounce de 400 ms, descarga imediata no início e no fim de cada execução e em `pagehide`. Falha de `setItem` é registrada uma vez no log e ignorada. Na carga, execução marcada como em andamento sem execução viva vira `interrompida` e `atual` é limpo. O modelo é pequeno (dezenas de funcionários com listas de datas), então não há truncamento; se a falha persistir, o modelo continua em memória.

### D11. Integração com Análise e Ajuste
- `50-analisar.js`: ao iniciar, `AF.modelo.iniciarExecucao('analise', nomes, mes)`; por folha, `definirAtual`, depois `registrarAnalise` (ou `registrarSemMarcacoes`); ao fim, `encerrarExecucao`. As linhas de log de resumo final continuam, geradas a partir do modelo.
- `40-fases.js`: `processarFolhaAtual` perde `relStats`/`relLista`. Após a pré-análise e as fases, `registrarAjuste` com movidas, presas (com data, fase e motivo, já disponíveis no log), convertidos, restantes e a leitura final; `salvarProgressoParcial` chama `registrarAjuste` com `parcial`. Nada muda nas fases, esperas, gravação ou condições de parada.
- `AF.relatorios.habilitarCopiar` permanece apenas para compor o status final do painel.

### D12. Painel
O botão Relatório nasce habilitado e `setBtnCopiar` deixa de desabilitá-lo; a ação de clique abre a janela sem checar `relatorioLista`. O botão Log do relatório chama `AF.log.abrirJanela()`; o painel de log embutido na janela atual é removido (decisão do usuário: o log fica em uma janela própria, acessível de dentro e de fora do relatório).

### D13. Remoções
`gerarAnalise`, `gerarFolgas` e as chaves `AF.estado.relatorio`, `textoCopiavel`, `relatorioLista`, `relatorioMeta`, `relatorioTipo`, `relatorioLog` e `winRelatorio` (substituída por referência do condutor). Testes que dependiam delas são reescritos para o modelo.

## Risks / Trade-offs

- **Clique em linha durante a execução trocando o funcionário** → bloqueado por `AF.estado.rodando` (D7) e coberto por teste.
- **Janela inerte após recarregar a página** → reabrir pelo botão reescreve e religa (D6); o aviso fica documentado.
- **Mudança no número de Cód 47 da Análise** → documentar, conferir em folha real e manter a opção de escopo estrito.
- **Fração enganosa quando a Análise estava desatualizada** → o denominador do Ajuste usa o que o Ajuste de fato leu e moveu; a divergência com a Análise já fica registrada no log.
- **Cota do `sessionStorage` compartilhada com o log** → o modelo é pequeno; uma falha de gravação não interrompe a execução.
- **Redesenho a cada segundo** → só ocorre quando a versão do modelo ou a visão muda; a tabela tem dezenas de linhas.
- **Remover o painel de log embutido** → o conteúdo continua acessível pela janela de log, agora com todas as execuções.

## Migration Plan

1. Implementar na branch `test` com os testes de `node --test` passando.
2. Atualizar a instalação Tampermonkey de teste (`99-main.user.js` muda) e recarregar o MyWay conforme `AGENT.md`.
3. Validar em modo somente leitura via MCP: botão Relatório vazio, preenchimento ao vivo durante uma Análise completa, indicadores, filtros e cópia. Validar o Ajuste somente sob supervisão explícita do usuário.
4. Rollback: reverter os módulos e a lista em `99-main.user.js` na branch `test`; `main` permanece intacta.

## Open Questions

- Nenhuma que mude specs ou tarefas. Detalhes visuais (cores exatas, textos de dica) podem ser ajustados durante a implementação.
