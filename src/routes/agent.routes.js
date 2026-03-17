import { Router } from 'express'
import { AgentController } from '../controllers/agent.controller.js'
import { agentAuthMiddleware } from '../middlewares/agent-auth.middleware.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.use(agentAuthMiddleware)

router.get('/commands/next', asyncHandler(AgentController.getNextCommand))
router.post('/commands/:commandId/result', asyncHandler(AgentController.postCommandResult))

export default router