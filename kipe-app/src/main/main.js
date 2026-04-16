/**
 * Kipe - AI-Assisted Development Workspace
 * Main Process Entry Point
 */

const { app, BrowserWindow, ipcMain, dialog, Notification, systemPreferences } = require('electron');
const path = require('path');
const Store = require('electron-store');
const yaml = require('js-yaml');
const fs = require('fs');
const chokidar = require('chokidar');
const { v4: uuidv4 } = require('uuid');

// Initialize store
const store = new Store({
  name: 'kipe-config',
  defaults: {
    projects: [],
    settings: {
      theme: 'dark',
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      notifications: {
        buildComplete: true,
        testComplete: true,
        errorCritical: true,
        agentTaskComplete: true,
        interventionRequired: true
      }
    },
    providers: []
  }
});

let mainWindow;
let activeProjects = new Map(); // projectId -> project data
let terminalSessions = new Map(); // sessionId -> pty instance
let processes = new Map(); // processId -> process info
let agents = new Map(); // agentId -> agent info
let activityLog = []; // Activity events

// Schema for kipe.yml
const KIPE_YAML_SCHEMA = {
  project: String,
  path: String,
  stack: Array,
  env: Object,
  agents: Array,
  processes: Array,
  watchers: Array,
  notifications: Object,
  orchestration: Object,
  restartPolicy: String,
  permissions: Object,
  providers: Array,
  hooks: Object
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupAllProcesses();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  cleanupAllProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Project Management
ipcMain.handle('get-projects', () => {
  return store.get('projects', []);
});

ipcMain.handle('add-project', async (event, projectPath) => {
  try {
    const stats = fs.statSync(projectPath);
    if (!stats.isDirectory()) {
      throw new Error('Invalid directory');
    }

    const projectConfig = await loadProjectConfig(projectPath);
    const stack = await detectStack(projectPath);
    
    const project = {
      id: uuidv4(),
      name: path.basename(projectPath),
      path: projectPath,
      stack,
      lastOpened: Date.now(),
      config: projectConfig
    };

    const projects = store.get('projects', []);
    const existingIndex = projects.findIndex(p => p.path === projectPath);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...projects[existingIndex], ...project };
    } else {
      projects.unshift(project);
    }

    store.set('projects', projects.slice(0, 50)); // Keep last 50 projects
    activeProjects.set(project.id, project);
    
    return project;
  } catch (error) {
    console.error('Error adding project:', error);
    throw error;
  }
});

ipcMain.handle('open-project', (event, projectId) => {
  const projects = store.get('projects', []);
  const project = projects.find(p => p.id === projectId) || projects.find(p => p.path === projectId);
  
  if (project) {
    activeProjects.set(project.id || projectId, project);
    return project;
  }
  return null;
});

ipcMain.handle('remove-project', (event, projectId) => {
  const projects = store.get('projects', []);
  const filtered = projects.filter(p => p.id !== projectId);
  store.set('projects', filtered);
  activeProjects.delete(projectId);
  return true;
});

// Load and parse kipe.yml
async function loadProjectConfig(projectPath) {
  const configPath = path.join(projectPath, 'kipe.yml');
  const configPathYaml = path.join(projectPath, 'kipe.yaml');
  
  try {
    const content = fs.existsSync(configPath) 
      ? fs.readFileSync(configPath, 'utf-8')
      : fs.existsSync(configPathYaml)
        ? fs.readFileSync(configPathYaml, 'utf-8')
        : null;
    
    if (content) {
      return yaml.load(content);
    }
  } catch (error) {
    console.error('Error loading kipe.yml:', error);
  }
  
  return generateDefaultConfig(projectPath);
}

