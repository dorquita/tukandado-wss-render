import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { createId } from '../utils/create-id.js'
import { agentRegistry } from '../ws/agent.registry.js'
import { pendingRequests } from '../ws/pending-requests.js'

export class CommandService {
  async sendCommand(type, payload = {}) {
    const agent = agentRegistry.getAgent()

    if (!agentRegistry.isConnected()) {
      throw new AppError('Raspberry agent is not connected', 503)
    }

    const requestId = createId('req')

    const message = {
      type: 'command',
      requestId,
      command: {
        type,
        payload
      }
    }

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new AppError('Timeout waiting for Raspberry response', 504))
      }, env.commandTimeoutMs)

      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

      try {
        agent.socket.send(JSON.stringify(message))
      } catch (error) {
        pendingRequests.delete(requestId)
        clearTimeout(timeout)
        reject(new AppError('Failed to send command to Raspberry', 502, error?.message))
      }
    })

    return result
  }

  async scanDevices() {
    return await this.sendCommand('scan_devices', {})
  }

  async openCloseDevice({ action, deviceId }) {
    return await this.sendCommand('open_close_device', {
      action,
      deviceId
    })
  }
}

export const commandService = new CommandService()