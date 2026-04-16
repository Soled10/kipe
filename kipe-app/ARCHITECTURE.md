# Kipe - Documentação de Arquitetura

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         KIPE APP                                │
│                     (Electron Desktop)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────────┐   │
│  │   Renderer Process  │◄───────►│     Main Process        │   │
│  │   (Frontend/UI)     │   IPC   │   (Backend/Node.js)     │   │
│  │                     │         │                         │   │
│  │  - HTML/CSS/JS      │         │  - Electron APIs        │   │
│  │  - React-like UI    │         │  - Native modules       │   │
│  │  - State management │         │  - System integration   │   │
│  └─────────────────────┘         └───────────┬─────────────┘   │
│                                              │                  │
│                              ┌───────────────┼───────────────┐ │
│                              │               │               │ │
│                    ┌─────────▼────┐  ┌──────▼─────┐  ┌──────▼──┐
│                    │   Terminal   │  │  Process   │  │  Agent  │
│                    │   Manager    │  │  Manager   │  │ Manager │
│                    │   (node-pty) │  │ (child_    │  │(internal│
│                    │              │  │  process)  │  │  bus)   │
│                    └──────────────┘  └────────────┘  └─────────┘
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      Sistema Operacional                        │
│            (Windows / macOS / Linux - processos nativos)        │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. Main Process (`src/main/main.js`)

**Responsabilidades:**
- Inicialização do Electron
- Gerenciamento de janelas
- IPC handlers (comunicação com renderer)
- Armazenamento local (electron-store)
- Leitura/escrita de arquivos kipe.yml
- Detecção automática de stack
- Notificações desktop

**IPC Handlers Implementados:**
| Handler | Método | Descrição |
|---------|--------|-----------|
| `get-projects` | GET | Lista projetos recentes |
| `add-project` | POST | Adiciona novo projeto |
| `open-project` | POST | Abre projeto existente |
| `remove-project` | DELETE | Remove projeto |
| `save-kipe-yml` | PUT | Salva configuração YAML |
| `get-settings` | GET | Retorna configurações |
| `save-settings` | PUT | Salva configurações |
| `get-activity-log` | GET | Retorna log de atividades |
| `clear-activity-log` | DELETE | Limpa activity log |

### 2. Terminal Manager (`src/main/terminalManager.js`)

**Responsabilidades:**
- Criar sessões PTY reais
- Gerenciar múltiplos terminais
- Redimensionamento dinâmico
- Captura de output
- Cleanup de sessões

**API:**
```javascript
const terminalManager = new TerminalManager();

// Criar sessão
const { id, success } = terminalManager.createSession({
  cwd: '/path/to/project',
  shell: '/bin/bash',
  cols: 80,
  rows: 24
});

// Escrever na sessão
terminalManager.writeSession(id, 'npm run dev\n');

// Capturar dados
terminalManager.onSessionData(id, (data) => {
  console.log('Terminal output:', data);
});

// Matar sessão
terminalManager.killSession(id);
```

### 3. Process Manager (`src/main/processManager.js`)

**Responsabilidades:**
- Spawn de processos nativos
- Monitoramento de status
- Auto-restart configurável
- Captura de stdout/stderr
- Estatísticas de recursos

**API:**
```javascript
const processManager = new ProcessManager();

// Spawn processo
const { id, pid } = processManager.spawnProcess({
  command: 'npm run dev',
  cwd: '/path/to/project',
  name: 'Dev Server',
  autoRestart: true,
  restartPolicy: 'on-failure'
});

// Obter output
const logs = processManager.getProcessOutput(id, 100);

// Parar processo
processManager.stopProcess(id);

// Reiniciar processo
processManager.restartProcess(id);
```

### 4. Agent Manager (`src/main/agentManager.js`)

**Responsabilidades:**
- Criação e gerenciamento de agentes
- Message bus para comunicação entre agentes
- Hierarquia de subagentes
- Delegação de tarefas
- Status tracking

