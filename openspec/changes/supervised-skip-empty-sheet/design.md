# Design

## Context

Em `65-supervisionado.js`, o botão `btn-proxima` nasce oculto e só é exibido ao fim de uma aplicação concluída. Para folha vazia, `btn-aplicar` nasce desabilitado, então não existe caminho para avançar. O avanço já existe (`AF.core.avancarFuncionario`) e relê a pré-análise; só falta exibi-lo.

## Decisions

- Centralizar a visibilidade dos botões em uma função única, chamada na abertura da janela e após cada avanço: folha vazia mostra "Próxima folha" e oculta (e desabilita) "Aplicar"; folha com marcações mostra "Aplicar" e oculta "Próxima".
- Reutilizar o handler de "Próxima folha" existente, sem novo fluxo de avanço. O registro no log da folha pulada usa `AF.core.log`, como o modo automático já faz com "Sem marcacoes, pulando.".
- Não registrar a folha vazia no modelo do relatório: o modo Supervisionado atua folha a folha e o relatório continua refletindo só ajustes aplicados.

## Risks / Trade-offs

- Avançar em folhas vazias consecutivas exige um clique por folha. Aceito para manter a decisão do usuário sobre cada folha; pular automaticamente alteraria o contrato do modo.
