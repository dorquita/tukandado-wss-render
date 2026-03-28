import { commandService } from '../services/command.service.js'
import { AppError } from '../utils/app-error.js'
import { sendCommandToAgent } from '../ws/agent-command.service.js'

export class ApiController {
  static async scanDevices(req, res) {
    const result = await commandService.scanDevices()

    res.status(200).json({
      success: true,
      data: result
    })
  }

  static async openCloseDevice(req, res, next) {
    try {
      const {
        mac,
        pairPwd,
        deviceId,
        clubId,
        unlockMode = 'toggle',
        timeout = 6
      } = req.body ?? {}

      if (!mac || typeof mac !== 'string') {
        throw new AppError('mac es requerida', 400)
      }

      if (!pairPwd || typeof pairPwd !== 'string') {
        throw new AppError('pairPwd es requerida', 400)
      }

      if (!deviceId || typeof deviceId !== 'string') {
        throw new AppError('deviceId es requerido', 400)
      }

      if (!['toggle', 'relock5s'].includes(unlockMode)) {
        throw new AppError('unlockMode must be "toggle" or "relock5s"', 400)
      }

      const result = await commandService.openTechnicalLock({
        mac,
        pairPwd,
        deviceId,
        clubId,
        unlockMode,
        timeout
      })

      return res.status(200).json({
        success: true,
        message: 'Apertura ejecutada correctamente',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  static async scanLocks(req, res, next) {
    try {
      const { deviceId, clubId } = req.body
  
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: 'deviceId es requerido'
        })
      }
  
      const result = await sendCommandToAgent('scan_locks', {
        deviceId,
        clubId
      })
  
      return res.status(200).json({
        success: true,
        message: 'Escaneo completado correctamente',
        data: result
      })
    } catch (error) {
      next(error)
    }
  }
}