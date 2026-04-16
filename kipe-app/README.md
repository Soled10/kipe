# Kipe - AI Development Workspace

**Kipe** é um workspace desktop moderno para desenvolvimento assistido por IA, onde agentes, terminais, processos e ferramentas coexistem em uma única interface.

## 🎨 Design

Tema premium dark com acentos em amarelo ouro:
- **Cores principais**: Preto profundo (#0a0a0a, #121212) com amarelo (#ffd000)
- **Estética**: Minimalista, técnica e profissional
- **Foco**: Densidade de informação útil com elegância

## ✨ Funcionalidades

### Gerenciamento de Projetos
- Lista de projetos recentes
- Detecção automática de stack (Node.js, Python, Rust, Go, etc.)
- Persistência local de configurações

### Kipe Agents
- Criação de agentes de IA especializados
- Modelos suportados: GPT-4, GPT-3.5, Claude 3, Llama 3
- Status em tempo real (idle, busy)
- Configuração via YAML

### Process Manager
- Monitoramento de processos
- Status, PID, CPU, memória e uptime
- Controles de start/stop

### Configuração Declarativa
- Arquivo `kipe.yml` por projeto
- Editor visual integrado
- Sintaxe YAML com validação

### Activity Feed
- Timeline de eventos do workspace
- Notificações de ações de agentes e processos
- Filtro por tipo (success, error, warning, info)

### Kipe Swarm
- Modo que ativa todos os agentes e processos simultaneamente
- Orquestração automática
- Monitoramento unificado

## 🚀 Instalação

```bash
cd kipe-app
npm install
npm start
```

## 📁 Estrutura do Projeto

```
kipe-app/
├── src/
│   ├── main/
│   │   ├── main.js          # Main process Electron
│   │   └── preload.js       # Preload script (contextBridge)
│   └── renderer/
│       ├── index.html       # UI principal
│       ├── renderer.js      # Lógica do frontend
│       └── styles/
│           └── main.css     # Design system completo
├── examples/
│   └── kipe.yml.example     # Exemplo de configuração
├── package.json
└── README.md
```

## 🛠️ Tecnologias

- **Electron** - Framework desktop
- **Node.js** - Backend e IPC
- **HTML/CSS/JS** - Frontend vanilla
- **js-yaml** - Parser YAML
- **node-pty** - Terminal PTY (futuro)

## ⌨️ Atalhos

- `Esc` - Fechar modais
- `Ctrl/Cmd + K` - Command palette (futuro)

## 📝 Exemplo de kipe.yml

```yaml
project:
  name: my-awesome-project
  path: .

agents:
  - name: Code Reviewer
    role: Reviews code changes
    model: gpt-4
    instructions: |
      You are an expert code reviewer.
      Focus on quality and best practices.

  - name: Test Runner
    role: Runs tests
    model: gpt-3.5-turbo
    commands:
      - npm test

processes:
  - name: Dev Server
    command: npm run dev
    autoRestart: true

notifications:
  enabled: true
  events:
    - build.complete
    - test.failure
```

## 🔒 Segurança

- Context isolation habilitado
- nodeIntegration desabilitado
- IPC seguro via contextBridge
- Sem acesso direto ao filesystem pelo renderer

## 📄 Licença

MIT

---

**Kipe** - AI-Assisted Development Workspace
