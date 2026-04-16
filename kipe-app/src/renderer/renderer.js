// ============================================
// KIPE - Renderer Process
// ============================================

// State
let currentProject = null;
let currentView = 'overview';
let agents = [];
let processes = [];
let activityEvents = [];
let settings = {
  shell: '/bin/bash',
  theme: 'dark',
  notifications: true
};

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const workspaceScreen = document.getElementById('workspace-screen');
const projectsList = document.getElementById('projects-list');
const noProjects = document.getElementById('no-projects');
const navItems = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.view');
const projectNameEl = document.getElementById('project-name');
const projectPathEl = document.getElementById('project-path');
const agentsListEl = document.getElementById('agents-list');
const noAgents = document.getElementById('no-agents');
const processesTableBody = document.getElementById('processes-table-body');
const noProcesses = document.getElementById('no-processes');
const activityFeedEl = document.getElementById('activity-feed');
const noActivity = document.getElementById('no-activity');
const configYamlEl = document.getElementById('config-yaml');
const modalAgent = document.getElementById('modal-agent');
const formAgent = document.getElementById('form-agent');
const toastContainer = document.getElementById('toast-container');

// ============================================
// Initialization
// ============================================

async function init() {
  await loadSettings();
  await loadProjects();
  setupEventListeners();
}

// ============================================
// Project Management
// ============================================

async function loadProjects() {
  try {
    const projects = await window.kipeAPI.getProjects();
    renderProjects(projects);
  } catch (err) {
    showToast('Failed to load projects', 'error');
  }
}

