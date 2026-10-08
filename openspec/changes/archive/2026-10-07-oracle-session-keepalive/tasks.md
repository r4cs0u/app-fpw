# Tasks

## 1. Investigação somente leitura (via MCP)

- [x] 1.1 Com o responsável, abrir a página Oracle e, via MCP, apenas observar: requisições periódicas, cookies de sessão (somente nomes e atributos, sem valores), scripts de manutenção da sessão, comportamento ao ficar em segundo plano e ao ser fechada. Verificar com um registro das observações em `PAGE_STRUCTURE.md` (seção nova "Página Oracle"), sem identificadores, tokens, valores de cookies nem URLs completas com parâmetros.
- [x] 1.2 Determinar o sinal de "sessão viva" e o de "expirada", e se um sinal periódico basta ou se é necessária interação. Verificar com a conclusão escrita na mesma seção, indicando qual hipótese do design (aba com GM storage, requisição direta ou iframe) é viável e qual não é.
- [x] 1.3 Atualizar esta change com `/openspec-update-change`: ajustar spec, design e o grupo 2 conforme as conclusões. Verificar com `openspec validate oracle-session-keepalive --strict` e com o grupo 2 reescrito em tarefas específicas.

## 2. Implementação (hipótese preferida, a revisar depois do grupo 1)

- [x] 2.1 Criar a função pura de avaliação do estado da sessão Oracle (ativa, inativa, desconhecida, transição e aviso único por perda), com constantes de janela nomeadas e documentadas. Verificar em um novo `tests/sessao-oracle.test.js`: sem evidência é desconhecida, evidência recente é ativa, silêncio além da janela é inativa com transição, retorno limpa o aviso, e a perda gera uma única notificação.
- [x] 2.2 Em `99-main.user.js`, escolher o modo pelo domínio de execução (Oracle ou WebPonto), acrescentar o `@match` Oracle e as concessões necessárias, e carregar na origem Oracle apenas o módulo de sinalização. Verificar com `node --test` que o ponto de entrada não carrega módulos de automação quando a origem é Oracle (teste de decisão do modo com origens simuladas).
- [x] 2.3 Implementar o módulo de sinalização na página Oracle (liveness periódica e, se a investigação mostrar viável, manutenção não destrutiva) sem leitura de dados nem interação com formulários. Verificar em teste com ambiente simulado que o módulo não acessa formulários nem faz requisições além das previstas.
- [x] 2.4 Em `00-core.js` e `80-painel.js`, ler o sinal na aba do MyWay, expor o estado e o resultado observável, mostrar o indicador e o aviso no painel e registrar um evento de log por perda, sem parar a execução. Verificar em `tests/panel-status.test.js` e `tests/log.test.js`: indicador nos três estados, aviso uma vez por perda, limpeza na recuperação, e execução em andamento intacta.

## 3. Documentação e validação

- [x] 3.1 Atualizar `AGENT.md` (procedimento de instalação de teste com as novas concessões e o `@match`), `SSD.md` e `ROADMAP.md (pendência do keepalive)`; verificar com `Select-String -Pattern 'Oracle' AGENT.md SSD.md ROADMAP.md`.
- [x] 3.2 Rodar `node --test` completo e `openspec validate oracle-session-keepalive --strict`, sem falhas.
- [x] 3.3 Validação de runtime na branch `test`: com a página Oracle aberta, deixar o MyWay ocioso por mais que o tempo de inatividade observado e registrar o período e o resultado; depois fechar a página Oracle e confirmar o estado inativo e o aviso, sem executar Ajuste. Registrar no `ROADMAP.md` e em `session-liveness`.
