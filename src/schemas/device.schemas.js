import { z } from 'zod'

export const scanDevicesSchema = z.object({
  timeoutMs: z.number().int().positive().max(60000).optional(),
  allowDuplicates: z.boolean().optional().default(false)
})

export const openDeviceSchema = z.object({
  deviceId: z.string().min(1),
  serviceUuid: z.string().optional(),
  characteristicUuid: z.string().optional(),
  commandHex: z.string().optional()
})