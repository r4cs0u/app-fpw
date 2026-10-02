# AGENT.md

## Objetivo

Este repositório contém a base funcional do userscript para automação da folha de ponto do WebPonto/MyWay. O agente deve atuar com foco em análise confiável, ação controlada e documentação precisa, sem comprometer o uso real do sistema.

## Guardrails principais

- Manter a linha estável como referência de operação real.
- Tratar a linha experimental como ambiente de validação e evolução controlada.
- Nunca assumir que a estrutura do DOM é estável entre páginas ou períodos.
- Respeitar o contrato de página em `PAGE_STRUCTURE.md` antes de aplicar qualquer alteração.
- Não gravar, aprovar, confirmar nem enviar ações de alteração sem supervisão humana explícita.
- Quando um seletor falhar, interromper e documentar a condição antes de seguir adiante.
- Evitar manipulações em páginas fora do contexto esperado do WebPonto.
- Registrar mudanças importantes no roadmap e nos documentos de projeto.

## Regras de automação

1. Resolver a estrutura da página a partir do `window.top` e dos frames em uso, em vez de reutilizar documentos antigos.
2. Esperar o carregamento completo do frame relevante antes de tentar interagir com a interface.
3. Não depender de contagens de linhas ou de elementos fixos como sinal de prontidão.
4. Sempre respeitar campos de edição e ações de gravação como operações write-sensitive.
5. Tratar a interface como sensível: o script pode operar em dados reais e deve priorizar segurança e previsibilidade.

## Condições de parada

- página de destino não carregou no contexto esperado;
- seletor principal não foi encontrado;
- popup ou frame de ação não corresponde ao modelo documentado;
- há risco de alterar dados sem validação humana;
- a automação não consegue garantir que está no contexto correto.

Qualquer uma dessas condições deve levar a uma pausa e a uma revisão do fluxo antes de continuar.
