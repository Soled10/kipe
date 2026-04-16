const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

let mainWindow = null;
let store = {
  projects: [],
  settings: {
    shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    theme: 'dark',
    notifications: true
  }
};

// Load store from disk
function loadStore() {
  try {
    const storePath = path.join(app.getPath('userData'), 'kipe-store.json');
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      store = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load store:', err);
  }
}

// Save store to disk
function saveStore() {
  try {
    const storePath = path.join(app.getPath('userData'), 'kipe-store.json');
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadStore();
  createWindow();

  // IPC Handlers
  ipcMain.handle('get-projects', async () => {
    return store.projects;
  });

  ipcMain.handle('add-project', async (event, projectPath) => {
    // Validate path
    try {
      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('Not a directory');
      }
    } catch (err) {
      throw new Error('Invalid project path');
    }

    // Check if already exists
    const existing = store.projects.find(p => p.path === projectPath);
    if (existing) {
      return existing;
    }

    // Detect stack
    const stack = detectStack(projectPath);

    // Create project entry
    const project = {
      id: Date.now().toString(),
      name: path.basename(projectPath),
      path: projectPath,
      stack: stack,
      lastOpened: new Date().toISOString()
    };

    store.projects.unshift(project);
    if (store.projects.length > 50) {
      store.projects.pop();
    }
    saveStore();

    return project;
  });

  ipcMain.handle('remove-project', async (event, projectId) => {
    store.projects = store.projects.filter(p => p.id !== projectId);
    saveStore();
    return true;
  });

  ipcMain.handle('get-settings', async () => {
    return store.settings;
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    store.settings = { ...store.settings, ...settings };
    saveStore();
    return store.settings;
  });

  ipcMain.handle('show-open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('read-kipe-yaml', async (event, projectPath) => {
    const yamlPath = path.join(projectPath, 'kipe.yml');
    if (!fs.existsSync(yamlPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(yamlPath, 'utf-8');
      const parsed = yaml.load(content);
      return { content, parsed };
    } catch (err) {
      throw new Error('Failed to parse kipe.yml: ' + err.message);
    }
  });

  ipcMain.handle('write-kipe-yaml', async (event, projectPath, content) => {
    const yamlPath = path.join(projectPath, 'kipe.yml');
    try {
      fs.writeFileSync(yamlPath, content, 'utf-8');
      return true;
    } catch (err) {
      throw new Error('Failed to write kipe.yml: ' + err.message);
    }
  });

  ipcMain.handle('get-project-files', async (event, projectPath, limit = 100) => {
    const files = [];
    
    function scanDir(dir, depth = 0) {
      if (depth > 3 || files.length >= limit) return;
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.nvmrc' && entry.name !== '.python-version') {
            continue;
          }
          
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', 'target'].includes(entry.name)) {
              continue;
            }
            scanDir(fullPath, depth + 1);
          } else {
            files.push({
              name: entry.name,
              path: fullPath,
              relative: path.relative(projectPath, fullPath)
            });
            
            if (files.length >= limit) break;
          }
        }
      } catch (err) {
        // Ignore errors
      }
    }
    
    scanDir(projectPath);
    return files;
  });
});

function detectStack(projectPath) {
  const indicators = {
    'JavaScript/Node.js': ['package.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'],
    'TypeScript': ['tsconfig.json', 'tsconfig.tsbuildinfo'],
    'Python': ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    'Rust': ['Cargo.toml', 'Cargo.lock'],
    'Go': ['go.mod', 'go.sum'],
    'Java': ['pom.xml', 'build.gradle', 'settings.gradle'],
    'Ruby': ['Gemfile', 'Gemfile.lock'],
    'PHP': ['composer.json', 'composer.lock'],
    'Docker': ['Dockerfile', 'docker-compose.yml'],
    'React': ['src/App.jsx', 'src/App.tsx', 'public/index.html']
  };

  const detected = [];
  
  for (const [stack, files] of Object.entries(indicators)) {
    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      if (fs.existsSync(fullPath)) {
        detected.push(stack);
        break;
      }
    }
  }

  // Detect scripts from package.json
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts) {
        const commonScripts = ['dev', 'start', 'build', 'test', 'lint'];
        const foundScripts = commonScripts.filter(s => pkg.scripts[s]);
        if (foundScripts.length > 0) {
          detected.push(`Scripts: ${foundScripts.join(', ')}`);
        }
      }
    }
  } catch (err) {
    // Ignore
  }

  return detected.length > 0 ? detected : ['Unknown'];
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
