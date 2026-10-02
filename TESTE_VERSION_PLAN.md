# Plano de versão de teste e remodulação

## Objetivo

Esta etapa prepara a linha experimental do projeto para validar uma nova identidade e arquitetura sem mexer no uso real da base atual.

A ideia central é separar claramente:

- app atual: produção / referência funcional
- branch `test`: laboratório e testes de evolução
- remodulação: reorganização técnica da arquitetura principal
- identificação experimental: sem alterar o nome oficial do app

---

## 1. Branch de trabalho

A linha de trabalho experimental será criada com foco em migração e testes de compatibilidade, sem interromper a base principal.

Branch sugerida:

- `test`

Essa branch deve ser usada para:

- revisar o nome do aplicativo;
- preparar a nova marca e painel;
- validar a arquitetura e documentação da nova versão;
- testar o comportamento do userscript em ambiente controlado.

---

## 2. Projeto de teste

A branch `test` deve funcionar como ambiente isolado para experimentar evoluções com segurança, sem redefinir o nome oficial do app.

### Funções desse projeto

- testar o novo nome e branding;
- validar alterações de UI e fluxo;
- testar estrutura de módulos e camada de domínio;
- manter a base atual como referência estável;
- preparar um ambiente de integração mais previsível antes da migração definitiva.

### Estrutura sugerida

```text
app-fpw/
├── README.md
├── package.json
├── userscript/
│   ├── app-fpw.user.js
│   ├── core/
│   ├── domain/
│   ├── page/
│   ├── ui/
│   └── reports/
├── docs/
│   ├── PAGE_STRUCTURE.md
│   ├── AGENT.md
│   └── ROADMAP.md
├── tests/
│   ├── unit/
│   └── smoke/
└── .gitignore
```

---

## 3. Nome da nova versão

A linha experimental deve ficar claramente marcada como `test`, sem redefinir o nome principal do aplicativo.

### Aplicação do rótulo

- `@name` do userscript em versão de teste
- painel visual com identificação de ambiente
- documentação interna
- referência de código e processo de manutenção
- possíveis logs e mensagens internas

---

## 4. Documento de página e agente

### Page Structure

O documento técnico da página deve continuar descrevendo as regras do WebPonto e o comportamento do DOM, incluindo:

- estrutura de frames;
- campos e seletores; 
- observações de layout e comportamento;
- ações automáticas e pontos de risco;
- regras para paginações, filtros e popups.

### AGENT.md

O guia do agente deve complementar essa documentação explicando:

- como o agente deve operar sobre as páginas;
- como lidar com estados inesperados;
- como agir diante de popups, frames e mudanças de contexto;
- guardrails de segurança;
- regras de interromper, revalidar e não agir sobre dados sensíveis sem necessidade.

---

## 5. Roteiro da execução

### Fase 1: base estável

- preservar a linha atual em uso real;
- registrar o estado funcional atual;
- usar como referência de comparação.

### Fase 2: laboratório de testes

- usar a branch `test` como ambiente isolado;
- validar a arquitetura experimental e a nova estrutura;
- confirmar que o nome oficial do produto permanece inalterado.

### Fase 3: remodulação

- separar domínio, execução e interface;
- reduzir acoplamento com o DOM;
- preparar o código para testes e manutenção mais confiáveis.

### Fase 4: promoção

- revisar o escopo;
- validar a compatibilidade;
- promover a linha mais madura para produção.

---

## 6. Checklist de preparação

- [ ] criar branch de teste
- [ ] separar projeto paralelo de teste
- [ ] identificar a linha experimental apenas como `test`
- [ ] refinar documentação de Page Structure
- [ ] criar guia de agente
- [ ] iniciar remodulação em ambiente controlado
- [ ] validar com Tampermonkey em ambiente de teste
- [ ] revisar e prometer para produção

---

## 7. Observação importante

A remoção do acoplamento com o DOM e a má qualidade da arquitetura do script atual não devem ser tratadas como "mudança estética". Elas são a base para que o projeto deixe de ser apenas um script improvisado e passe a ser uma automação mais previsível, testável e sustentável.
