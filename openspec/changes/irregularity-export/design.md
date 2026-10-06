# Design

## Context

O modelo de relatório (`27-modelo-relatorio.js`) já guarda, por funcionário, os dias de Sem Entrada/Saída, Interjornada e Marcações britânicas e os dados da Folha não preenchida, com a leitura mais recente prevalecendo entre Análise e Ajuste. Os dias chegam ao modelo como texto (`dd/mm/aaaa`) ou como objeto `{ data }`, conforme o caminho (Análise ou Ajuste), e o modelo é persistido em `sessionStorage` junto com os dias. A janela do relatório (`60-relatorios.js`) calcula os nomes visíveis aplicando o filtro por indicador e, opcionalmente, o extremo mín/máx, e já tem o padrão de janela auxiliar com botão de cópia na janela de log (`05-log.js`). Ver `proposal.md` para a motivação.

## Goals / Non-Goals

**Goals:**
- Gerar o texto a partir do modelo por funções puras, testáveis sem DOM.
- Garantir que a tabela e a exportação usem exatamente a mesma lista de nomes visíveis.
- Não acrescentar módulo nem mudar a ordem de carregamento.

**Non-Goals:**
- Não alterar o detector, a Análise, o Ajuste ou o formato guardado no modelo.
- Não exportar para arquivo, planilha ou outro formato além do texto.
- Não restringir as linhas de um funcionário ao tipo do filtro ativo; o filtro escolhe quem aparece, não o que é dito sobre cada um.

## Decisions

**1. Texto no modelo, janela na camada de relatório.** `27-modelo-relatorio.js` ganha uma função que devolve o texto de um funcionário (ou vazio quando não há o que dizer) e outra que monta o texto do time a partir de uma lista de nomes, de um título e de uma indicação de filtro. A regra de quem entra (processado, não vazio e com alguma irregularidade) fica só aí.
Alternativa descartada: montar o texto dentro de `60-relatorios.js`. Misturaria regra e DOM e dificultaria testar os cenários da spec.

**2. Uma só lista de nomes visíveis.** Extrair, em `60-relatorios.js`, a lista hoje calculada dentro da atualização da tabela (filtro por indicador, depois extremo ou ordenação) para uma função usada pela tabela e pela exportação. Assim "o que está na tabela" e "o que é exportado" não divergem.
Alternativa descartada: recalcular o filtro na exportação. Duplicaria a regra e poderia divergir quando surgirem novos filtros.

**3. Datas normalizadas na geração.** Cada irregularidade aceita data em texto ou `{ data }`, converte para ano, mês e dia, remove repetidas, ordena cronologicamente e escreve `dd/mm`. Datas que não puderem ser interpretadas são mantidas como estão, ao final, para não perder informação. Britânicas podem trazer o mesmo dia na entrada e na saída, por isso a remoção de repetidas.

**4. Ícone copia direto; o time abre janela.** O ícone por linha serve ao fluxo "copiar esta pessoa e colar", então copia sem janela e confirma no próprio ícone. O botão do time abre janela porque o texto pode ser longo e o usuário quer conferir antes de copiar. Se a área de transferência falhar no ícone, o aviso segue o padrão do `Copiar TSV` já existente.

**5. Janela de exportação no padrão do log.** Janela própria (`fpw-irregularidades`), reutilizada se já aberta, com barra superior, texto selecionável em `pre`, botão Copiar tudo com confirmação por 2 s e horário de geração fora do texto copiado. Retrato do momento: não atualiza sozinha; acionar o botão novamente regenera. A cópia usa a API de área de transferência com recurso alternativo por `execCommand`, como a janela de log, em um auxiliar local, sem acoplar `60-relatorios.js` a funções privadas de `05-log.js`.
Alternativa descartada: janela que se atualiza ao vivo. Exportação costuma ser feita no fim, e o texto mudando enquanto o usuário seleciona ou lê seria ruim.

**6. Título e filtro.** Título `*Irregularidades – <mês>`, acrescido de ` – <rótulo do filtro>` quando houver filtro por indicador, com o mesmo rótulo exibido nos indicadores (por exemplo, Marc. Britânicas). O extremo mín/máx restringe os nomes, mas não entra no título.

**7. Sem novo módulo e sem nova versão.** Tudo cabe em `27` e `60`, então `99-main.user.js` não muda e a instalação Tampermonkey de teste não precisa ser atualizada; recarregar o MyWay basta.

**8. Nome sem o identificador do seletor.** Antes de compor a primeira linha do texto, remover apenas o sufixo final formado por espaços e dígitos (`\s+\d+$`), o mesmo sufixo que a tabela já omite visualmente. Números internos ao nome são mantidos. O nome original segue como chave do modelo e como valor usado na navegação da tabela.

## Risks / Trade-offs

- **[Contagem sem datas em algum caminho de leitura]** → Há caminhos em que o modelo recebe a contagem sem a lista de dias. A spec exige manter a linha informando a quantidade e que as datas não estão disponíveis, e os testes cobrem Análise e Ajuste para garantir que os dias chegam ao modelo nos fluxos normais.
- **[Clipboard exige gesto do usuário]** → A cópia só funciona em resposta a clique. Os dois pontos de cópia são acionados por clique; na validação por MCP, a cópia fica a cargo do usuário.
- **[Texto parcial durante uma execução]** → Exportar no meio da Análise ou do Ajuste exporta só o já processado. É intencional e a janela mostra o horário de geração; o texto não traz aviso embutido para não poluir o que será colado.
- **[Auxiliar de cópia duplicado]** → Existe lógica parecida em `05-log.js`. Preferimos duplicar um trecho pequeno a criar acoplamento entre módulos; pode ser unificado depois, se um terceiro uso aparecer.
