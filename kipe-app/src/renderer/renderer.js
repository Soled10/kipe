/**
 * Kipe - Renderer Process (Frontend Logic)
 */

const { ipcRenderer, remote } = require('electron');
const yaml = require('js-yaml');

// State
let currentProject = null;
let currentView = 'workspace';
let terminalSessions = [];
let agents = [];
let processes = [];
let activityEvents = [];
let settings = {};

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const workspaceScreen = document.getElementById('workspace-screen');
const projectsList = document.getElementById('projects-list');
const navItems = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.view');
const projectNameEl = document.getElementById('project-name');
const projectPathEl = document.getElementById('project-path');
const agentsListEl = document.getElementById('agents-list');
const processesTableEl = document.getElementById('processes-table');
const activityFeedEl = document.getElementById('activity-feed');
const configYamlEl = document.getElementById('config-yaml');
const modalAgent = document.getElementById('modal-agent');
const formAgent = document.getElementById('form-agent');
const toastContainer = document.getElementById('toast-container');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadProjects();
  setupEventListeners();
  showToast('info', 'Welcome to Kipe!');
});

// Load Settings
async function loadSettings() {
  try {
    settings = await ipcRenderer.invoke('get-settings');
    applySettings();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Apply Settings
function applySettings() {
  if (settings.theme === 'light') {
    document.body.classList.add('light-theme');
  }
}

// Load Projects
async function loadProjects() {
  try {
    const projects = await ipcRenderer.invoke('get-projects');
    renderProjectsList(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

// Render Projects List
function renderProjectsList(projects) {
  if (!projects || projects.length === 0) {
    projectsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <h3>No recent projects</h3>
        <p>Open a project folder to get started</p>
      </div>
    `;
    return;
  }

  projectsList.innerHTML = projects.map(project => `
    <div class="project-item" data-project-id="${project.id}" data-project-path="${project.path}">
      <div>
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-path">${escapeHtml(project.path)}</div>
      </div>
      <div class="project-stack">
        ${project.stack ? project.stack.slice(0, 3).map(s => `<span class="badge">${escapeHtml(s)}</span>`).join('') : ''}
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('click', async () => {
      const projectId = item.dataset.projectId;
      const projectPath = item.dataset.projectPath;
      await openProject(projectId || projectPath);
    });
  });
}

// Open Project
async function openProject(projectIdOrPath) {
  try {
    currentProject = await ipcRenderer.invoke('open-project', projectIdOrPath);
    
    if (currentProject) {
      showWorkspace();
      updateProjectHeader();
      await loadActivityLog();
      await loadConfig();
      showToast('success', `Opened project: ${currentProject.name}`);
    }
  } catch (error) {
    showToast('error', `Failed to open project: ${error.message}`);
  }
}

// Show Workspace
function showWorkspace() {
  welcomeScreen.classList.remove('active');
  workspaceScreen.classList.add('active');
}

// Update Project Header
function updateProjectHeader() {
  if (currentProject) {
    projectNameEl.textContent = currentProject.name;
    projectPathEl.textContent = currentProject.path;
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Open Project Button
  document.getElementById('btn-open-project').addEventListener('click', async () => {
    try {
      const result = await remote.dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const projectPath = result.filePaths[0];
        const project = await ipcRenderer.invoke('add-project', projectPath);
        if (project) {
          await loadProjects();
          await openProject(project.id);
        }
      }
    } catch (error) {
      showToast('error', `Failed to open project: ${error.message}`);
    }
  });

  // Back to Home
  document.getElementById('btn-back-home').addEventListener('click', () => {
    currentProject = null;
    workspaceScreen.classList.remove('active');
    welcomeScreen.classList.add('active');
    loadProjects();
  });

  // New Terminal
  document.getElementById('btn-new-terminal').addEventListener('click', () => {
    createTerminal();
  });

  // Kipe Swarm
  document.getElementById('btn-swarm').addEventListener('click', () => {
    startSwarmMode();
  });

  // New Agent
  document.getElementById('btn-new-agent').addEventListener('click', () => {
    showAgentModal();
  });

  // Save Config
  document.getElementById('btn-save-config').addEventListener('click', async () => {
    await saveConfig();
  });

  // Clear Activity
  document.getElementById('btn-clear-activity').addEventListener('click', async () => {
    await ipcRenderer.invoke('clear-activity-log');
    activityEvents = [];
    renderActivityFeed();
    showToast('info', 'Activity log cleared');
  });

  // Save Settings
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    await saveSettings();
  });

  // Modal Close
  document.querySelector('.modal-close').addEventListener('click', hideAgentModal);
  document.querySelector('.modal-cancel').addEventListener('click', hideAgentModal);
  
  // Modal Save
  document.querySelector('.modal-save').addEventListener('click', saveAgent);

  // Action Cards
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      handleQuickAction(action);
    });
  });

  // Listen for activity events from main process
  ipcRenderer.on('activity-event', (event, activityEvent) => {
    activityEvents.unshift(activityEvent);
    renderActivityFeed();
  });
}

