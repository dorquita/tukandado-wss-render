import { WebSocketServer } from 'ws'
import { agentRegistry } from './agent.registry.js'
import { pendingRequests } from './pending-requests.js'
import { AppError } from '../utils/app-error.js'

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function registerAgentSocket(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (url.pathname !== '/ws/agent') {
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', (ws) => {
    if (agentRegistry.isConnected()) {
      const previous = agentRegistry.getAgent()
      try {
        previous?.socket?.close()
      } catch {}
    }

    agentRegistry.setAgent(ws, {
      userAgent: 'raspberry-agent'
    })

    ws.on('message', (rawMessage) => {
      const message = safeJsonParse(rawMessage.toString())

      if (!message) {
        return
      }

      if (message.type === 'command_result') {
        const { requestId, success, result, error } = message
        const pending = pendingRequests.get(requestId)

        if (!pending) {
          return
        }

        pendingRequests.delete(requestId)

        if (success) {
          pending.resolve(result ?? {})
        } else {
          pending.reject(
            new AppError(
              error?.message || 'Raspberry execution failed',
              502,
              error ?? null
            )
          )
        }
      }
    })

    ws.on('close', () => {
      if (agentRegistry.getAgent()?.socket === ws) {
        agentRegistry.clearAgent()
      }
    })

    ws.on('error', () => {
      if (agentRegistry.getAgent()?.socket === ws) {
        agentRegistry.clearAgent()
      }
    })

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Agent connected successfully'
      })
    )
  })
}