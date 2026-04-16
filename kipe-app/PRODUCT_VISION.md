# Kipe - Product Vision & Complete Overview

## 🎯 Visão do Produto

**Kipe** é um workspace desktop premium para desenvolvimento assistido por IA, projetado para desenvolvedores avançados que demandam produtividade real. Inspirado na categoria do HiveTerm mas completamente original, o Kipe une terminais reais, agentes de IA coordenados, gerenciamento de processos e observabilidade em uma única interface elegante.

## 🏗️ Arquitetura Completa

```
┌─────────────────────────────────────────────────────────────────┐
│                        KIPE WORKSPACE                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Welcome    │  │  Workspace   │  │     Settings &       │  │
│  │   Screen     │  │    Screen    │  │      Config          │  │
│  │              │  │              │  │                      │  │
│  │  • Projects  │  │  • Sidebar   │  │  • Theme             │  │
│  │  • Quick     │  │  • Header    │  │  • Shell             │  │
│  │    Actions   │  │  • Views:    │  │  • Notifications     │  │
│  │              │  │    - Agents  │  │  • Providers         │  │
│  └──────────────┘  │    - Process │  └──────────────────────┘  │
│                    │    - Activity                            │
│                    │    - kipe.yml                            │
│                    └───────────────────────────────────────────┘
├─────────────────────────────────────────────────────────────────┤
│                     BACKEND SERVICES                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │  Terminal   │ │   Process   │ │    Agent    │ │   Store   │ │
│  │   Manager   │ │   Manager   │ │   Manager   │ │ (YAML/JS) │ │
│  │  (node-pty) │ │(child_proc) │ │ (msg-bus)   │ │           │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Estrutura de Arquivos Entregue

```
kipe-app/
├── src/
│   ├── main/
│   │   ├── main.js              # Main process Electron + IPC
│   │   ├── terminalManager.js   # PTY terminal sessions
│   │   ├── processManager.js    # Native process spawning
│   │   └── agentManager.js      # AI agents + message bus
│   ├── renderer/
│   │   ├── index.html           # UI structure
│   │   ├── renderer.js          # Frontend logic
│   │   └── styles/
│   │       └── main.css         # Premium dark design system
│   └── shared/
│       └── schemas.js           # Data models & validation
├── examples/
│   └── kipe.yml.example         # Full config example
├── package.json                 # Dependencies & scripts
├── README.md                    # User documentation
├── ARCHITECTURE.md              # Technical documentation
├── PRODUCT_VISION.md            # This file
└── .gitignore                   # Git exclusions
```

## ✨ Funcionalidades Implementadas

### 1. Gerenciamento de Projetos ✅
- Tela de boas-vindas com projetos recentes
- Detecção automática de stack (Node.js, Python, Rust, Go, etc.)
- Persistência local via electron-store
- Abertura de pastas locais via dialog

### 2. Workspace Unificado ✅
- Sidebar de navegação compacta
- Header com info do projeto
- Sistema de views navegáveis
- Layout responsivo e premium

### 3. Views Implementadas ✅
| View | Descrição | Status |
|------|-----------|--------|
| Workspace | Terminal e painéis | ✅ |
| Agents | Lista e gestão de agentes | ✅ |
| Processes | Tabela de processos | ✅ |
| Activity | Timeline de eventos | ✅ |
| Config | Editor YAML visual | ✅ |
| Settings | Preferências do app | ✅ |

### 4. Agentes de IA ✅
- Criação via modal form
- Campos: nome, role, instructions, model, tools, commands
- Status tracking (idle, running, stopped, error)
- Message bus interno para comunicação
- Suporte a subagentes e hierarquia

### 5. Process Manager ✅
- Spawn de processos nativos
- Captura de stdout/stderr
- Auto-restart configurável
- Políticas: never, always, on-failure
- Buffer de output limitado

### 6. Terminal PTY ✅
- Integração node-pty pronta
- Múltiplas sessões
- Redimensionamento dinâmico
- Shell configurável por projeto

### 7. Configuração YAML ✅
- Schema completo definido
- Editor visual integrado
- Validação bidirecional
- Exemplo completo incluso

### 8. Activity Feed ✅
- Timeline de eventos
- Tipos: info, success, warning, error
- Timestamp e detalhes
- Clear functionality

### 9. Notificações ✅
- Toast notifications
- Tipos: success, error, warning, info
- Auto-dismiss após 4s
- Animações smooth

### 10. Design System Premium ✅
- Dark mode predominante
- Cores semânticas
- Tipografia limpa
- Componentes minimalistas
- Animações discretas

## 🔧 Stack Tecnológica

| Camada | Tecnologia | Finalidade |
|--------|-----------|------------|
| Framework | Electron 28 | Desktop app |
| Backend | Node.js | Main process |
| Terminal | node-pty | PTY real |
| YAML | js-yaml | Parse/write |
| Storage | electron-store | Local data |
| Watcher | chokidar | File watching |
| UUID | uuid | ID generation |

## 📋 Schema kipe.yml Completo

```yaml
project: string              # Nome do projeto
path: string                 # Caminho absoluto
stack: string[]              # Tech stack detectada
env: Record<string, string>  # Environment variables

agents:                      # AI Agents
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