// Switch View
function switchView(viewName) {
  currentView = viewName;
  
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  
  views.forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });
}

// Create Terminal
function createTerminal() {
  const terminalContainer = document.getElementById('terminal-container');
  const sessionId = `term-${Date.now()}`;
  
  const termEl = document.createElement('div');
  termEl.className = 'terminal-session';
  termEl.id = sessionId;
  termEl.innerHTML = `
    <div class="terminal-header">
      <span class="terminal-title">Terminal ${terminalSessions.length + 1}</span>
      <button class="terminal-close" data-session="${sessionId}">&times;</button>
    </div>
    <div class="terminal-body">
      <pre>$ Ready to execute commands...</pre>
    </div>
  `;
  
  terminalContainer.appendChild(termEl);
  terminalSessions.push({ id: sessionId, name: `Terminal ${terminalSessions.length + 1}` });
  
  showToast('info', 'Terminal created (PTY integration pending native module)');
}

// Start Swarm Mode
function startSwarmMode() {
  if (!currentProject) return;
  
  showToast('info', 'Starting Kipe Swarm mode...');
  
  // Simulate starting all agents and processes
  addActivityEvent({
    type: 'info',
    message: 'Kipe Swarm started',
    details: `Initializing all agents and processes for ${currentProject.name}`
  });
  
  // In production, this would actually start all configured agents and processes
  setTimeout(() => {
    showToast('success', 'Kipe Swarm active! All agents initialized.');
  }, 1500);
}

// Agent Modal
function showAgentModal(agent = null) {
  document.getElementById('modal-agent-title').textContent = agent ? 'Edit Agent' : 'New Agent';
  
  if (agent) {
    formAgent.name.value = agent.name;
    formAgent.role.value = agent.role;
    formAgent.instructions.value = agent.instructions;
    formAgent.model.value = agent.model;
    formAgent.contextDir.value = agent.contextDir;
    formAgent.tools.value = agent.tools.join(', ');
    formAgent.commands.value = agent.commands.join(', ');
  } else {
    formAgent.reset();
  }
  
  modalAgent.classList.add('active');
}

function hideAgentModal() {
  modalAgent.classList.remove('active');
}

async function saveAgent() {
  const formData = new FormData(formAgent);
  const agentData = {
    name: formData.get('name'),
    role: formData.get('role'),
    instructions: formData.get('instructions'),
    model: formData.get('model') || 'default',
    contextDir: formData.get('contextDir') || './',
    tools: formData.get('tools').split(',').map(t => t.trim()).filter(Boolean),
    commands: formData.get('commands').split(',').map(c => c.trim()).filter(Boolean),
    permissions: ['read', 'write'],
    status: 'idle'
  };
  
  if (currentProject && currentProject.config) {
    if (!currentProject.config.agents) {
      currentProject.config.agents = [];
    }
    currentProject.config.agents.push(agentData);
    
    await saveConfig();
    await loadAgents();
    showToast('success', 'Agent created successfully');
  }
  
  hideAgentModal();
}

// Load Agents
async function loadAgents() {
  if (!currentProject || !currentProject.config) return;
  
  agents = currentProject.config.agents || [];
  renderAgents();
}

