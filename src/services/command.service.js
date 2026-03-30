import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { createId } from "../utils/create-id.js";
import { agentRegistry } from "../ws/agent.registry.js";
import { pendingRequests } from "../ws/pending-requests.js";

export class CommandService {
  async sendCommand(type, payload = {}) {
    const { deviceId } = payload ?? {};

    if (!deviceId) {
      throw new AppError(
        "deviceId es requerido para enviar comandos al agent",
        400,
      );
    }

    const agent = agentRegistry.getByDeviceId(deviceId);

    if (!agent || !agentRegistry.isConnected(deviceId)) {
      throw new AppError(
        `Raspberry agent no conectado para deviceId: ${deviceId}`,
        503,
      );
    }

    const requestId = createId("req");

    const message = {
      type,
      requestId,
      payload,
    };

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new AppError("Timeout waiting for Raspberry response", 504));
      }, env.commandTimeoutMs);

      pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      try {
        agent.socket.send(JSON.stringify(message));
      } catch (error) {
        pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(
          new AppError(
            "Failed to send command to Raspberry",
            502,
            error?.message,
          ),
        );
      }
    });

    return result;
  }

  async scanDevices({ deviceId }) {
    if (!deviceId) {
      throw new AppError("deviceId es requerido", 400);
    }

    return await this.sendCommand("scan_devices", { deviceId });
  }

  async scanLocks({ deviceId, clubId }) {
    if (!deviceId) {
      throw new AppError("deviceId es requerido", 400);
    }

    return await this.sendCommand("scan_locks", {
      deviceId,
      clubId,
    });
  }

  async openTechnicalLock({
    mac,
    pairPwd,
    deviceId,
    clubId,
    unlockMode = "toggle",
    timeout = 6,
  }) {
    if (!mac) {
      throw new AppError("mac es requerida", 400);
    }

    if (!pairPwd) {
      throw new AppError("pairPwd es requerida", 400);
    }

    if (!deviceId) {
      throw new AppError("deviceId es requerido", 400);
    }

    return await this.sendCommand("kerong_unlock", {
      mac,
      pairPwd,
      deviceId,
      clubId,
      unlockMode,
      timeout,
    });
  }
}

export const commandService = new CommandService();