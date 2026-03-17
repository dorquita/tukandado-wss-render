import http from 'http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { registerAgentSocket } from './ws/agent.socket.js'

const app = createApp()
const server = http.createServer(app)

registerAgentSocket(server)

server.listen(env.port, () => {
  console.log(`Locker bridge service listening on port ${env.port}`)
})