// Render Agents
function renderAgents() {
  if (!agents || agents.length === 0) {
    agentsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤖</div>
        <h3>No agents configured</h3>
        <p>Create your first AI agent for this project</p>
      </div>
    `;
    return;
  }
  
  agentsListEl.innerHTML = agents.map(agent => `
    <div class="agent-card">
      <div class="agent-header">
        <span class="agent-name">${escapeHtml(agent.name)}</span>
        <span class="agent-status ${agent.status || 'idle'}">${agent.status || 'idle'}</span>
      </div>
      <div class="agent-role">${escapeHtml(agent.role || 'general')}</div>
      <div class="agent-instructions">${escapeHtml(agent.instructions || 'No instructions')}</div>
      <div class="agent-meta">
        <span>Model: ${escapeHtml(agent.model || 'default')}</span>
        <span>Tools: ${(agent.tools || []).length}</span>
      </div>
    </div>
  `).join('');
}

// Load Processes
async function loadProcesses() {
  if (!currentProject || !currentProject.config) return;
  
  processes = currentProject.config.processes || [];
  renderProcesses();
}

// Render Processes
function renderProcesses() {
  if (!processes || processes.length === 0) {
    processesTableEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>No processes configured</h3>
        <p>Add processes to manage your development servers</p>
      </div>
    `;
    return;
  }
  
  processesTableEl.innerHTML = processes.map(proc => `
    <div class="process-row">
      <div class="process-name">${escapeHtml(proc.name)}</div>
      <div class="process-command">${escapeHtml(proc.command)}</div>
      <div class="process-pid">-</div>
      <div class="process-status">stopped</div>
      <div class="process-cpu">-</div>
      <div class="process-actions">
        <button class="btn-icon" title="Start">▶</button>
        <button class="btn-icon" title="Logs">📋</button>
      </div>
    </div>
  `).join('');
}

// Load Activity Log
async function loadActivityLog() {
  try {
    activityEvents = await ipcRenderer.invoke('get-activity-log');
    renderActivityFeed();
  } catch (error) {
    console.error('Error loading activity log:', error);
  }
}

// Render Activity Feed
function renderActivityFeed() {
  if (!activityEvents || activityEvents.length === 0) {
    activityFeedEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No activity yet</h3>
        <p>Activity will appear here as you work</p>
      </div>
    `;
    return;
  }
  
  activityFeedEl.innerHTML = activityEvents.map(event => {
    const date = new Date(event.timestamp);
    const timeStr = date.toLocaleTimeString();
    
    return `
      <div class="activity-item type-${event.type || 'info'}">
        <div class="activity-timestamp">${timeStr}</div>
        <div class="activity-content">
          <div class="activity-message">${escapeHtml(event.message)}</div>
          ${event.details ? `<div class="activity-details">${escapeHtml(event.details)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Add Activity Event
function addActivityEvent(event) {
  activityEvents.unshift({
    id: `evt-${Date.now()}`,
    timestamp: Date.now(),
    ...event
  });
  renderActivityFeed();
}

// Load Config
async function loadConfig() {
  if (!currentProject || !currentProject.config) return;
  
  try {
    const yamlContent = yaml.dump(currentProject.config, { indent: 2 });
    configYamlEl.value = yamlContent;
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save Config
async function saveConfig() {
  if (!currentProject) return;
  
  try {
    const configContent = configYamlEl.value;
    const config = yaml.load(configContent);
    
    await ipcRenderer.invoke('save-kipe-yml', currentProject.id, config);
    currentProject.config = config;
    
    await loadAgents();
    await loadProcesses();
    
    showToast('success', 'Configuration saved successfully');
  } catch (error) {
    showToast('error', `Failed to save config: ${error.message}`);
  }
}

// Save Settings
async function saveSettings() {
  const newSettings = {
    theme: document.getElementById('setting-theme').value,
    shell: document.getElementById('setting-shell').value,
    fontSize: parseInt(document.getElementById('setting-fontsize').value),
    notifications: {
      buildComplete: document.getElementById('notif-build').checked,
      testComplete: document.getElementById('notif-test').checked,
      errorCritical: document.getElementById('notif-error').checked,
      agentTaskComplete: document.getElementById('notif-agent').checked
    }
  };
  
  try {
    await ipcRenderer.invoke('save-settings', newSettings);
    settings = newSettings;
    showToast('success', 'Settings saved');
  } catch (error) {
    showToast('error', `Failed to save settings: ${error.message}`);
  }
}

// Quick Actions
function handleQuickAction(action) {
  switch (action) {
    case 'new-project':
      document.getElementById('btn-open-project').click();
      break;
    case 'settings':
      if (currentProject) {
        switchView('settings');
      } else {
        showToast('warning', 'Open a project first');
      }
      break;
    case 'docs':
      showToast('info', 'Documentation coming soon!');
      break;
  }
}

// Toast Notifications
function showToast(type, message) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || 'ℹ';
}

// Utility: Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize views when project is loaded
async function initializeWorkspaceViews() {
  await loadAgents();
  await loadProcesses();
  await loadActivityLog();
}

console.log('Kipe Renderer initialized');
