class DeviceSessionRepository {
  constructor() {
    this.devices = new Map()
  }

  save(device) {
    this.devices.set(device.id, {
      ...device,
      lastSeenAt: new Date().toISOString()
    })
  }

  saveMany(devices) {
    for (const device of devices) {
      this.save(device)
    }
  }

  getById(id) {
    return this.devices.get(id) || null
  }

  getAll() {
    return Array.from(this.devices.values())
  }
}

export const deviceSessionRepository = new DeviceSessionRepository()