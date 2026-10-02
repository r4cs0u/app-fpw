# Roadmap e Evolução do Projeto

## Visão geral

Este documento reúne a visão de evolução do projeto, os próximos passos, as decisões de arquitetura e o mapeamento das atuações relevantes para manter o produto organizado ao longo da remodularização e do crescimento do ecossistema de automação.

Ele foi pensado para funcionar como um registro de trabalho em evolução, seguindo a lógica de acompanhamento do OpenSpec: cada decisão, mudança e proposta será registrada aqui para não se perder no processo.

---

## 1. Contexto do projeto

O projeto atual é um userscript para automação da folha de ponto no sistema WebPonto/MyWay da Globo. Sua finalidade principal é analisar a folha, detectar pendências e ajustar automaticamente itens recorrentes do ponto, com foco em diminuir o esforço manual e acelerar a revisão das marcações.

O aplicativo já possui uma base funcional com:

- painel visual embutido na página;
- análise de irregularidades;
- contabilização de folgas, interjornadas, horas extras e código 47;
- execução de ajustes automáticos;
- geração de relatórios;
- acompanhamento visual do processo.

Ao mesmo tempo, o código ainda está fortemente acoplado à estrutura do DOM da página e depende de interações específicas com frames, popups e elementos HTML da interface do sistema externo.

---

## 2. Estado atual

### 2.1. O que está funcional

- automação de análise da folha atual;
- ajuste de folgas e movimentações relevantes;
- visualização de status no painel;
- logs e relatórios para acompanhamento;
- integração com o ambiente WebPonto via manipulação de DOM e comportamento do sistema.

### 2.2. O que exige atenção

- acoplamento forte ao HTML e ao comportamento interno do sistema externo;
- uso de polling e intervalos para espera de estado;
- lógica distribuída entre múltiplos módulos sem uma camada clara de regras de negócio;
- pouca observabilidade em nível de execução e estado;
- necessidade de uma arquitetura mais previsível para evoluir sem quebrar a automação.

### 2.3. Riscos conhecidos

- mudanças na estrutura do sistema WebPonto podem quebrar o script;
- falhas silenciosas em seletores e eventos podem gerar ajustes incorretos;
- lógica muito dependente de DOM torna testes automatizados mais difíceis;
- a automatização precisa continuar com supervisão humana para evitar impactos em dados reais.

---

## 3. Objetivo da evolução

O objetivo principal não é apenas deixar o aplicativo mais bonito ou mais complexo, mas torná-lo mais robusto, previsível e escalável.

A jornada de evolução tem quatro pilares:

1. manter a operação atual estável;
2. criar uma versão de testes isolada;
3. remodular a arquitetura do aplicativo;
4. preparar a nova identidade e estrutura do produto.

---

## 4. Estrutura de evolução planejada

### 4.1. Versão estável atual

A versão atual do projeto continua sendo a base de uso real, com o nome original do app e a lógica funcional já validada para o dia a dia.

Objetivo:
- manter funcionamento confiável;
- registrar melhorias e correções sem interromper o uso real;
- preservar o código de referência para comparação.

### 4.2. Projeto paralelo para testes

Criaremos um outro projeto no GitHub, chamado de `app-fpw-teste`, com a mesma base de configuração do projeto atual, mas pensando em um ambiente segregado para experimentação.

Objetivo:
- permitir mudanças e testes sem afetar o app principal;
- versionar a nova linha em Tampermonkey;
- validar novas ideias, remodulações e refatorações antes de aplicar ao app principal;
- servir como laboratório de evolução.

### 4.3. Remodulação do aplicativo principal

Após a fase de testes e validação, o app principal será remodulado para:

- separar regras de negócio da manipulação do DOM;
- centralizar o estado e a execução;
- reduzir acoplamento com HTML específico;
- criar um modelo mais observável para execução;
- facilitar testes e manutenção.

### 4.4. Identidade da linha de teste

A linha experimental deve permanecer claramente identificada como branch de teste, sem redefinir o nome oficial do aplicativo principal.

Essa diferenciação deve ser aplicada na nova versão de validação para distinguir a linha experimental da base estável do produto.

---

## 5. Proposta de atuação por área

### 5.1. Produto e UX

- definir melhor a proposta do userscript para o usuário final;
- deixar o painel mais claro e didático;
- reduzir ruído visual e melhorar a compreensão do fluxo de execução;
- padronizar mensagens e estados no painel;
- facilitar a compreensão de quando o usuário deve agir manualmente.

### 5.2. Arquitetura e qualidade de software

- separar regras de negócio da camada de interface;
- reduzir manipulação direta de DOM em módulos centrais;
- criar modelos de execução mais robustos;
- adotar abordagem de estados e observabilidade;
- preparar a base para testes automatizados.

### 5.3. Automação e execução

- melhorar o gerenciamento de popups e interações de janela;
- padronizar esperas e retries;
- reduzir risco de ações em páginas inesperadas;
- separar tarefas de leitura, ajuste, revisão e gravação.