**API:**
```javascript
const agentManager = new AgentManager();

// Criar agente
const agent = agentManager.createAgent({
  name: 'Code Agent',
  role: 'code-assistant',
  instructions: 'Help with code review',
  tools: ['read-files', 'write-files'],
  commands: ['npm run lint']
});

// Publicar mensagem no bus
agentManager.publishMessage({
  type: 'delegation',
  from: agent.id,
  to: otherAgentId,
  task: { type: 'review', file: 'index.js' }
});

// Delegar tarefa
agentManager.delegateTask(fromAgentId, toAgentId, task);

// Obter hierarchy
const hierarchy = agentManager.getAgentHierarchy(agentId);
```

### 5. Renderer Process (`src/renderer/renderer.js`)

**Responsabilidades:**
- Renderização da UI
- Gerenciamento de estado local
- Navegação entre views
- Interação com usuário
- Toast notifications

**Views Implementadas:**
1. **Workspace** - Terminal e painéis principais
2. **Agents** - Lista e gestão de agentes
3. **Processes** - Tabela de processos
4. **Activity** - Timeline de eventos
5. **Config** - Editor de kipe.yml
6. **Settings** - Configurações do app

## Fluxo de Dados

### 1. Abertura de Projeto

```
User clica "Open Project"
    ↓
Renderer envia IPC: add-project(path)
    ↓
Main Process:
  - Valida diretório
  - Detecta stack
  - Carrega/cria kipe.yml
  - Gera config padrão
    ↓
Main retorna projeto
    ↓
Renderer atualiza UI
  - Show workspace
  - Load agents
  - Load processes
  - Load activity
```

### 2. Kipe Swarm Mode

```
User clica "Kipe Swarm"
    ↓
Renderer inicia modo swarm
    ↓
Para cada agente no config:
  - Inicializa agente
  - Conecta ao message bus
    ↓
Para cada processo com autoStart:
  - ProcessManager.spawnProcess()
    ↓
Watcher inicia monitoramento
    ↓
Notificação: "Swarm active"
```

### 3. Comunicação entre Agentes

```
Agente A precisa delegar tarefa
    ↓
AgentManager.publishMessage({
  type: 'delegation',
  from: A,
  to: B,
  payload: {...}
})
    ↓
Message adicionado ao bus
    ↓
Agente B lê mensagens
    ↓
Agente B processa tarefa
    ↓
Agente B publica resultado
    ↓
UI atualiza activity feed
```

## Schema do kipe.yml

```yaml
# Estrutura completa
project: string              # Nome do projeto
path: string                 # Caminho absoluto
stack: string[]              # Tecnologias detectadas
env: Record<string, string>  # Variáveis de ambiente

agents:                      # Lista de agentes
  - id: string
    name: string
    role: string
    instructions: string
    model: string
    contextDir: string
    tools: string[]
    commands: string[]
    permissions: string[]
    provider: string
    status: string

processes:                   # Lista de processos
  - id: string
    name: string
    command: string
    args: string[]
    cwd: string
    autoStart: boolean
    autoRestart: boolean
    restartPolicy: string
    maxRestarts: number

watchers:                    # Watchers de arquivo
  - id: string
    name: string
    patterns: string[]
    action: string
    ignore: string[]

notifications:               # Config de notificações
  enabled: boolean
  events: string[]
  desktop: boolean
  sound: boolean

orchestration:               # Orquestração
  mode: string               # parallel | sequential
  maxConcurrent: number
  timeout: number

restartPolicy: string        # never | always | on-failure

permissions:                 # Permissões globais
  allowFileSystemAccess: boolean
  allowNetworkAccess: boolean
  allowShellCommands: boolean
  allowedDirectories: string[]

providers:                   # Provedores de IA
  - name: string
    type: string             # openai | anthropic | google | local
    apiKey: string
    baseUrl: string
    model: string

hooks:                       # Hooks de lifecycle
  onProjectOpen: string[]
  onSwarmStart: string[]
  onProcessExit: string[]
  onAgentComplete: string[]
```

## Design System

### Cores