function renderProjects(projects) {
  if (projects.length === 0) {
    projectsList.style.display = 'none';
    noProjects.style.display = 'flex';
  } else {
    projectsList.style.display = 'grid';
    noProjects.style.display = 'none';
    
    projectsList.innerHTML = projects.map(project => `
      <div class="project-card" data-project-id="${project.id}">
        <h3>${escapeHtml(project.name)}</h3>
        <div class="path">${escapeHtml(project.path)}</div>
        <span class="stack">${escapeHtml(project.stack[0])}</span>
      </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const projectId = card.dataset.projectId;
        const project = projects.find(p => p.id === projectId);
        if (project) {
          openProject(project);
        }
      });
    });
  }
}

async function openProjectDialog() {
  try {
    const projectPath = await window.kipeAPI.showOpenDirectoryDialog();
    if (projectPath) {
      const project = await window.kipeAPI.addProject(projectPath);
      showToast(`Project "${project.name}" opened`, 'success');
      await loadProjects();
      openProject(project);
    }
  } catch (err) {
    showToast('Failed to open project: ' + err.message, 'error');
  }
}

function openProject(project) {
  currentProject = project;
  
  // Update UI
  projectNameEl.textContent = project.name;
  projectPathEl.textContent = project.path;
  
  // Show workspace
  welcomeScreen.style.display = 'none';
  workspaceScreen.style.display = 'flex';
  
  // Load project data
  loadProjectConfig();
  updateStats();
  
  // Add activity event
  addActivityEvent('info', 'Project Opened', `Opened project ${project.name}`);
  
  showToast(`Welcome to ${project.name}`, 'success');
}

async function closeProject() {
  currentProject = null;
  workspaceScreen.style.display = 'none';
  welcomeScreen.style.display = 'flex';
  await loadProjects();
}

// ============================================
// Navigation
// ============================================

function switchView(viewName) {
  currentView = viewName;
  
  // Update nav items
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  
  // Update views
  views.forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });
}

// ============================================
// Settings
// ============================================

async function loadSettings() {
  try {
    settings = await window.kipeAPI.getSettings();
    document.getElementById('setting-shell').value = settings.shell;
    document.getElementById('setting-theme').value = settings.theme;
    document.getElementById('setting-notifications').checked = settings.notifications;
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettings() {
  try {
    settings.shell = document.getElementById('setting-shell').value;
    settings.theme = document.getElementById('setting-theme').value;
    settings.notifications = document.getElementById('setting-notifications').checked;
    
    await window.kipeAPI.saveSettings(settings);
    showToast('Settings saved', 'success');
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

// ============================================
// Agents
// ============================================

function renderAgents() {
  if (agents.length === 0) {
    agentsListEl.style.display = 'none';
    noAgents.style.display = 'flex';
  } else {
    agentsListEl.style.display = 'grid';
    noAgents.style.display = 'none';
    
    agentsListEl.innerHTML = agents.map(agent => `
      <div class="agent-card">
        <div class="agent-header">
          <span class="agent-name">${escapeHtml(agent.name)}</span>
          <span class="agent-status ${agent.status}">${agent.status}</span>
        </div>
        <div class="agent-role">${escapeHtml(agent.role)}</div>
        <span class="agent-model">${escapeHtml(agent.model)}</span>
      </div>
    `).join('');
  }
  
  updateStats();
}

function showNewAgentModal() {
  modalAgent.classList.add('active');
}

function hideNewAgentModal() {
  modalAgent.classList.remove('active');
  formAgent.reset();
}

async function createAgent(data) {
  const agent = {
    id: Date.now().toString(),
    name: data.name,
    role: data.role,
    instructions: data.instructions,
    model: data.model,
    status: 'idle',
    createdAt: new Date().toISOString()
  };
  
  agents.push(agent);
  renderAgents();
  addActivityEvent('success', 'Agent Created', `Created agent "${agent.name}"`);
  showToast(`Agent "${agent.name}" created`, 'success');
}

// ============================================
// Processes
// ============================================

function renderProcesses() {
  if (processes.length === 0) {
    document.getElementById('processes-table').style.display = 'none';
    noProcesses.style.display = 'flex';
  } else {
    document.getElementById('processes-table').style.display = 'table';
    noProcesses.style.display = 'none';
    
    processesTableBody.innerHTML = processes.map(process => `
      <tr>
        <td>${escapeHtml(process.name)}</td>
        <td><span class="status-badge ${process.status}">${process.status}</span></td>
        <td>${process.pid || '-'}</td>
        <td>${process.cpu || '0%'}</td>
        <td>${process.memory || '0 MB'}</td>
        <td>${formatUptime(process.uptime)}</td>
        <td>
          <button class="btn btn-secondary" onclick="toggleProcess('${process.id}')">
            ${process.status === 'running' ? 'Stop' : 'Start'}
          </button>
        </td>
      </tr>
    `).join('');
  }
  
  updateStats();
}

function formatUptime(seconds) {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`;
  }
  return `${mins}m ${seconds % 60}s`;
}

async function createProcess(data) {
  const process = {
    id: Date.now().toString(),
    name: data.name,
    command: data.command,
    status: 'pending',
    pid: null,
    cpu: '0%',
    memory: '0 MB',
    uptime: 0,
    createdAt: new Date().toISOString()
  };
  
  processes.push(process);
  renderProcesses();
  addActivityEvent('info', 'Process Created', `Created process "${process.name}"`);
  showToast(`Process "${process.name}" created`, 'success');
}

// ============================================
// Activity Feed
// ============================================

function addActivityEvent(type, title, description) {
  const event = {
    id: Date.now().toString(),
    type,
    title,
    description,
    timestamp: new Date().toISOString()
  };
  
  activityEvents.unshift(event);
  renderActivityFeed();
  updateStats();
}

function renderActivityFeed() {
  if (activityEvents.length === 0) {
    activityFeedEl.style.display = 'none';
    noActivity.style.display = 'flex';
  } else {
    activityFeedEl.style.display = 'flex';
    noActivity.style.display = 'none';
    
    activityFeedEl.innerHTML = activityEvents.map(event => `
      <div class="activity-item type-${event.type}">
        <div class="activity-time">${formatTime(event.timestamp)}</div>
        <div class="activity-content">
          <div class="activity-title">${escapeHtml(event.title)}</div>
          <div class="activity-description">${escapeHtml(event.description)}</div>
        </div>
      </div>
    `).join('');
  }
}

function clearActivityFeed() {
  activityEvents = [];
  renderActivityFeed();
  updateStats();
}

// ============================================
// Config (kipe.yml)
// ============================================

async function loadProjectConfig() {
  if (!currentProject) return;
  
  try {
    const result = await window.kipeAPI.readKipeYaml(currentProject.path);
    if (result) {
      configYamlEl.value = result.content;
      
      // Parse and populate agents/processes from config
      if (result.parsed?.agents) {
        agents = result.parsed.agents.map((a, i) => ({
          id: `yaml-${i}`,
          name: a.name,
          role: a.role || 'AI Agent',
          model: a.model || 'gpt-4',
          status: 'idle',
          instructions: a.instructions || ''
        }));
        renderAgents();
      }
      
      if (result.parsed?.processes) {
        processes = result.parsed.processes.map((p, i) => ({
          id: `yaml-${i}`,
          name: p.name,
          command: p.command,
          status: p.status || 'stopped',
          pid: null,
          cpu: '0%',
          memory: '0 MB',
          uptime: 0
        }));
        renderProcesses();
      }
    } else {
      configYamlEl.value = getDefaultKipeYaml();
    }
  } catch (err) {
    configYamlEl.value = getDefaultKipeYaml();
  }
}

function getDefaultKipeYaml() {
  return `# Kipe Configuration File
# Learn more at: kipe.dev/docs

project:
  name: ${currentProject?.name || 'my-project'}
  path: .

# AI Agents
agents:
  - name: Code Reviewer
    role: Reviews code changes and suggests improvements
    model: gpt-4
    instructions: |
      You are an expert code reviewer.
      Focus on code quality, performance, and best practices.
    
  - name: Test Runner
    role: Runs tests and reports failures
    model: gpt-3.5-turbo
    commands:
      - npm test
      - npm run test:coverage

# Processes
processes:
  - name: Dev Server
    command: npm run dev
    autoRestart: true
    watch:
      - src/
    
  - name: Build Watcher
    command: npm run build:watch
    autoRestart: false

# Notifications
notifications:
  enabled: true
  events:
    - build.complete
    - test.failure
    - agent.complete
`;
}

async function saveConfig() {
  if (!currentProject) return;
  
  try {
    const content = configYamlEl.value;
    await window.kipeAPI.writeKipeYaml(currentProject.path, content);
    showToast('Configuration saved', 'success');
    addActivityEvent('success', 'Config Saved', 'kipe.yml updated');
  } catch (err) {
    showToast('Failed to save config: ' + err.message, 'error');
  }
}

// ============================================
// Stats
// ============================================

function updateStats() {
  document.getElementById('stat-agents').textContent = agents.filter(a => a.status !== 'stopped').length;
  document.getElementById('stat-processes').textContent = processes.filter(p => p.status === 'running').length;
  document.getElementById('stat-events').textContent = activityEvents.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.timestamp).toDateString() === today;
  }).length;
  
  if (currentProject?.stack) {
    document.getElementById('stat-stack').textContent = currentProject.stack[0];
  }
}

