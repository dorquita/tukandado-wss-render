import noble from '@abandonware/noble'
import { AppError } from './app-error.js'

function normalizeUuid(uuid = '') {
  return uuid.replace(/-/g, '').toLowerCase()
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForBluetoothPoweredOn(timeoutMs = 10000) {
  if (noble.state === 'poweredOn') {
    return
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      noble.removeListener('stateChange', handleStateChange)
      reject(
        new AppError(
          `Bluetooth adapter not ready. Current state: ${noble.state || 'unknown'}`,
          503
        )
      )
    }, timeoutMs)

    function handleStateChange(state) {
      if (state === 'poweredOn') {
        clearTimeout(timeout)
        noble.removeListener('stateChange', handleStateChange)
        resolve()
      }
    }

    noble.on('stateChange', handleStateChange)
  })
}

export function mapPeripheral(peripheral) {
  return {
    id: peripheral.id,
    address: peripheral.address || null,
    addressType: peripheral.addressType || null,
    connectable: Boolean(peripheral.connectable),
    localName: peripheral.advertisement?.localName || null,
    rssi: peripheral.rssi,
    serviceUuids: peripheral.advertisement?.serviceUuids || [],
    manufacturerData: peripheral.advertisement?.manufacturerData
      ? peripheral.advertisement.manufacturerData.toString('hex')
      : null,
    txPowerLevel: peripheral.advertisement?.txPowerLevel ?? null
  }
}

export async function withTimeout(promise, timeoutMs, message) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AppError(message, 504))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function connectPeripheral(peripheral) {
  await new Promise((resolve, reject) => {
    peripheral.connect((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

export async function disconnectPeripheral(peripheral) {
  if (!peripheral?.state || peripheral.state !== 'connected') {
    return
  }

  await new Promise((resolve) => {
    peripheral.disconnect(() => resolve())
  })
}

export async function discoverServicesAndCharacteristics(peripheral) {
  return await new Promise((resolve, reject) => {
    peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ services, characteristics })
    })
  })
}

export function findWritableCharacteristic({
  characteristics,
  serviceUuid,
  characteristicUuid,
  autoSelectWritableCharacteristic
}) {
  const normalizedServiceUuid = normalizeUuid(serviceUuid)
  const normalizedCharacteristicUuid = normalizeUuid(characteristicUuid)

  if (normalizedCharacteristicUuid) {
    const exact = characteristics.find(
      (c) => normalizeUuid(c.uuid) === normalizedCharacteristicUuid
    )

    if (!exact) {
      throw new AppError(
        `Characteristic ${characteristicUuid} not found in peripheral`,
        404
      )
    }

    const isWritable =
      exact.properties.includes('write') || exact.properties.includes('writeWithoutResponse')

    if (!isWritable) {
      throw new AppError(
        `Characteristic ${characteristicUuid} is not writable`,
        400
      )
    }

    return exact
  }

  let candidates = characteristics.filter(
    (c) => c.properties.includes('write') || c.properties.includes('writeWithoutResponse')
  )

  if (normalizedServiceUuid) {
    candidates = candidates.filter(
      (c) => normalizeUuid(c._serviceUuid || c._service?.uuid || '') === normalizedServiceUuid
    )
  }

  if (!autoSelectWritableCharacteristic) {
    throw new AppError(
      'Characteristic UUID is required when auto selection is disabled',
      400
    )
  }

  if (!candidates.length) {
    throw new AppError('No writable BLE characteristic found', 404)
  }

  return candidates[0]
}

export async function writeCharacteristic(characteristic, buffer) {
  const withoutResponse = characteristic.properties.includes('writeWithoutResponse')

  await new Promise((resolve, reject) => {
    characteristic.write(buffer, !withoutResponse, (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}