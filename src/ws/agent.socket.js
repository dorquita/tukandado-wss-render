import { WebSocketServer } from "ws";
import axios from "axios";
import { agentRegistry } from "./agent.registry.js";
import { pendingRequests } from "./pending-requests.js";
import { AppError } from "../utils/app-error.js";

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function authenticateAgentWithBackend({ deviceId, deviceSecret }) {
  try {
    console.log("🔐 Autenticando agent:", { deviceId });

    const url = `${process.env.BACKEND_URL}/api/auth/kiosk/device-activate`;
    console.log("➡️ URL:", url);

    const response = await axios.post(
      url,
      { deviceId, deviceSecret },
      { timeout: 10000 }
    );

    console.log("HTTP Status:", response.status);

    const body = response.data;

    if (!body?.ok) {
      throw new Error(
        `Backend respondió ok=false: ${body?.message || "Sin mensaje"}`
      );
    }

    return body.data;
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = error?.message;

    console.error("❌ Error autenticando agent:");
    console.error("HTTP Status:", status);
    console.error("Backend body:", data);
    console.error("Error message:", message);

    throw new Error(
      `Auth fallida (${status || "NO_STATUS"}): ${data?.message || message}`
    );
  }
}

export function registerAgentSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname !== "/ws/agent") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    let isAuthenticated = false;
    let currentDeviceId = null;

    ws.on("message", async (rawMessage) => {
      const rawText = rawMessage.toString();
      const message = safeJsonParse(rawText);

      if (!message) {
        console.warn("⚠️ Mensaje no JSON del agente");
        return;
      }

      if (message.type === "agent_hello") {
        console.log("📩 Agent hello recibido:", {
          type: message.type,
          deviceId: message.deviceId,
        });
      } else {
        console.log("📩 Mensaje recibido del agente:", message.type);
      }

      try {
        if (message.type === "agent_hello") {
          const { deviceId, deviceSecret } = message;

          if (!deviceId || !deviceSecret) {
            ws.send(
              JSON.stringify({
                type: "auth_error",
                message: "Faltan deviceId o deviceSecret",
              })
            );
            ws.close(4000, "Missing credentials");
            return;
          }

          const deviceData = await authenticateAgentWithBackend({
            deviceId,
            deviceSecret,
          });

          const kioskData = deviceData?.kiosk ?? {};

          if (agentRegistry.has(deviceId)) {
            const previous = agentRegistry.getByDeviceId(deviceId);
            try {
              previous?.socket?.close(4001, "Replaced by new agent connection");
            } catch {}
          }

          currentDeviceId = deviceId;
          isAuthenticated = true;

          agentRegistry.setAgent(deviceId, ws, {
            userAgent: "raspberry-agent",
            deviceId,
            clubId: kioskData.clubId ?? null,
            mode: kioskData.mode ?? null,
            config: kioskData.config ?? {},
            bootstrapToken: deviceData?.bootstrapToken ?? null,
            bootstrapUrl: deviceData?.bootstrapUrl ?? null,
            authenticatedAt: new Date().toISOString(),
          });

          ws.send(
            JSON.stringify({
              type: "auth_ok",
              message: "Agent authenticated successfully",
              data: {
                deviceId,
                clubId: kioskData.clubId ?? null,
                mode: kioskData.mode ?? null,
                config: kioskData.config ?? {},
                bootstrapToken: deviceData?.bootstrapToken ?? null,
                bootstrapUrl: deviceData?.bootstrapUrl ?? null,
              },
            })
          );

          return;
        }

        if (!isAuthenticated) {
          ws.send(
            JSON.stringify({
              type: "auth_error",
              message: "Agent no autenticado",
            })
          );
          ws.close(4003, "Unauthorized");
          return;
        }

        if (message.type === "command_result") {
          const { requestId, data, error } = message;
          const pending = pendingRequests.get(requestId);

          if (!pending) {
            return;
          }

          pendingRequests.delete(requestId);

          if (error) {
            pending.reject(
              new AppError(
                typeof error === "string"
                  ? error
                  : error?.message || "Raspberry execution failed",
                502,
                typeof error === "string" ? { message: error } : error ?? null
              )
            );
            return;
          }

          pending.resolve(data ?? {});
        }
      } catch (error) {
        console.error("❌ Error procesando mensaje del agent:", error.message);

        ws.send(
          JSON.stringify({
            type: "auth_error",
            message: error.message || "Error autenticando dispositivo",
          })
        );

        ws.close(4002, "Authentication failed");
      }
    });

    ws.on("close", () => {
      if (
        currentDeviceId &&
        agentRegistry.getByDeviceId(currentDeviceId)?.socket === ws
      ) {
        agentRegistry.remove(currentDeviceId);
      }
    });

    ws.on("error", () => {
      if (
        currentDeviceId &&
        agentRegistry.getByDeviceId(currentDeviceId)?.socket === ws
      ) {
        agentRegistry.remove(currentDeviceId);
      }
    });

    ws.send(
      JSON.stringify({
        type: "connected",
        message: "WebSocket connected. Waiting for authentication.",
      })
    );
  });
}