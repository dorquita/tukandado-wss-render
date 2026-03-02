import http from "http";
import express from "express";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let currentClient = null;

wss.on("connection", (ws) => {
  console.log("Client connected");
  currentClient = ws;

  ws.on("message", (message) => {
    const msg = message.toString();
    console.log("Received:", msg);

    if (msg === "ping") {
      ws.send("pong");
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    currentClient = null;
  });
});

// 👇 endpoint para enviar comando desde Render
app.post("/send", (req, res) => {
  if (!currentClient) {
    return res.status(400).json({ error: "No client connected" });
  }

  const { message } = req.body;
  currentClient.send(message);

  res.json({ sent: message });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});