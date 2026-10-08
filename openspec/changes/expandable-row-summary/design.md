## Context

O relatório em `60-relatorios.js` renderiza a tabela principal da equipe. Cada linha possui o botão da lupa (🔍) que hoje chama `AF.modelo.textoDetalheAjuste(nome)` para preencher o bloco expansível `<pre class="detail-box">`. Esse gerador foi projetado em `report-row-adjustment-detail` e foca em folgas movimentadas, presas e códigos 47.
Além disso, a função `AF.modelo.textoIrregularidades(nome)` possui uma condicional `if (f.naoPreenchida.sinalizada) ... else ...` que suprime as demais irregularidades se a folha estiver não preenchida.

## Goals / Non-Goals

**Goals:**
- Enriquecer a visualização expandida (🔍) para exibir de forma clara e compacta tanto os ajustes quanto os detalhes das irregularidades presentes nas colunas da linha.
- Remover a supressão de irregularidades em `textoIrregularidades`, exibindo sempre o conjunto completo.
- Habilitar o botão 🔍 caso haja ajustes OU irregularidades registradas para o funcionário.

**Non-Goals:**
- Não alterar as regras de detecção de irregularidades ou cálculo de folgas.
- Não alterar a tabela agregada de cards superiores do relatório.

## Decisions

1. **Estrutura do texto expandido (`AF.modelo.textoDetalheAjuste` ou `textoDetalheLinha`)**:
   - Manter o cabeçalho com o nome do funcionário: `NOME`.
   - Se houver ajustes:
     - `|_Folgas movimentadas` (linhas `dest <- origem => status`)
     - `|_Folgas Presas` (`|_Dias: ...`)
     - `|_Códigos 47` (`|_ Dias: ...`, `|_ Restantes: ...`)
   - Se houver irregularidades:
     - `|_Sem Entrada/Saída` (`|_Dias: ...`)
     - `|_Interjornada` (`|_Dias: ...`)
     - `|_Marcações Britânicas` (`|_Dias: ...`)
     - `|_Folha Não Preenchida` (`|_Percentual: X%`)
   - Se não houver nenhum dado registrado: `|_Nenhum detalhe registrado`.

2. **Remoção da supressão em `textoIrregularidades`**:
   - Se `f.naoPreenchida.sinalizada`, adiciona a linha de aviso de preenchimento.
   - E em seguida, independentemente disso, avalia e inclui as linhas de Sem E/S, Interjornada e Britânicas se existirem ocorrências.

3. **Habilitação do botão 🔍 na interface (`60-relatorios.js`)**:
   - O botão fica habilitado se `d.temAjuste` for verdadeiro OU se houver qualquer irregularidade (`d.semES.total > 0 || d.interj.total > 0 || d.britanica.total > 0 || d.naoPreenchida.sinalizada`).
