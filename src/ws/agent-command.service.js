import crypto from 'crypto'
import { agentRegistry } from '../ws/agent.registry.js'
import { pendingRequests } from '../ws/pending-requests.js'
import { AppError } from '../utils/app-error.js'
import { env } from '../config/env.js'

export async function sendCommandToAgent(type, payload = {}) {
  const agent = agentRegistry.getAgent()

  if (!agent?.socket || agent.socket.readyState !== 1) {
    throw new AppError('No hay ninguna Raspberry conectada', 503)
  }

  const requestId = crypto.randomUUID()

  const resultPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId)
      reject(new AppError('Timeout esperando respuesta de la Raspberry', 504))
    }, env.commandTimeoutMs)

    pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout)
        resolve(result)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      }
    })
  })

  agent.socket.send(
    JSON.stringify({
      type,
      requestId,
      payload
    })
  )

  return resultPromise
}