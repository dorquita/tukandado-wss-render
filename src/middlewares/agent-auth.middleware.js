import { env } from '../config/env.js'

export function agentAuthMiddleware(req, res, next) {
  const token = req.headers['x-agent-token']

//   if (!token || token !== env.agentToken) {
//     return res.status(401).json({
//       success: false,
//       message: 'Unauthorized agent'
//     })
//   }

  next()
}