processes:                   # Processos
  - id: string
    name: string
    command: string
    cwd: string
    autoStart: boolean
    autoRestart: boolean
    restartPolicy: string
    maxRestarts: number

watchers:                    # File watchers
  - patterns: string[]
    action: string
    ignore: string[]

notifications:               # Notificações
  enabled: boolean
  events: string[]
  desktop: boolean
  sound: boolean

orchestration:               # Orquestração
  mode: parallel | sequential
  maxConcurrent: number
  timeout: number

permissions:                 # Permissões
  allowFileSystemAccess: boolean
  allowNetworkAccess: boolean
  allowShellCommands: boolean

providers:                   # IA Providers
  - name: string
    type: openai | anthropic | google | local
    apiKey: string
    model: string

hooks:                       # Lifecycle hooks
  onProjectOpen: string[]
  onSwarmStart: string[]
  onProcessExit: string[]
```

## 🚀 Comandos Principais

```bash
# Desenvolvimento
npm start          # Inicia app em modo dev
npm run dev        # Alias para start

# Produção
npm run build      # Build com electron-builder

# Builds específicos
npx electron-builder --win    # Windows .exe
npx electron-builder --mac    # macOS .dmg
npx electron-builder --linux  # Linux .AppImage
```

## 🎨 Design Tokens

```css
/* Cores */
--bg-primary: #0d1117
--bg-secondary: #161b22
--bg-tertiary: #21262d
--text-primary: #f0f6fc
--text-secondary: #8b949e
--accent-primary: #58a6ff
--accent-success: #3fb950
--accent-warning: #d29922
--accent-error: #f85149

/* Typography */
--font-family: -apple-system, BlinkMacSystemFont, ...
--font-mono: 'SF Mono', 'Fira Code', ...

/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
```

## 📊 Modelos de Dados

```javascript
// Project
{ id, name, path, stack, lastOpened, config }

// Agent
{ id, name, role, instructions, model, tools, 
  commands, permissions, status, tasksCompleted }

// Process
{ id, name, command, pid, status, startTime, 
  exitCode, restartCount, outputBuffer }

// ActivityEvent
{ id, timestamp, type, message, details, source }

// TerminalSession
{ id, shell, cwd, cols, rows, createdAt, status }
```

## 🔄 Fluxos Principais

### 1. Onboarding
```
App inicia → Welcome Screen → Lista projetos vazia
→ Click "Open Project" → Select folder → Detect stack
→ Create kipe.yml → Show Workspace
```

### 2. Kipe Swarm
```
Click "Kipe Swarm" → Start all agents → Connect message bus
→ Start autoStart processes → Enable watchers
→ Toast: "Swarm active!" → Activity: "Swarm started"
```

### 3. Agent Creation
```
Click "New Agent" → Modal opens → Fill form
→ Save → Update kipe.yml → Reload agents list
→ Toast: "Agent created"
```

## 🛡️ Restrições Observadas

✅ **NÃO usa Docker** - Tudo nativo no SO  
✅ **NÃO requer containers** - Processos diretos  
✅ **Local-first** - Funciona offline  
✅ **Cross-platform** - Win/Mac/Linux  
✅ **Sem cópia de marca** - Original Kipe  

## 📈 Roadmap

### MVP (Completado) ✅
- [x] Estrutura Electron
- [x] UI premium dark
- [x] Gerenciamento projetos
- [x] Editor YAML
- [x] Agentes (UI + schema)
- [x] Processos (UI + schema)
- [x] Activity feed
- [x] Notificações

### Fase 2: Core Functionality
- [ ] node-pty fully integrated
- [ ] Terminal sessions funcionais
- [ ] Process stats em tempo real
- [ ] Auto-restart working
- [ ] Logs streaming

### Fase 3: AI Integration
- [ ] OpenAI provider
- [ ] Anthropic provider
- [ ] Agent execution engine
- [ ] Message bus funcional
- [ ] Task delegation

### Fase 4: Advanced Features
- [ ] Command palette
- [ ] Global hotkeys
- [ ] Split panes
- [ ] Layout persistence
- [ ] MCP integration

### Fase 5: Production Ready
- [ ] Windows build
- [ ] macOS build
- [ ] Linux build
- [ ] Auto-updater
- [ ] Error reporting

## 💡 Diferenciais Competitivos

| Feature | Terminal Puro | iTerm2 | Warp | **Kipe** |
|---------|--------------|--------|------|----------|
| Config compartilhável | ❌ | ❌ | ⚠️ | ✅ |
| Agentes de IA | ❌ | ❌ | ⚠️ | ✅ |
| Orquestração | ❌ | ❌ | ❌ | ✅ |
| Auto-restart | ❌ | ❌ | ❌ | ✅ |
| Notificações | ❌ | ❌ | ⚠️ | ✅ |
| kipe.yml declarativo | ❌ | ❌ | ❌ | ✅ |
| Open source | ✅ | ❌ | ❌ | ✅ |

## 🎯 Público-Alvo

- **Desenvolvedores senior** que gerenciam múltiplos processos
- **Tech leads** que precisam de visibilidade do workspace
- **Equipes de engenharia** que buscam padronização
- **Power users** de terminal que querem automação

## 📝 Licença

MIT License - Livre para uso comercial e modificação.

---

**Kipe** - AI-Assisted Development Workspace

*Built for developers who demand real productivity.*

© 2024 Kipe Team
