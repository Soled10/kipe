const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kipeAPI', {
  // Projects
  getProjects: () => ipcRenderer.invoke('get-projects'),
  addProject: (projectPath) => ipcRenderer.invoke('add-project', projectPath),
  removeProject: (projectId) => ipcRenderer.invoke('remove-project', projectId),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Dialogs
  showOpenDirectoryDialog: () => ipcRenderer.invoke('show-open-directory-dialog'),
  
  // Kipe YAML
  readKipeYaml: (projectPath) => ipcRenderer.invoke('read-kipe-yaml', projectPath),
  writeKipeYaml: (projectPath, content) => ipcRenderer.invoke('write-kipe-yaml', projectPath, content),
  
  // Project files
  getProjectFiles: (projectPath, limit) => ipcRenderer.invoke('get-project-files', projectPath, limit),
  
  // Event listeners
  onActivityUpdate: (callback) => {
    ipcRenderer.on('activity-update', (event, data) => callback(data));
  },
  onProcessUpdate: (callback) => {
    ipcRenderer.on('process-update', (event, data) => callback(data));
  }
});
