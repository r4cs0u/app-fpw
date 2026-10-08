## Context

`AF.fases.registrarAcaoFolga(fase, acao, r, tipo)` em `40-fases.js` é chamado depois de cada tentativa de folga nas Fases 1 a 3 e envia ao log o evento `acao-folga` com `ausencia` (dia de destino), `origem` e `resultado` (`movida`, `sem-alteracao` ou `falha`). A Fase 4 registra o evento `cod47` com a data de cada 47 que passou a 48, mas só o número do campo (`nsMarcados`) volta ao chamador. Ao fim da folha, `processarFolhaAtual` chama `AF.modelo.registrarAjuste` (ou `registrarAjusteParcial` quando interrompida), que guardam `movidas`, `presas` (com `dataFolga` e `motivo`), `cod47Conv` e `cod47Rest` e acumulam entre Ajustes; `registrarAnalise` zera o Ajuste. O log limita eventos em memória (20 000) e caracteres no armazenamento, e descarta os mais antigos.

O texto de irregularidades (`textoIrregularidades`) é um bom molde: função pura sobre `obterDadosFunc`. A coluna do ícone de cópia e a delegação de cliques em `tbody` estão em `60-relatorios.js`. A célula mesclada de funcionário sem marcações (change `report-row-presentation`) calcula o `colspan` a partir do cabeçalho, o que absorve uma coluna nova.

Ver proposal.md e a spec `team-report` desta change.

## Goals / Non-Goals

**Goals:**
- Guardar no modelo, de forma compacta e persistida, o que é necessário para o resumo.
- Gerar o texto por função pura testada.
- Manter o botão e a linha expandida sem interferir na navegação nem na execução.

**Non-Goals:**
- Não reconstruir o resumo a partir do log.
- Não copiar o texto para a área de transferência nem exportá-lo (fora do pedido).
- Não alterar o que o Ajuste faz nem o formato do log.
- Não registrar a Análise-por-dia no detalhe; ele cobre apenas o Ajuste.

## Decisions

**1. Guardar as ações em `f.ajuste.acoes` e os dias de código 47 em `f.ajuste.cod47Dias`.**
Vão no mesmo objeto que já acumula `movidas` e `cod47Conv` e que a Análise já zera, então herdam a regra de acumulação e de descarte sem código novo. Alternativa: lista separada no registro do funcionário, que exigiria repetir o descarte na Análise.

**2. Coletar durante a folha em `AF.estado.acoesFolhaAtual` e `AF.estado.cod47DiasFolhaAtual`, zerados no início de `processarFolhaAtual`.**
`registrarAcaoFolga` acrescenta cada ação à lista, e a Fase 4 acrescenta cada data de 47 convertido. No fim da folha, `registrarAjuste` e `registrarAjusteParcial` recebem as listas por parâmetro. Alternativa: fazer as Fases 1 a 3 devolverem as ações; muda a assinatura de três funções que têm testes e o fluxo de Fase 3 inline.

**3. Os dias de código 47 só entram no registro quando a gravação da Fase 4 foi confirmada.**
O registro final já ocorre apenas depois de `gravar` retornar `ready`; no caminho parcial, os dias não são passados. Assim, "convertido" nunca descreve algo não gravado.

**4. Restantes de código 47 vêm de `cod47Rest`, que já existe.**
O texto mostra só a quantidade, pois o modelo guarda a contagem, não os dias, dos restantes.

**5. Função pura `AF.modelo.textoDetalheAjuste(nome)` em `27-modelo-relatorio.js`.**
Reaproveita `nomeParaExportacao` e a formatação de datas. As datas dos dias vêm em `dd/mm/aaaa` do mapa e são ordenadas pelo analisador de data já usado em `formatarDiasIrregularidade`. Dias repetidos são removidos.

**6. Coluna nova "detalhe" ao lado do ícone de cópia, e linha de detalhe como `<tr class="detail-row">` logo após a linha do funcionário.**
A linha de detalhe usa `data-detalhe-de` (não `data-nome`), então o clique de navegação não a captura. O conjunto de funcionários expandidos fica em `estadoVisao.expandidos` e é consultado ao montar o corpo da tabela; funcionários que saem da visão (filtro) ficam recolhidos visualmente mas o estado é mantido.

**7. O conteúdo vai em `<pre>` com `white-space: pre-wrap`.**
Preserva a árvore com `|_` e o recuo sem estilos adicionais; o texto é escapado para HTML.

## Risks / Trade-offs

- [Mais dados no `sessionStorage`] → lista curta por funcionário (dezenas de itens no máximo) e dias como texto; o modelo já limita falhas de persistência sem interromper a execução.
- [Listas globais em `AF.estado` vazarem entre folhas] → zeradas no início de cada folha e lidas só no fim da mesma; teste cobre duas folhas em sequência.
- [A Fase 4 será extraída para função pura em change posterior (`extract-phase4-decision`)] → o ponto de coleta é uma linha ao lado do evento `cod47`; a extração a preserva.
- [Registros antigos da sessão sem `acoes`] → o texto trata campos ausentes como lista vazia e mostra "Nenhum ajuste registrado".
- [Excesso de largura da tabela com a coluna extra] → o botão é um ícone compacto na mesma largura da coluna de cópia.
