/**
 * Kipe - Process Manager for native OS processes
 */

const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class ProcessManager {
  constructor() {
    this.processes = new Map();
    this.maxHistory = 1000;
  }

  spawnProcess(options) {
    const {
      command,
      args = [],
      cwd = process.cwd(),
      env = process.env,
      name = 'unnamed',
      autoRestart = false,
      restartPolicy = 'never',
      maxRestarts = 3
    } = options;

    const id = uuidv4();
    const startTime = Date.now();
    
    const [cmd, ...cmdArgs] = command.split(' ');
    
    const child = spawn(cmd, [...cmdArgs, ...args], {
      cwd,
      env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const processInfo = {
      id,
      name,
      command,
      args,
      cwd,
      pid: child.pid,
      status: 'running',
      startTime,
      exitCode: null,
      signal: null,
      restartCount: 0,
      autoRestart,
      restartPolicy,
      maxRestarts,
      outputBuffer: [],
      cpuUsage: 0,
      memoryUsage: 0
    };

    // Capture stdout
    child.stdout.on('data', (data) => {
      const output = data.toString();
      processInfo.outputBuffer.push({
        type: 'stdout',
        data: output,
        timestamp: Date.now()
      });
      
      // Trim buffer
      if (processInfo.outputBuffer.length > this.maxHistory) {
        processInfo.outputBuffer = processInfo.outputBuffer.slice(-this.maxHistory);
      }
    });

    // Capture stderr
    child.stderr.on('data', (data) => {
      const output = data.toString();
      processInfo.outputBuffer.push({
        type: 'stderr',
        data: output,
        timestamp: Date.now()
      });
      
      if (processInfo.outputBuffer.length > this.maxHistory) {
        processInfo.outputBuffer = processInfo.outputBuffer.slice(-this.maxHistory);
      }
    });

    // Handle process exit
    child.on('exit', (code, signal) => {
      processInfo.status = 'exited';
      processInfo.exitCode = code;
      processInfo.signal = signal;
      processInfo.endTime = Date.now();

      // Auto-restart logic
      if (autoRestart && this.shouldRestart(processInfo)) {
        if (processInfo.restartCount < maxRestarts) {
          processInfo.restartCount++;
          setTimeout(() => {
            this.spawnProcess({ ...options, name });
          }, 1000);
        }
      }
    });

    child.on('error', (error) => {
      processInfo.status = 'error';
      processInfo.error = error.message;
    });

    this.processes.set(id, processInfo);
    return { id, pid: child.pid, success: true };
  }

  shouldRestart(processInfo) {
    switch (processInfo.restartPolicy) {
      case 'always':
        return true;
      case 'on-failure':
        return processInfo.exitCode !== 0;
      case 'never':
        return false;
      default:
        return false;
    }
  }

  getProcess(id) {
    return this.processes.get(id);
  }

  getAllProcesses() {
    const processes = [];
    this.processes.forEach((info, id) => {
      processes.push({
        id,
        name: info.name,
        command: info.command,
        pid: info.pid,
        status: info.status,
        cwd: info.cwd,
        startTime: info.startTime,
        exitCode: info.exitCode,
        restartCount: info.restartCount
      });
    });
    return processes;
  }

  stopProcess(id) {
    const processInfo = this.processes.get(id);
    if (processInfo && processInfo.pid) {
      try {
        // Try graceful shutdown first
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', processInfo.pid.toString(), '/T', '/F']);
        } else {
          process.kill(processInfo.pid, 'SIGTERM');
        }
        processInfo.status = 'stopped';
        return true;
      } catch (error) {
        console.error('Error stopping process:', error);
        return false;
      }
    }
    return false;
  }

  killProcess(id) {
    const processInfo = this.processes.get(id);
    if (processInfo && processInfo.pid) {
      try {
        process.kill(processInfo.pid, 'SIGKILL');
        processInfo.status = 'killed';
        this.processes.delete(id);
        return true;
      } catch (error) {
        console.error('Error killing process:', error);
        return false;
      }
    }
    return false;
  }

  restartProcess(id) {
    const processInfo = this.processes.get(id);
    if (processInfo) {
      this.stopProcess(id);
      setTimeout(() => {
        this.spawnProcess({
          command: processInfo.command,
          cwd: processInfo.cwd,
          name: processInfo.name,
          autoRestart: processInfo.autoRestart,
          restartPolicy: processInfo.restartPolicy
        });
      }, 500);
      return true;
    }
    return false;
  }

  getProcessOutput(id, lines = 100) {
    const processInfo = this.processes.get(id);
    if (processInfo) {
      return processInfo.outputBuffer.slice(-lines);
    }
    return [];
  }

  updateProcessStats() {
    // Update CPU and memory usage for all processes
    // This is a simplified implementation
    this.processes.forEach((info) => {
      if (info.pid && info.status === 'running') {
        try {
          // Note: Getting accurate per-process stats requires native modules
          // This is a placeholder for the real implementation
          info.lastStatsUpdate = Date.now();
        } catch (e) {}
      }
    });
  }

  cleanup() {
    this.processes.forEach((info) => {
      if (info.pid) {
        try {
          process.kill(info.pid, 'SIGTERM');
        } catch (e) {}
      }
    });
    this.processes.clear();
  }
}

module.exports = ProcessManager;
