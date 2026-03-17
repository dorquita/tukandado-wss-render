import noble from '@abandonware/noble'
import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { hexToBuffer } from '../utils/buffer.js'
import {
  wait,
  mapPeripheral,
  waitForBluetoothPoweredOn,
  withTimeout,
  connectPeripheral,
  disconnectPeripheral,
  discoverServicesAndCharacteristics,
  findWritableCharacteristic,
  writeCharacteristic
} from '../utils/ble.js'
import { deviceSessionRepository } from '../repositories/device-session.repository.js'

export class BleDeviceProvider {
  async scan({ timeoutMs, allowDuplicates }) {
    const effectiveTimeout = timeoutMs ?? env.BLE_SCAN_TIMEOUT_MS

    await waitForBluetoothPoweredOn(env.BLE_OPERATION_TIMEOUT_MS)

    const discovered = new Map()

    const onDiscover = (peripheral) => {
      const mapped = mapPeripheral(peripheral)
      discovered.set(mapped.id, mapped)
    }

    noble.on('discover', onDiscover)

    try {
      await withTimeout(
        new Promise((resolve, reject) => {
          noble.startScanning([], allowDuplicates, (error) => {
            if (error) {
              reject(error)
              return
            }
            resolve()
          })
        }),
        env.BLE_OPERATION_TIMEOUT_MS,
        'Timeout starting BLE scan'
      )

      await wait(effectiveTimeout)
    } finally {
      noble.removeListener('discover', onDiscover)

      try {
        await new Promise((resolve) => noble.stopScanning(() => resolve()))
      } catch {
      }
    }

    const devices = Array.from(discovered.values())
    deviceSessionRepository.saveMany(devices)

    return devices
  }

  async open({ deviceId, serviceUuid, characteristicUuid, commandHex }) {
    const effectiveServiceUuid = serviceUuid || env.BLE_DEFAULT_SERVICE_UUID
    const effectiveCharacteristicUuid =
      characteristicUuid || env.BLE_DEFAULT_CHARACTERISTIC_UUID
    const effectiveCommandHex = commandHex || env.BLE_DEFAULT_OPEN_COMMAND_HEX

    if (!effectiveCommandHex) {
      throw new AppError(
        'No open command provided. Set commandHex in the request or BLE_DEFAULT_OPEN_COMMAND_HEX in env',
        400
      )
    }

    await waitForBluetoothPoweredOn(env.BLE_OPERATION_TIMEOUT_MS)

    let peripheral = noble._peripherals[deviceId] || null

    if (!peripheral) {
      const cachedDevice = deviceSessionRepository.getById(deviceId)

      if (!cachedDevice) {
        throw new AppError(
          `Device ${deviceId} not found in current BLE session. Scan first`,
          404
        )
      }

      peripheral = noble._peripherals[deviceId] || null
    }

    if (!peripheral) {
      peripheral = await this.#findPeripheralByScanning(deviceId)
    }

    if (!peripheral) {
      throw new AppError(`Peripheral ${deviceId} not found`, 404)
    }

    const payload = hexToBuffer(effectiveCommandHex)

    try {
      await withTimeout(
        connectPeripheral(peripheral),
        env.BLE_CONNECT_TIMEOUT_MS,
        `Timeout connecting to device ${deviceId}`
      )

      const { characteristics } = await withTimeout(
        discoverServicesAndCharacteristics(peripheral),
        env.BLE_OPERATION_TIMEOUT_MS,
        `Timeout discovering services for device ${deviceId}`
      )

      const writableCharacteristic = findWritableCharacteristic({
        characteristics,
        serviceUuid: effectiveServiceUuid,
        characteristicUuid: effectiveCharacteristicUuid,
        autoSelectWritableCharacteristic: env.BLE_AUTO_SELECT_WRITABLE_CHARACTERISTIC
      })

      await withTimeout(
        writeCharacteristic(writableCharacteristic, payload),
        env.BLE_OPERATION_TIMEOUT_MS,
        `Timeout writing open command to device ${deviceId}`
      )

      return {
        deviceId,
        opened: true,
        commandHex: effectiveCommandHex,
        serviceUuid: effectiveServiceUuid || null,
        characteristicUuid: writableCharacteristic.uuid,
        openedAt: new Date().toISOString()
      }
    } catch (error) {
      throw new AppError(
        `Failed to open device ${deviceId}`,
        502,
        error?.message || error
      )
    } finally {
      await disconnectPeripheral(peripheral)
    }
  }

  async #findPeripheralByScanning(deviceId) {
    const found = await new Promise((resolve, reject) => {
      let finished = false

      const cleanup = () => {
        noble.removeListener('discover', onDiscover)
        noble.stopScanning(() => {})
      }

      const timeout = setTimeout(() => {
        if (finished) return
        finished = true
        cleanup()
        resolve(null)
      }, env.BLE_SCAN_TIMEOUT_MS)

      const onDiscover = (peripheral) => {
        if (peripheral.id === deviceId) {
          clearTimeout(timeout)
          if (finished) return
          finished = true
          cleanup()
          resolve(peripheral)
        }
      }

      noble.on('discover', onDiscover)

      noble.startScanning([], false, (error) => {
        if (error) {
          clearTimeout(timeout)
          cleanup()
          reject(error)
        }
      })
    })

    return found
  }
}