/**
 * Kipe - Agent Manager for AI Agents
 */

const { v4: uuidv4 } = require('uuid');

class AgentManager {
  constructor() {
    this.agents = new Map();
    this.subAgents = new Map(); // parentAgentId -> [subAgents]
    this.messageBus = []; // Internal message bus for agent communication
    this.maxMessages = 500;
  }

  createAgent(options) {
    const {
      name,
      role,
      instructions,
      model = 'default',
      contextDir = './',
      tools = [],
      commands = [],
      permissions = ['read'],
      provider = 'default',
      status = 'idle'
    } = options;

    const id = uuidv4();
    
    const agent = {
      id,
      name,
      role,
      instructions,
      model,
      contextDir,
      tools,
      commands,
      permissions,
      provider,
      status,
      createdAt: Date.now(),
      lastActiveAt: null,
      tasksCompleted: 0,
      currentTask: null,
      subAgents: [],
      metadata: {}
    };

    this.agents.set(id, agent);
    return agent;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  updateAgent(id, updates) {
    const agent = this.agents.get(id);
    if (agent) {
      Object.assign(agent, updates);
      return agent;
    }
    return null;
  }

  deleteAgent(id) {
    // Also delete sub-agents
    const subAgentsList = this.subAgents.get(id) || [];
    subAgentsList.forEach(subId => this.agents.delete(subId));
    this.subAgents.delete(id);
    
    return this.agents.delete(id);
  }

  createSubAgent(parentId, options) {
    const parent = this.agents.get(parentId);
    if (!parent) {
      throw new Error('Parent agent not found');
    }

    const subAgent = this.createAgent({
      ...options,
      status: 'active'
    });

    if (!this.subAgents.has(parentId)) {
      this.subAgents.set(parentId, []);
    }
    this.subAgents.get(parentId).push(subAgent.id);

    parent.subAgents.push(subAgent.id);
    
    return subAgent;
  }

  getSubAgents(parentId) {
    const subAgentIds = this.subAgents.get(parentId) || [];
    return subAgentIds.map(id => this.agents.get(id)).filter(Boolean);
  }

  // Message Bus for agent communication
  publishMessage(message) {
    const msg = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...message
    };

    this.messageBus.push(msg);
    
    // Trim old messages
    if (this.messageBus.length > this.maxMessages) {
      this.messageBus = this.messageBus.slice(-this.maxMessages);
    }

    return msg;
  }

  getMessages(filters = {}) {
    let messages = [...this.messageBus];
    
    if (filters.agentId) {
      messages = messages.filter(m => 
        m.from === filters.agentId || m.to === filters.agentId
      );
    }
    
    if (filters.type) {
      messages = messages.filter(m => m.type === filters.type);
    }
    
    if (filters.since) {
      messages = messages.filter(m => m.timestamp >= filters.since);
    }

    return messages;
  }

  clearMessages() {
    this.messageBus = [];
  }

  // Agent status management
  setAgentStatus(id, status, task = null) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastActiveAt = Date.now();
      agent.currentTask = task;
      
      if (status === 'idle' && task === null) {
        agent.tasksCompleted++;
      }
      
      return agent;
    }
    return null;
  }

  // Delegate task from one agent to another
  delegateTask(fromAgentId, toAgentId, task) {
    const fromAgent = this.agents.get(fromAgentId);
    const toAgent = this.agents.get(toAgentId);
    
    if (!fromAgent || !toAgent) {
      throw new Error('Agent not found');
    }

    this.publishMessage({
      type: 'delegation',
      from: fromAgentId,
      to: toAgentId,
      task,
      timestamp: Date.now()
    });

    this.setAgentStatus(toAgentId, 'working', task);
    
    return true;
  }

  // Get agent hierarchy
  getAgentHierarchy(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const hierarchy = {
      ...agent,
      subAgents: this.getSubAgents(agentId).map(sa => ({
        ...sa,
        subAgents: this.getSubAgents(sa.id)
      }))
    };

    return hierarchy;
  }

  // Get all active agents
  getActiveAgents() {
    return this.getAllAgents().filter(a => a.status !== 'idle' && a.status !== 'disabled');
  }

  // Stop all agents
  stopAllAgents() {
    this.agents.forEach((agent, id) => {
      agent.status = 'stopped';
    });
  }

  cleanup() {
    this.stopAllAgents();
    this.clearMessages();
  }
}

module.exports = AgentManager;
