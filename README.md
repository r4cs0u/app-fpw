# app-fpw

Este repositório contém o userscript para automatizar a análise e o ajuste da folha de ponto no sistema WebPonto/MyWay da Globo. Desenvolvido para facilitar o trabalho de revisão de marcações, ele injeta um painel direto na interface do sistema e permite executar ações de forma mais rápida, segura e organizada.

> Branch de teste: esta linha mantém a base estável do projeto e prepara a evolução experimental em ambiente controlado.

## Visão geral

O projeto foi pensado para reduzir o esforço manual na identificação e correção de inconsistências do ponto, como:

- folgas móveis e ausências que precisam ser ajustadas;
- marcações irregulares;
- interjornadas;
- códigos 47 e 48;
- horas extras e saldo de compensação;
- situações que exigem revisão e validação manual antes da aprovação final.

Ele não substitui a decisão final do usuário, mas ajuda a acelerar o fluxo de análise e automatizar os ajustes repetitivos.

## Funcionalidades principais

- Análise automatizada do mês em questão;
- Leitura da estrutura da folha de ponto diretamente na página do WebPonto;
- Detecção de irregularidades e itens pendentes com contagem de dias;
- Ajuste automático de folgas e deslocamentos de registros;
- Correção de ocorrências do código 47 para 48 quando aplicável;
- Relatório unificado ao vivo: sempre disponível, com frações de progresso, cores por estado e colunas abertas de irregularidade;
- Resumo em indicadores (big numbers) com filtros rápidos por clique;
- Exportação copiável das irregularidades por funcionário ou da lista visível no relatório, com datas em `dd/mm`;
- Janela de log estruturado acessível dentro e fora do relatório;
- Painel visual com botões para analisar, ajustar e acompanhar o status da execução;
- Log e notificações visuais para acompanhar o progresso da operação;
- Suporte a relatórios exportáveis (TSV) para revisão posterior.

## Como funciona

Ao acessar a página do WebPonto, o script carrega os módulos necessários e insere um painel lateral com ações rápidas. A partir daí, o usuário pode:

1. clicar em “Analisar” para revisar a folha atual e o conjunto de funcionários;
2. verificar os dados coletados em relatórios;
3. clicar em “Ajustar” para executar a correção automatizada de folgas e pendências;
4. revisar os resultados e confirmar manualmente as ações finais.

Na janela do relatório, o ícone no fim de cada linha copia as irregularidades daquele funcionário. O botão **Exportar irregularidades** abre o texto dos funcionários atualmente visíveis; portanto, filtros e extremos ativos também limitam a exportação. O texto lista todas as irregularidades de cada pessoa incluída, usa datas em `dd/mm` e pode ser copiado na própria janela.

## Benefícios

- reduz o tempo gasto em ajustes manuais repetitivos;
- centraliza análise e relatórios em um único painel;
- aumenta a consistência da revisão de folhas;
- facilita o acompanhamento de pendências por funcionário;
- ajuda na identificação de problemas que exigem atenção antes da aprovação.

## Observação

O projeto foi construído como automação de interface para um ambiente interno e assume uma rotina de uso com supervisão humana. A aprovação final das alterações continua sendo responsabilidade do usuário, que valida os resultados antes de concluir o processo.

## Testes locais

Com Node.js instalado, execute na raiz do repositório:

```sh
node --test
```

Os testes de regras usam dados sintéticos e não acessam o WebPonto, dados de funcionários, DOM, popups ou controles de gravação/aprovação.
