import { sendCommandToAgent } from '../services/agent-command.service.js'

export async function scanLocks(req, res, next) {
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