### 5.4. Documentação e conhecimento

- manter um registro claro de regras da página;
- documentar estrutura do WebPonto e os pontos críticos de automação;
- mapear os módulos e seus papéis;
- preservar o histórico de decisões e evoluções no código e na documentação.

---

## 6. Estrutura documental recomendada

### 6.1. Page Structure

O arquivo `PAGE_STRUCTURE.md` deve continuar sendo a base técnica para registrar o mapeamento da página do WebPonto e todas as observações relevantes sobre:

- frames;
- formulários;
- selects e inputs relevantes;
- estrutura do corpo da página;
- ações auxiliares;
- regras de navegação e segurança;
- observações de comportamento do sistema externo.

Esse documento é o contrato técnico de interface do app com a página alvo.

### 6.2. Agent guide / AGENT.md

O arquivo `AGENT.md` deve funcionar como guia de comportamento para agentes que atuarem no projeto, incluindo:

- o objetivo do agente;
- limites e convenções de automação;
- regras de interação com a interface;
- guardrails diante de mudanças na página;
- como lidar com páginas vazias, popups e estados inesperados;
- boas práticas de execução segura e supervisão humana.

Esse documento complementa o `PAGE_STRUCTURE.md`: enquanto o primeiro informa "o que existe na página", o segundo informa "como o agente deve agir sobre ela".

### 6.3. Documento de roadmap/ evolução

Este arquivo (`ROADMAP.md`) serve como registro central de evolução e acompanhamento do projeto:

- objetivos;
- decisões de arquitetura;
- status geral;
- passos em execução;
- próximos trabalhos;
- riscos e pendências.

Ele funciona como a linha de tempo do projeto e guia de manutenção do produto.

---

## 7. Proposta de trabalho em sequência

### Fase 1 — estabilizar a visão

- consolidar o objetivo atual do app;
- registrar a arquitetura funcional atual;
- definir a linha de produto da nova versão.

### Fase 2 — separar uma versão teste

- criar o repositório `app-fpw-teste`;
- manter a mesma base conceitual de configuração;
- versionar em Tampermonkey;
- validar a nova linha sem afetar o app principal.

### Fase 3 — remodularização

- separar camada de dados e regras;
- organizar estados e execução;
- reduzir dependência do DOM;
- preparar a base para testes.

### Fase 4 — validação da linha de teste

- identificar claramente a branch test;
- ajustar nomenclatura do userscript para versões de teste;
- revisar painel e mensagens;
- consolidar a versão mais madura.

### Fase 5 — maturidade operacional

- testes automatizados;
- documentação mais forte;
- padrões de código e guardrails;
- evolução contínua com rastreabilidade.

---

## 8. Principais decisões a registrar

### Decisão 1: manter a base atual estável
A base funcional atual deve continuar como referência e backup operacional, enquanto as evoluções são testadas em separado.

### Decisão 2: criar o ambiente `app-fpw-teste`
O projeto paralelo será usado como laboratório de validação, com versionamento no Tampermonkey para permitir mudanças em um contexto controlado.

### Decisão 3: normalizar a arquitetura
A remodulação deve seguir a lógica de separar domínio, execução e interface, em vez de manter tudo acoplado ao DOM.

### Decisão 4: usar `Page Structure` + `Agent Guide` como documentação complementar
Esses documentos devem ser mantidos em conjunto para descrever tanto a estrutura da página quanto as regras de operação do agente.

### Decisão 5: identificação da linha experimental
A linha experimental deve ser identificada apenas como branch `test`, sem redefinir o nome oficial do aplicativo principal.

---

## 9. Próximos passos sugeridos

1. Criar o documento de roadmap e evolução em formato de acompanhamento.
2. Separar a arquitetura do projeto em documentos temáticos.
3. Criar o repositório `app-fpw-teste` como ambiente de teste controlado.
4. Definir a base da nova versão como branch `test`.
5. Iniciar a remodulação arquitetural depois da validação da versão teste.

---

## 10. Conclusão

O projeto já tem uma base funcional interessante e com utilidade prática clara. O que falta agora é transformar essa base em uma estrutura mais sustentável, observável e segura, sem perder a produtividade do que já funciona.

A ideia de separar o projeto em três níveis — base estável, teste e remodulação — parece a melhor forma de evoluir de maneira inteligente: preservar o que funciona, experimentar sem risco e preparar a próxima geração do app com mais qualidade e menor fragilidade.

---

## 11. Checklist de evolução

- [ ] registrar visão e roadmap
- [ ] separar documentação técnica e operacional
- [ ] criar projeto paralelo `app-fpw-teste`
- [ ] versionar a nova linha em Tampermonkey
- [ ] identificar a linha experimental somente como `test`
- [ ] mapear componentes e responsabilidades
- [ ] remodular arquitetura principal
- [ ] adicionar documentação de agente e estrutura da página
- [ ] preparar testes e guardrails
- [ ] revisar mudanças antes de promoção para produção
