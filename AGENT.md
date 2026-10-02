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

## Atualização da versão de teste no Tampermonkey

Quando houver alteração em `99-main.user.js` e for necessário atualizar a instalação de teste:

1. Confirmar que a alteração foi commitada e publicada na branch `test`.
2. Abrir no Chrome a URL raw da entrada de teste: `https://raw.githubusercontent.com/r4cs0u/app-fpw/test/99-main.user.js`.
3. Na página do Tampermonkey, clicar em **Instalar** para aplicar a versão publicada. Não basta atualizar o MyWay antes desta etapa.
4. Depois da instalação, atualizar a página do MyWay/Justificativas e confirmar a versão de teste no runtime.

Manter a instalação `main` separada; não instalar a URL da branch `main` durante a atualização experimental.

## Recuperação após expiração do MyWay

Se o MyWay apresentar a mensagem de sessão expirada:

1. Fechar a página/aba expirada. O MCP pode não conseguir dispensar a mensagem, então não insistir em interagir com a tela bloqueada.
2. Abrir a página do Oracle Fusion e clicar em **Ponto FPW**.
3. Na página FPW recém-aberta, navegar pelo menu **Lançamentos** > **Justificativas**.
4. Aguardar a página terminar de carregar e só então validar o runtime do userscript e o painel.

Não tentar reautenticar por requisições do userscript nem retomar automações sobre uma página expirada.
