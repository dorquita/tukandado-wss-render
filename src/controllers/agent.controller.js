import { commandService } from '../services/command.service.js'
import { AppError } from '../utils/app-error.js'

export class AgentController {
  static async getNextCommand(req, res) {
    const command = await commandService.getNextCommandForAgent()

    if (!command) {
      return res.status(204).send()
    }

    return res.status(200).json({
      success: true,
      data: {
        id: command.id,
        type: command.type,
        payload: command.payload,
        createdAt: command.createdAt
      }
    })
  }

  static async postCommandResult(req, res) {
    const { commandId } = req.params
    const { success, result, error } = req.body ?? {}

    if (typeof success !== 'boolean') {
      throw new AppError('success boolean is required', 400)
    }

    if (success) {
      await commandService.resolveCommand(commandId, result ?? {})
    } else {
      await commandService.rejectCommand(commandId, error ?? { message: 'Unknown error' })
    }

    res.status(200).json({
      success: true
    })
  }
}