```css
--bg-primary: #0d1117;      /* Fundo principal */
--bg-secondary: #161b22;    /* Painéis */
--bg-tertiary: #21262d;     /* Elementos elevados */
--bg-elevated: #30363d;     /* Modais, dropdowns */

--text-primary: #f0f6fc;    /* Texto principal */
--text-secondary: #8b949e;  /* Texto secundário */
--text-muted: #484f58;      /* Texto desativado */

--accent-primary: #58a6ff;  /* Azul destaque */
--accent-success: #3fb950;  /* Verde sucesso */
--accent-warning: #d29922;  /* Amarelo atenção */
--accent-error: #f85149;    /* Vermelho erro */
```

### Tipografia

```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...
--font-mono: 'SF Mono', 'Fira Code', Monaco, Consolas, ...

--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
```

### Componentes

1. **Buttons** - Primário, Secundário, Swarm, Ícone
2. **Cards** - Agentes, Projetos, Ações rápidas
3. **Modals** - Criação/edição de agentes
4. **Toasts** - Notificações temporárias
5. **Tables** - Lista de processos
6. **Forms** - Inputs, selects, checkboxes
7. **Badges** - Status de agentes/processos

## Plano de Desenvolvimento

### Fase 1: MVP (Atual) ✅

- [x] Estrutura do projeto Electron
- [x] Main process com IPC handlers
- [x] Renderer com UI moderna
- [x] Design system dark premium
- [x] Gerenciamento de projetos
- [x] Editor de kipe.yml
- [x] Activity feed
- [x] Notificações toast
- [ ] Instalação de dependências (limitação de espaço)

### Fase 2: Terminais e Processos

- [ ] Integração completa node-pty
- [ ] Terminal sessions funcionais
- [ ] Process manager com stats reais
- [ ] Auto-restart de processos
- [ ] Logs em tempo real

### Fase 3: Agentes de IA

- [ ] Integração com provedores (OpenAI, etc.)
- [ ] Execução real de agentes
- [ ] Message bus funcional
- [ ] Delegação entre agentes
- [ ] Subagentes hierárquicos

### Fase 4: Recursos Avançados

- [ ] Command palette
- [ ] Atalhos de teclado globais
- [ ] Split panes redimensionáveis
- [ ] Layout persistence
- [ ] Marketplace de templates
- [ ] Integração MCP

### Fase 5: Produção

- [ ] Build para Windows (.exe)
- [ ] Build para macOS (.dmg)
- [ ] Build para Linux (.AppImage)
- [ ] Auto-updater
- [ ] Analytics (opcional)
- [ ] Documentação completa

## Segurança

1. **Validação de input** - Todos os inputs validados
2. **Path sanitization** - Caminhos validados contra injection
3. **Permissões granulares** - Controle fino por agente
4. **Sandboxing** - Processos isolados
5. **HTTPS para APIs** - Quando aplicável

## Performance

1. **Lazy loading** - Views carregadas sob demanda
2. **Virtual scrolling** - Para listas grandes
3. **Debouncing** - Em inputs e resizes
4. **Buffer limitado** - Logs com tamanho máximo
5. **Cleanup automático** - Sessions e processos órfãos

## Testing Strategy

```
Testes Unitários (Jest):
  - Schemas e validações
  - Managers (Terminal, Process, Agent)
  - Utility functions

Testes de Integração:
  - IPC handlers
  - File operations
  - YAML parsing

Testes E2E (Playwright):
  - Fluxo completo de abertura de projeto
  - Criação de agentes
  - Execução de swarm mode
```

## Deploy e Distribuição

```bash
# Build para produção
npm run build

# Builds específicos
npx electron-builder --win    # Windows
npx electron-builder --mac    # macOS
npx electron-builder --linux  # Linux
```

## Troubleshooting

### Problemas Comuns

1. **node-pty não compila**
   - Instale Python 2.x e build-essential
   - `npm rebuild node-pty`

2. **Electron não inicia**
   - Delete node_modules e reinstale
   - Verifique versão do Node.js (18+)

3. **kipe.yml não carrega**
   - Verifique sintaxe YAML
   - Valide schema obrigatório

## Contributing

1. Fork o projeto
2. Crie branch feature (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Kipe** - AI-Assisted Development Workspace
Built with ❤️ for developers who demand productivity.
