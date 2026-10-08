## Context

Os sons ficam em `70-sons.js` (`AF.sons.tocar(tipo)` com catálogo `inicio`, `fim`, `copia`, `parada`) e são acionados de quatro pontos: `analisarTodas` e `processarTodas` (início e fim), o botão Parar e o botão Relatório em `80-painel.js`. Observado no código:

- O botão Parar já fica desabilitado sem execução (`setBtnAtivo`); a regra "só com execução" protege contra clique programático e fixa o contrato em teste.
- Todas as interrupções por erro do Ajuste, inclusive `exigirEstrutura`, passam por `AF.core.pararExecucaoAjuste` com `status` diferente de `cancelled`; a parada do usuário passa pelo mesmo ponto com `status: 'cancelled'` e `stage: 'user-stop'`.
- A Análise não usa `pararExecucaoAjuste`; seu único caminho de erro hoje é a lista de funcionários ausente, que apenas registra o erro.
- Os testes existentes substituem `AF.sons` por `{ tocar() {} }`.

Ver proposal.md para a motivação e specs/run-sounds/spec.md para o contrato.

## Goals / Non-Goals

**Goals:**
- Acionar cada som no ponto que corresponde ao desfecho real da execução.
- Manter um ponto único de decisão para o som de falha do Ajuste.
- Testar por chamadas registradas, sem áudio real.

**Non-Goals:**
- Não mudar as notas dos sons de início, conclusão e parada.
- Não adicionar configuração de volume nem opção de silenciar.
- Não alterar a lógica de Análise e Ajuste, a gravação, os popups ou a mensagem de status do painel.
- Não corrigir o estado `rodando` da Análise quando a lista de funcionários não é encontrada (comportamento anterior, fora do escopo; registrado como observação em Risks).

## Decisions

**1. O som de falha toca em `pararExecucaoAjuste`, quando `outcome.status !== 'cancelled'`.**
É o ponto único por onde passam falhas de pré-condição, de espera, de gravação e erros inesperados. Alternativa descartada: tocar em cada chamador; espalharia a regra e deixaria casos sem som.

**2. O som só toca se a execução ainda estava ativa na entrada de `pararExecucaoAjuste`.**
Garante um único desfecho: um erro depois de uma parada do usuário (execução já cancelada) não toca falha. Alternativa: usar `AF.estado.cancelado`; ele já é `true` em `exigirEstrutura` antes da chamada, o que silenciaria a falha de pré-condição.

**3. A parada do usuário continua tocando no clique do botão Parar, protegida por `AF.estado.rodando`.**
Já é o comportamento atual, só falta a proteção. Alternativa: tocar dentro de `pararExecucaoAjuste` com `stage: 'user-stop'`; não cobre a Análise, que não usa esse caminho.

**4. `inicio` do Ajuste passa a tocar logo depois de `exigirEstrutura('inicio do ajuste', ...)` bem-sucedido; o da Análise, depois de localizada a lista de funcionários.**
Torna "início" sinônimo de "a execução foi aceita". O atraso é de milissegundos, sem efeito perceptível. Alternativa: manter no começo e tocar falha depois; o usuário ouviria início seguido de falha.

**5. A Análise toca `falha` no ramo de lista ausente.**
Hoje esse ramo registra o erro e não toca nada; passa a tocar o som de falha uma vez, sem tocar início.

**6. Remover `copia` do catálogo e o atraso de 900 ms de `fim`.**
O atraso existia só para não sobrepor `copia`. Com `copia` removido, `fim` toca sem deslocamento. O comentário que explica o atraso também sai.

**7. Novo som `falha`: duas notas descendentes graves em onda `square`, claramente distintas de `parada` (sine, 700 para 550 Hz).**
Exemplo: 330 Hz (0,15 s), 220 Hz (0,35 s), volume 0,22. Os valores exatos são ajustáveis na implementação; o requisito é ser audivelmente diferente de `parada`.

**8. Teste por chamadas registradas.**
Os testes injetam um `AF.sons.tocar` que acumula os tipos e verificam a sequência por cenário. Para o catálogo, um teste simples garante que `copia` não existe e que `falha` existe, usando um `AudioContext` simulado.

## Risks / Trade-offs

- [Mover `inicio` para depois das pré-condições muda a ordem em relação a logs e ao primeiro quadro do painel] → o som só sinaliza aceitação; a ordem do log e do status não muda.
- [`rodando` pode ficar `true` na Análise quando a lista não é encontrada, o que mantém o keepalive pausado] → observação de comportamento anterior, não alterada aqui; se confirmada, vira correção separada.
- [Som de falha ser confundido com parada] → tom, forma de onda e duração diferentes; ajuste fino em validação manual.
- [Autoplay do navegador pode suspender o `AudioContext`] → já tratado por `resume()` no catálogo; a falha de som continua silenciosa e nunca interrompe a automação.

## Migration Plan

Mudança só na branch `test`; sem migração de dados. Reverter é restaurar `70-sons.js` e os pontos de chamada. Validação manual na branch `test`: ouvir início, conclusão, parada e falha em Análise e Ajuste (a falha pode ser provocada com o Ajuste em uma página fora da estrutura esperada, sem gravação).
