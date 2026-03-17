class AgentRegistry {
  constructor() {
    this.agent = null
  }

  setAgent(socket, metadata = {}) {
    this.agent = {
      socket,
      metadata,
      connectedAt: new Date().toISOString()
    }
  }

  clearAgent() {
    this.agent = null
  }

  getAgent() {
    return this.agent
  }

  isConnected() {
    return Boolean(this.agent?.socket && this.agent.socket.readyState === 1)
  }
}

export const agentRegistry = new AgentRegistry()