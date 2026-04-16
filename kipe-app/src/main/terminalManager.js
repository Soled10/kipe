/**
 * Kipe - Terminal Manager with PTY support
 */

const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class TerminalManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession(options = {}) {
    const {
      cwd = process.cwd(),
      shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      env = process.env,
      cols = 80,
      rows = 24
    } = options;

    const id = uuidv4();
    
    try {
      const session = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cwd,
        env,
        cols,
        rows
      });

      this.sessions.set(id, {
        id,
        session,
        shell,
        cwd,
        createdAt: Date.now(),
        status: 'active'
      });

      return { id, success: true };
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      return { id, success: false, error: error.message };
    }
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  resizeSession(id, cols, rows) {
    const sessionData = this.sessions.get(id);
    if (sessionData && sessionData.session) {
      sessionData.session.resize(cols, rows);
      return true;
    }
    return false;
  }

  writeSession(id, data) {
    const sessionData = this.sessions.get(id);
    if (sessionData && sessionData.session) {
      sessionData.session.write(data);
      return true;
    }
    return false;
  }

  killSession(id) {
    const sessionData = this.sessions.get(id);
    if (sessionData && sessionData.session) {
      sessionData.session.kill();
      sessionData.status = 'killed';
      this.sessions.delete(id);
      return true;
    }
    return false;
  }

  getAllSessions() {
    const sessions = [];
    this.sessions.forEach((data, id) => {
      sessions.push({
        id,
        shell: data.shell,
        cwd: data.cwd,
        createdAt: data.createdAt,
        status: data.status
      });
    });
    return sessions;
  }

  onSessionData(id, callback) {
    const sessionData = this.sessions.get(id);
    if (sessionData && sessionData.session) {
      sessionData.session.onData(callback);
      return true;
    }
    return false;
  }

  cleanup() {
    this.sessions.forEach((data) => {
      try {
        if (data.session) {
          data.session.kill();
        }
      } catch (e) {}
    });
    this.sessions.clear();
  }
}

module.exports = TerminalManager;
