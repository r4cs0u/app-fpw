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
6. Tratar temporizadores de espera como limites de segurança e compatibilidade, não como previsão fixa da resposta do FPW; só evidência observada permite continuar.

## Condições de parada

- página de destino não carregou no contexto esperado;
- seletor principal não foi encontrado;
- popup ou frame de ação não corresponde ao modelo documentado;
- um prazo de prontidão ou confirmação termina sem evidência suficiente; não repetir automaticamente o envio nem converter o tempo decorrido em sucesso;
- uma parada manual ou falha deve encerrar a execução atual, limpar seus temporizadores, observadores e interceptores e impedir callbacks antigos de agir após um reinício;
- há risco de alterar dados sem validação humana;
- a automação não consegue garantir que está no contexto correto.

Qualquer uma dessas condições deve levar a uma pausa e a uma revisão do fluxo antes de continuar.

Ao interromper um ajuste, preservar no diagnóstico a etapa e o motivo, identificar explicitamente qualquer gravação cujo resultado não foi confirmado e disponibilizar um relatório parcial. Somente folhas concluídas entram como processadas; alterações confirmadas antes da interrupção podem constar como parciais. A interface não comprova persistência no servidor e a interrupção não significa rollback.

## Atualização da versão de teste no Tampermonkey

Quando houver alteração em `99-main.user.js` e for necessário atualizar a instalação de teste:

1. Confirmar que a alteração foi commitada e publicada na branch `test`.
2. Abrir no Chrome a URL da entrada de teste: `https://github.com/r4cs0u/app-fpw/raw/refs/heads/test/99-main.user.js`.
3. Depois da confirmação do usuário, atualizar a página do MyWay/Justificativas e confirmar no runtime que a versão de teste está carregada e, quando aplicável, verificar o módulo novo no console. A atualização do MyWay só deve ocorrer depois do sinal explícito do usuário.

Manter a instalação `main` separada; não instalar a URL da branch `main` durante a atualização experimental.

## Recuperação após expiração do MyWay

Se o MyWay apresentar a mensagem de sessão expirada:

1. Fechar a página/aba expirada. O MCP pode não conseguir dispensar a mensagem, então não insistir em interagir com a tela bloqueada.
2. Abrir a página do Oracle Fusion e clicar em **Ponto FPW**.
3. Na página FPW recém-aberta, navegar pelo menu **Lançamentos** > **Justificativas**.
4. Aguardar a página terminar de carregar e só então validar o runtime do userscript e o painel.

Não tentar reautenticar por requisições do userscript nem retomar automações sobre uma página expirada.
