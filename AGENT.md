# AGENT.md

## Objetivo

Este repositório contém a base funcional do userscript para automação da folha de ponto do WebPonto/MyWay. O agente deve atuar com foco em análise confiável, ação controlada e documentação precisa, sem comprometer o uso real do sistema.

## Guardrails principais

- Manter a linha estável como referência de operação real.
- Tratar a linha experimental como ambiente de validação e evolução controlada.
- Nunca assumir que a estrutura do DOM é estável entre páginas ou períodos.
- A lista de funcionários é específica do usuário e pode variar em nomes, IDs, quantidade e ordem. Nunca fixar ou presumir um funcionário, identificador, quantidade ou conteúdo de lista; usar somente as opções presentes no seletor da sessão atual.
- Respeitar o contrato de página em `PAGE_STRUCTURE.md` antes de aplicar qualquer alteração.
- Não gravar, aprovar, confirmar nem enviar ações de alteração sem supervisão humana explícita.
- Quando um seletor falhar, interromper e documentar a condição antes de seguir adiante.
- Evitar manipulações em páginas fora do contexto esperado do WebPonto.
- Registrar mudanças importantes no roadmap e nos documentos de projeto.

## Operações de navegador via MCP

- Quando o usuário pedir uma atuação no navegador via MCP, planejar o fluxo relacionado como uma única sequência MCP sempre que tecnicamente possível: localizar ou abrir a aba, navegar, inspecionar, executar somente as ações autorizadas e capturar o resultado. Evitar dividir uma mesma atuação em chamadas pequenas que provoquem novos pedidos de permissão.
- Agrupar as etapas não amplia a autorização: antes de qualquer ação que possa alterar dados, deixar claro o efeito esperado e respeitar o escopo autorizado. Não clicar em aprovação final sem autorização explícita.
- Inspeção da folha é somente leitura: informar o `pageId` em cada chamada de `evaluate_script`, ler o frame do corpo a partir do `window.top` e devolver JSON estruturado em uma única sequência (listar páginas, escolher a aba da Justificativa e extrair). Não colar nomes de funcionários em documentação ou testes versionados nem manter arquivos temporários com dados da folha; apagar qualquer arquivo temporário ao terminar. Fixtures de teste devem ser sintéticos, derivados da estrutura observada.
- **Execução do MCP quando não exposto diretamente no chat:** se o servidor `chrome-devtools` estiver configurado em `mcp.json` (`npx chrome-devtools-mcp@latest --autoConnect`), mas suas ferramentas não estiverem disponíveis nativamente no assistente, é possível executar um script pontual em Node.js conversando com o processo via stdio JSON-RPC (`initialize`, `tools/call` com `list_pages` e `evaluate_script`). O script e arquivos intermediários devem ser removidos imediatamente após a captura dos dados agregados.

## Investigar falhas comparando com `main`

- Quando uma funcionalidade falhar na branch experimental e o usuário indicar que ela funciona em `main`, tratar o fluxo correspondente em `main` como referência funcional comprovada antes de propor ou implementar uma solução.
- Antes de mudar código, comparar o mesmo caminho entre `test` e `main`: sequência de ações, seleção inicial, transições de frame, sinais de prontidão, esperas de compatibilidade e condições de parada. Reproduzir a falha com o menor risco possível e identificar exatamente onde o comportamento diverge.
- Preservar o fluxo existente de `main` e adaptar somente o necessário para atender às proteções da branch experimental. Não reescrever do zero, remover esperas ou substituir sinais de prontidão por suposições sem evidência.
- Se o motivo de uma decisão existente em `main` não estiver claro, perguntar ao usuário antes de alterar ou substituir essa decisão.
- Cobrir a regressão com testes que mantenham o comportamento funcional de referência e as novas condições de segurança.

## Regras de automação

1. Resolver a estrutura da página a partir do `window.top` e dos frames em uso, em vez de reutilizar documentos antigos.
2. Esperar o carregamento completo do frame relevante antes de tentar interagir com a interface.
3. Não depender de contagens de linhas, funcionários ou de elementos fixos como sinal de prontidão.
4. Sempre respeitar campos de edição e ações de gravação como operações write-sensitive.
5. Tratar a interface como sensível: o script pode operar em dados reais e deve priorizar segurança e previsibilidade.
6. Tratar temporizadores de espera como limites de segurança e compatibilidade, não como previsão fixa da resposta do FPW; só evidência observada permite continuar.
7. Detectar irregularidades e marcações lendo os `value` dos campos (`Marc1N`, `Marc2N`, `IrreN`, `CodJustN`) e o cabeçalho do dia. Nunca usar o `innerText` das linhas de marcação como evidência: ele inclui os textos das opções da lista de justificativas (por exemplo, uma opção de interjornada).
8. No modo Supervisionado, o ajuste é executado exclusivamente folha a folha mediante confirmação humana prévia em janela dedicada, revalidando a folha e o funcionário selecionado antes de qualquer alteração ou gravação.

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

## Atualização de teste e validação no MyWay

Antes de validar uma mudança, verificar se o diff commitado inclui `99-main.user.js`. Esse arquivo carrega os módulos diretamente da branch remota `test`; por isso, mudanças apenas nos módulos não exigem atualizar a instalação Tampermonkey, mas precisam estar publicadas na branch remota antes de recarregar o MyWay.

- **Quando `99-main.user.js` mudou** (por exemplo, inclusão do `@match` de `https://elny.fa.la1.oraclecloud.com/*` e concessões `GM_setValue`, `GM_getValue`, `GM_addValueChangeListener`): publicar a alteração na branch `test`, abrir no Chrome `https://github.com/r4cs0u/app-fpw/raw/refs/heads/test/99-main.user.js` para atualizar a instalação experimental no Tampermonkey e aguardar a confirmação explícita do usuário antes de recarregar o MyWay/Justificativas.
- **Quando `99-main.user.js` não mudou:** não atualizar nem reinstalar o Tampermonkey. Publicar o commit na branch `test`, aguardar brevemente a propagação dos módulos remotos e então recarregar o MyWay/Justificativas para validar a versão atualizada.

Em ambos os caminhos, confirmar no runtime a versão de teste, a disponibilidade dos módulos, a estrutura suportada da página e a inicialização do painel. Essa validação deve ser somente de leitura: não executar **Ajustar**, gravar nem aprovar. Manter a instalação `main` separada; não instalar a URL da branch `main` durante a validação experimental.

## Recuperação após expiração do MyWay

Se o MyWay apresentar a mensagem de sessão expirada:

1. Fechar a página/aba expirada. O MCP pode não conseguir dispensar a mensagem, então não insistir em interagir com a tela bloqueada.
2. Abrir a página do Oracle Fusion e clicar em **Ponto FPW**.
3. Na página FPW recém-aberta, navegar pelo menu **Lançamentos** > **Justificativas**.
4. Aguardar a página terminar de carregar e só então validar o runtime do userscript e o painel.

Não tentar reautenticar por requisições do userscript nem retomar automações sobre uma página expirada.
