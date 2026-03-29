import { WebSocket } from "ws";

class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  setAgent(deviceId, socket, metadata = {}) {
    this.agents.set(deviceId, {
      socket,
      metadata,
      connectedAt: new Date().toISOString(),
    });
  }

  getByDeviceId(deviceId) {
    return this.agents.get(deviceId) || null;
  }

  has(deviceId) {
    const agent = this.agents.get(deviceId);
    return Boolean(agent?.socket && agent.socket.readyState === WebSocket.OPEN);
  }

  remove(deviceId) {
    this.agents.delete(deviceId);
  }

  clearAll() {
    this.agents.clear();
  }

  getAll() {
    return Array.from(this.agents.entries()).map(([deviceId, agent]) => ({
      deviceId,
      ...agent,
    }));
  }

  isConnected(deviceId) {
    if (!deviceId) return false;
    const agent = this.agents.get(deviceId);
    return Boolean(agent?.socket && agent.socket.readyState === WebSocket.OPEN);
  }
}

export const agentRegistry = new AgentRegistry();