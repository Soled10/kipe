/**
 * Kipe - Shared Schemas and Data Models
 */

// Schema for kipe.yml configuration
const KIPE_YAML_SCHEMA = {
  type: 'object',
  required: ['project', 'path'],
  properties: {
    project: {
      type: 'string',
      description: 'Project name'
    },
    path: {
      type: 'string',
      description: 'Absolute path to the project directory'
    },
    stack: {
      type: 'array',
      items: { type: 'string' },
      description: 'Detected technology stack'
    },
    env: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Environment variables'
    },
    agents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          instructions: { type: 'string' },
          model: { type: 'string', default: 'default' },
          contextDir: { type: 'string', default: './' },
          tools: {
            type: 'array',
            items: { type: 'string' }
          },
          commands: {
            type: 'array',
            items: { type: 'string' }
          },
          permissions: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['read', 'write', 'execute', 'network']
            }
          },
          provider: { type: 'string', default: 'default' },
          status: { 
            type: 'string',
            enum: ['idle', 'running', 'stopped', 'error'],
            default: 'idle'
          }
        }
      }
    },
    processes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'command'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          command: { type: 'string' },
          args: {
            type: 'array',
            items: { type: 'string' }
          },
          cwd: { type: 'string' },
          env: {
            type: 'object',
            additionalProperties: { type: 'string' }
          },
          autoStart: { type: 'boolean', default: false },
          autoRestart: { type: 'boolean', default: false },
          restartPolicy: {
            type: 'string',
            enum: ['never', 'always', 'on-failure'],
            default: 'never'
          },
          maxRestarts: { type: 'number', default: 3 }
        }
      }
    },
    watchers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          patterns: {
            type: 'array',
            items: { type: 'string' }
          },
          action: { type: 'string' },
          ignore: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    notifications: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['error', 'complete', 'warning', 'info']
          }
        },
        desktop: { type: 'boolean', default: true },
        sound: { type: 'boolean', default: false }
      }
    },
    orchestration: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['parallel', 'sequential'],
          default: 'parallel'
        },
        maxConcurrent: { type: 'number', default: 5 },
        timeout: { type: 'number', default: 30000 }
      }
    },
    restartPolicy: {
      type: 'string',
      enum: ['never', 'always', 'on-failure'],
      default: 'on-failure'
    },
    permissions: {
      type: 'object',
      properties: {
        allowFileSystemAccess: { type: 'boolean', default: true },
        allowNetworkAccess: { type: 'boolean', default: true },
        allowShellCommands: { type: 'boolean', default: true },
        allowedDirectories: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    providers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['openai', 'anthropic', 'google', 'local']
          },
          apiKey: { type: 'string' },
          baseUrl: { type: 'string' },
          model: { type: 'string' }
        }
      }
    },
    hooks: {
      type: 'object',
      properties: {
        onProjectOpen: {
          type: 'array',
          items: { type: 'string' }
        },
        onSwarmStart: {
          type: 'array',
          items: { type: 'string' }
        },
        onProcessExit: {
          type: 'array',
          items: { type: 'string' }
        },
        onAgentComplete: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};

// Data models
const MODELS = {
  // Project model
  Project: {
    id: 'string (uuid)',
    name: 'string',
    path: 'string',
    stack: 'array<string>',
    lastOpened: 'number (timestamp)',
    config: 'KipeYamlConfig'
  },

  // Agent model
  Agent: {
    id: 'string (uuid)',
    name: 'string',
    role: 'string',
    instructions: 'string',
    model: 'string',
    contextDir: 'string',
    tools: 'array<string>',
    commands: 'array<string>',
    permissions: 'array<string>',
    provider: 'string',
    status: 'idle | running | stopped | error',
    createdAt: 'number (timestamp)',
    lastActiveAt: 'number (timestamp)',
    tasksCompleted: 'number',
    currentTask: 'object | null',
    subAgents: 'array<string>'
  },

  // Process model
  Process: {
    id: 'string (uuid)',
    name: 'string',
    command: 'string',
    args: 'array<string>',
    cwd: 'string',
    pid: 'number | null',
    status: 'running | stopped | exited | error',
    startTime: 'number (timestamp)',
    exitCode: 'number | null',
    signal: 'string | null',
    restartCount: 'number',
    autoRestart: 'boolean',
    restartPolicy: 'never | always | on-failure',
    outputBuffer: 'array<object>'
  },

  // Terminal Session model
  TerminalSession: {
    id: 'string (uuid)',
    shell: 'string',
    cwd: 'string',
    cols: 'number',
    rows: 'number',
    createdAt: 'number (timestamp)',
    status: 'active | killed'
  },

  // Activity Event model
  ActivityEvent: {
    id: 'string (uuid)',
    timestamp: 'number (timestamp)',
    type: 'info | success | warning | error',
    message: 'string',
    details: 'string | null',
    source: 'agent | process | system'
  },

  // Notification Event model
  NotificationEvent: {
    id: 'string (uuid)',
    timestamp: 'number (timestamp)',
    type: 'buildComplete | testComplete | errorCritical | interventionRequired | agentTaskComplete',
    title: 'string',
    body: 'string',
    priority: 'low | normal | high'
  },

  // Message Bus model (for agent communication)
  Message: {
    id: 'string (uuid)',
    timestamp: 'number (timestamp)',
    type: 'delegation | result | request | broadcast',
    from: 'string (agentId)',
    to: 'string (agentId) | null',
    payload: 'object'
  },

  // Workspace Layout model
  WorkspaceLayout: {
    projectId: 'string',
    panels: 'array<object>',
    activeView: 'string',
    terminalSessions: 'array<string>',
    sidebarWidth: 'number',
    panelSizes: 'object'
  }
};

// Stack detection patterns
const STACK_PATTERNS = {
  nodejs: ['package.json'],
  pnpm: ['pnpm-lock.yaml'],
  yarn: ['yarn.lock'],
  bun: ['bun.lockb', 'bun.lock'],
  python: ['requirements.txt', 'pyproject.toml', 'setup.py'],
  rust: ['Cargo.toml'],
  go: ['go.mod', 'go.sum'],
  ruby: ['Gemfile', 'Gemfile.lock'],
  php: ['composer.json', 'composer.lock'],
  java: ['pom.xml', 'build.gradle', 'settings.gradle'],
  cpp: ['CMakeLists.txt', 'Makefile', 'configure'],
  dotnet: ['.csproj', '.sln', 'project.json'],
  swift: ['Package.swift', '.xcodeproj', '.xcworkspace'],
  docker: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
  git: ['.git'],
  typescript: ['tsconfig.json'],
  heroku: ['Procfile'],
  nvm: ['.nvmrc'],
  pyenv: ['.python-version']
};

// Default agent templates
const AGENT_TEMPLATES = {
  'code-assistant': {
    name: 'Code Agent',
    role: 'code-assistant',
    instructions: 'Help with code review, refactoring, and best practices. Focus on clean, maintainable code.',
    tools: ['read-files', 'write-files', 'search-code', 'diff'],
    commands: ['npm run lint', 'npm run format']
  },
  'test-runner': {
    name: 'Test Agent',
    role: 'test-runner',
    instructions: 'Run tests, analyze coverage, and suggest improvements. Report failures clearly.',
    tools: ['read-files', 'run-commands'],
    commands: ['npm test', 'npm run test:coverage']
  },
  'build-agent': {
    name: 'Build Agent',
    role: 'build-agent',
    instructions: 'Manage build processes, watch for changes, and report build status.',
    tools: ['run-commands', 'watch-files'],
    commands: ['npm run build', 'npm run dev']
  },
  'bugfix-agent': {
    name: 'Bugfix Agent',
    role: 'bugfix-agent',
    instructions: 'Analyze errors, identify root causes, and suggest fixes.',
    tools: ['read-files', 'search-code', 'run-commands'],
    commands: []
  },
  'docs-agent': {
    name: 'Docs Agent',
    role: 'docs-agent',
    instructions: 'Generate and maintain documentation. Keep docs in sync with code.',
    tools: ['read-files', 'write-files'],
    commands: ['npm run docs']
  },
  'devops-agent': {
    name: 'DevOps Agent',
    role: 'devops-agent',
    instructions: 'Manage deployments, CI/CD pipelines, and infrastructure concerns.',
    tools: ['run-commands', 'read-files', 'write-files'],
    commands: []
  }
};

// Validation functions
function validateKipeYaml(config) {
  const errors = [];
  
  if (!config.project) {
    errors.push('Missing required field: project');
  }
  
  if (!config.path) {
    errors.push('Missing required field: path');
  }
  
  if (config.agents) {
    config.agents.forEach((agent, index) => {
      if (!agent.name) {
        errors.push(`Agent ${index}: missing name`);
      }
      if (!agent.role) {
        errors.push(`Agent ${index}: missing role`);
      }
    });
  }
  
  if (config.processes) {
    config.processes.forEach((proc, index) => {
      if (!proc.name) {
        errors.push(`Process ${index}: missing name`);
      }
      if (!proc.command) {
        errors.push(`Process ${index}: missing command`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  KIPE_YAML_SCHEMA,
  MODELS,
  STACK_PATTERNS,
  AGENT_TEMPLATES,
  validateKipeYaml
};