// ============================================
// Kipe Swarm
// ============================================

async function startSwarm() {
  if (!currentProject) return;
  
  showToast('Starting Kipe Swarm...', 'info');
  addActivityEvent('info', 'Kipe Swarm', 'Initializing swarm mode');
  
  // Simulate starting all agents and processes
  for (const agent of agents) {
    agent.status = 'busy';
    addActivityEvent('info', 'Agent Started', `"${agent.name}" activated`);
  }
  
  for (const proc of processes) {
    if (proc.status !== 'running') {
      proc.status = 'running';
      proc.pid = Math.floor(Math.random() * 10000) + 1000;
      proc.uptime = 0;
      addActivityEvent('success', 'Process Started', `"${proc.name}" started (PID: ${proc.pid})`);
    }
  }
  
  renderAgents();
  renderProcesses();
  
  setTimeout(() => {
    showToast('Kipe Swarm active!', 'success');
    addActivityEvent('success', 'Kipe Swarm', 'All systems operational');
  }, 2000);
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Welcome screen
  document.getElementById('btn-open-project').addEventListener('click', openProjectDialog);
  
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view);
    });
  });
  
  // Close project
  document.getElementById('btn-close-project').addEventListener('click', closeProject);
  
  // Kipe Swarm
  document.getElementById('btn-swarm').addEventListener('click', startSwarm);
  
  // Quick actions
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      switch (action) {
        case 'new-agent':
          showNewAgentModal();
          break;
        case 'new-process':
          // Could open a process modal
          showToast('Process creation coming soon', 'info');
          break;
        case 'new-terminal':
          switchView('terminal');
          break;
        case 'edit-config':
          switchView('config');
          break;
      }
    });
  });
  
  // New agent button
  document.getElementById('btn-new-agent').addEventListener('click', showNewAgentModal);
  
  // New process button
  document.getElementById('btn-new-process').addEventListener('click', () => {
    showToast('Process creation coming soon', 'info');
  });
  
  // New terminal button
  document.getElementById('btn-new-terminal').addEventListener('click', () => {
    showToast('Terminal coming soon', 'info');
  });
  
  // Save config
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);
  
  // Clear activity
  document.getElementById('btn-clear-activity').addEventListener('click', clearActivityFeed);
  
  // Save settings
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  
  // Modal
  modalAgent.querySelector('.modal-close').addEventListener('click', hideNewAgentModal);
  
  formAgent.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('agent-name').value,
      role: document.getElementById('agent-role').value,
      instructions: document.getElementById('agent-instructions').value,
      model: document.getElementById('agent-model').value
    };
    createAgent(data);
    hideNewAgentModal();
  });
  
  // Close modal on outside click
  modalAgent.addEventListener('click', (e) => {
    if (e.target === modalAgent) {
      hideNewAgentModal();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape') {
      hideNewAgentModal();
    }
    
    // Cmd/Ctrl + K for command palette (future)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      showToast('Command palette coming soon', 'info');
    }
  });
}

// ============================================
// Start App
// ============================================

init();
