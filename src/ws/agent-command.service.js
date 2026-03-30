import crypto from "crypto";
import { WebSocket } from "ws";
import { agentRegistry } from "../ws/agent.registry.js";
import { pendingRequests } from "../ws/pending-requests.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

export async function sendCommandToAgent(type, payload = {}) {
  const { deviceId } = payload;

  if (!deviceId) {
    throw new AppError("deviceId es obligatorio", 400);
  }

  const agent = agentRegistry.getByDeviceId(deviceId);

  if (!agent?.socket || agent.socket.readyState !== WebSocket.OPEN) {
    throw new AppError(
      `No hay ninguna Raspberry conectada para deviceId=${deviceId}`,
      503
    );
  }

  const requestId = crypto.randomUUID();

  const resultPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(
        new AppError(
          `Timeout esperando respuesta de la Raspberry ${deviceId}`,
          504
        )
      );
    }, env.commandTimeoutMs);

    pendingRequests.set(requestId, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });
  });

  try {
    agent.socket.send(
      JSON.stringify({
        type,
        requestId,
        payload,
      })
    );
  } catch (error) {
    pendingRequests.delete(requestId);
    throw new AppError(
      `No se pudo enviar el comando al agent ${deviceId}`,
      502,
      { message: error.message }
    );
  }

  return resultPromise;
}