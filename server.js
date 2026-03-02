import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    const msg = message.toString();
    console.log("Received:", msg);

    if (msg === "ping") {
      ws.send("pong");
    } else {
      ws.send("echo: " + msg);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket running on ws://localhost:3000");