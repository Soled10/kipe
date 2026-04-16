# Kipe - AI-Assisted Development Workspace

**Kipe** é um workspace desktop moderno para desenvolvimento assistido por IA, onde agentes, terminais, processos e ferramentas de desenvolvimento coexistem em uma única interface.

## 🚀 Visão Geral

Kipe foi construído para desenvolvedores avançados que precisam de:

- **Workspace unificado** para gerenciar múltiplos projetos
- **Agentes de IA especializados** para diferentes tarefas
- **Terminal real com PTY** para execução de comandos
- **Process manager integrado** para servidores e watchers
- **Configuração declarativa** via `kipe.yml`
- **Observabilidade completa** com logs e activity feed
- **Notificações desktop** para eventos importantes

## ✨ Funcionalidades Principais

### 1. Gerenciamento de Projetos
- Lista de projetos recentes
- Detecção automática de stack (Node.js, Python, Rust, Go, etc.)
- Configuração persistida localmente

### 2. Workspace Unificado
- Painéis redimensionáveis
- Sistema de tabs por painel
- Layout salvo por projeto
- Navegação rápida via sidebar

### 3. Terminal Real
- Suporte PTY completo (via node-pty)
- Múltiplas sessões simultâneas
- Cores ANSI e atalhos comuns
- Shell configurável por projeto

### 4. Agentes de IA
- Criação de agentes especializados
- Configuração de papel, instruções e ferramentas
- Coordenação entre agentes via message bus
- Subagentes e delegação de tarefas

### 5. Process Manager
- Lista de processos com status em tempo real
- Controles de iniciar/parar/reiniciar
- Auto-restart configurável
- Monitoramento de CPU e memória

### 6. Configuração YAML
- Arquivo `kipe.yml` declarativo
- Editor visual integrado
- Sincronização bidirecional
- Validação de schema

### 7. Kipe Swarm
- Modo que inicia todos os agentes e processos
- Orquestração automática
- Conexão ao barramento interno
- Monitoramento global do workspace

### 8. Activity Feed
- Timeline de todos os eventos
- Ações dos agentes
- Eventos dos processos
- Erros e intervenções

## 📁 Estrutura do Projeto

```
kipe-app/
├── src/
│   ├── main/
│   │   ├── main.js           # Main process do Electron
│   │   ├── terminalManager.js # Gerenciador de terminais PTY
│   │   ├── processManager.js  # Gerenciador de processos
│   │   └── agentManager.js    # Gerenciador de agentes
│   ├── renderer/
│   │   ├── index.html         # Interface principal
│   │   ├── renderer.js        # Lógica do frontend
│   │   └── styles/
│   │       └── main.css       # Design system e estilos
│   └── shared/
│       └── schemas.js         # Schemas e validações
├── package.json
└── README.md
```

## 🛠️ Stack Tecnológica

- **Electron** - Framework desktop
- **Node.js** - Backend e main process
- **node-pty** - Terminal com PTY real
- **js-yaml** - Parser e writer de YAML
- **electron-store** - Armazenamento local
- **chokidar** - Watcher de arquivos
- **uuid** - Geração de IDs únicos

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Git

### Instalação

```bash
# Clone o repositório
cd /workspace/kipe-app

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm start
```

### Build para Produção

```bash
# Build da aplicação
npm run build
```

## 📄 Schema do kipe.yml

O arquivo de configuração `kipe.yml` suporta a seguinte estrutura:

```yaml
# Identificação do projeto
project: nome-do-projeto
path: /caminho/para/projeto

# Stack detectada
stack:
  - nodejs
  - typescript
  - react

# Variáveis de ambiente
env:
  NODE_ENV: development
  API_URL: http://localhost:3000

# Agentes de IA
agents:
  - id: uuid-gerado
    name: Code Agent
    role: code-assistant
    instructions: "Ajude com code review e refactoring"
    model: default
    contextDir: ./src
    tools:
      - read-files
      - write-files
      - search-code
    commands:
      - npm run dev
      - npm test
    permissions:
      - read
      - write
    status: idle

# Processos
processes:
  - id: uuid-gerado
    name: Dev Server
    command: npm run dev
    autoStart: false
    restartPolicy: on-failure
    cwd: /caminho/para/projeto

# Watchers
watchers: []

# Notificações
notifications:
  enabled: true
  events:
    - error
    - complete

# Orquestração
orchestration:
  mode: parallel
  maxConcurrent: 5

# Política de restart
restartPolicy: on-failure

# Permissões
permissions:
  allowFileSystemAccess: true
  allowNetworkAccess: true
  allowShellCommands: true

# Provedores de IA
providers:
  - name: default
    type: openai
    apiKey: ${OPENAI_API_KEY}

# Hooks
hooks:
  onProjectOpen: []
  onSwarmStart: []
  onProcessExit: []
```

## 🎨 Design System

Kipe utiliza um design system premium com:

- **Dark mode predominante** - Estética técnica e profissional
- **Cores semânticas** - Verde (sucesso), Amarelo (atenção), Vermelho (erro), Azul (info)
- **Tipografia limpa** - Fontes do sistema com fallbacks adequados
- **Componentes minimalistas** - Cards, badges, botões discretos
- **Animações sutis** - Transições rápidas e discretas

## 🔌 IPC Handlers

A comunicação entre main e renderer processes é feita via IPC:

| Handler | Descrição |
|---------|-----------|
| `get-projects` | Retorna lista de projetos |
| `add-project` | Adiciona novo projeto |
| `open-project` | Abre projeto existente |
| `remove-project` | Remove projeto da lista |
| `save-kipe-yml` | Salva configuração YAML |
| `get-settings` | Retorna configurações |
| `save-settings` | Salva configurações |
| `get-activity-log` | Retorna log de atividades |
| `clear-activity-log` | Limpa log de atividades |

## 📋 Roadmap

### MVP (Atual)
- [x] Abertura de projetos locais
- [x] Interface desktop moderna
- [x] Sistema de navegação
- [x] Editor de configuração YAML
- [x] Cadastro de agentes
- [x] Cadastro de processos
- [x] Activity feed
- [x] Notificações toast
- [ ] Terminal PTY fully functional
- [ ] Process manager com stats reais
- [ ] Integração com provedores de IA

### Pós-MVP
- [ ] Coordenação avançada entre agentes
- [ ] Subagentes e hierarquia
- [ ] Leitura cruzada de output
- [ ] Timeline detalhada
- [ ] Automações reativas
- [ ] Marketplace de templates
- [ ] Integração MCP
- [ ] Command palette
- [ ] Atalhos de teclado globais

## ⚠️ Restrições

- **NÃO usa Docker** - Tudo roda nativamente no SO
- **NÃO requer containers** - Processos nativos do sistema
- **Local-first** - Funciona offline (exceto chamadas a IA)
- **Cross-platform** - Windows, macOS, Linux

## 📝 Licença

MIT License - ver arquivo LICENSE para detalhes.

---

**Kipe** - AI-Assisted Development Workspace. Construído para desenvolvedores que buscam produtividade real.