// Auto-detect project stack
async function detectStack(projectPath) {
  const stack = [];
  const files = await fs.promises.readdir(projectPath).catch(() => []);
  
  const indicators = {
    'package.json': 'nodejs',
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'bun.lock': 'bun',
    'requirements.txt': 'python',
    'pyproject.toml': 'python',
    'Cargo.toml': 'rust',
    'go.mod': 'go',
    'Procfile': 'heroku',
    '.nvmrc': 'nodejs-nvm',
    '.python-version': 'python-pyenv',
    'Gemfile': 'ruby',
    'composer.json': 'php',
    'pom.xml': 'java-maven',
    'build.gradle': 'java-gradle',
    'CMakeLists.txt': 'cpp-cmake',
    'Makefile': 'make',
    'Dockerfile': 'docker',
    'docker-compose.yml': 'docker-compose',
    '.git': 'git',
    'README.md': 'markdown',
    'tsconfig.json': 'typescript'
  };

  for (const [file, tech] of Object.entries(indicators)) {
    if (files.includes(file)) {
      stack.push(tech);
    }
  }

  // Detect scripts from package.json
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (files.includes('package.json')) {
      const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'));
      if (pkg.scripts) {
        stack.push(...Object.keys(pkg.scripts).map(s => `script:${s}`));
      }
    }
  } catch (e) {}

  return stack.length > 0 ? stack : ['unknown'];
}

// Generate default kipe.yml config
function generateDefaultConfig(projectPath) {
  const stack = detectStack(projectPath);
  
  return {
    project: path.basename(projectPath),
    path: projectPath,
    stack: stack,
    env: {
      NODE_ENV: 'development'
    },
    agents: [
      {
        id: uuidv4(),
        name: 'Code Agent',
        role: 'code-assistant',
        instructions: 'Help with code review, refactoring, and best practices',
        model: 'default',
        contextDir: './src',
        tools: ['read-files', 'write-files', 'search-code'],
        commands: ['npm run dev', 'npm run build', 'npm test'],
        permissions: ['read', 'write'],
        status: 'idle'
      }
    ],
    processes: [
      {
        id: uuidv4(),
        name: 'Dev Server',
        command: 'npm run dev',
        autoStart: false,
        restartPolicy: 'on-failure',
        cwd: projectPath
      }
    ],
    watchers: [],
    notifications: {
      enabled: true,
      events: ['error', 'complete']
    },
    orchestration: {
      mode: 'parallel',
      maxConcurrent: 5
    },
    restartPolicy: 'on-failure',
    permissions: {
      allowFileSystemAccess: true,
      allowNetworkAccess: true,
      allowShellCommands: true
    },
    providers: [
      {
        name: 'default',
        type: 'openai',
        apiKey: '${OPENAI_API_KEY}'
      }
    ],
    hooks: {
      onProjectOpen: [],
      onSwarmStart: [],
      onProcessExit: []
    }
  };
}

// Save kipe.yml
ipcMain.handle('save-kipe-yml', async (event, projectId, config) => {
  try {
    const project = activeProjects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const configPath = path.join(project.path, 'kipe.yml');
    const yamlContent = yaml.dump(config, { indent: 2 });
    
    await fs.promises.writeFile(configPath, yamlContent, 'utf-8');
    project.config = config;
    activeProjects.set(projectId, project);
    
    return { success: true, path: configPath };
  } catch (error) {
    console.error('Error saving kipe.yml:', error);
    throw error;
  }
});

// Settings
ipcMain.handle('get-settings', () => {
  return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

// Activity Log
function addActivityEvent(event) {
  const activityEvent = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...event
  };
  
  activityLog.unshift(activityEvent);
  
  // Keep last 1000 events
  if (activityLog.length > 1000) {
    activityLog = activityLog.slice(0, 1000);
  }
  
  if (mainWindow) {
    mainWindow.webContents.send('activity-event', activityEvent);
  }
  
  return activityEvent;
}

ipcMain.handle('get-activity-log', () => {
  return activityLog;
});

ipcMain.handle('clear-activity-log', () => {
  activityLog = [];
  return true;
});

// Cleanup
function cleanupAllProcesses() {
  terminalSessions.forEach((session, id) => {
    try {
      session.kill();
    } catch (e) {}
  });
  terminalSessions.clear();
  
  processes.forEach((proc, id) => {
    try {
      if (proc.pid) {
        process.kill(proc.pid);
      }
    } catch (e) {}
  });
  processes.clear();
}

console.log('Kipe Main Process initialized');
