import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import { WebSocketServer } from "ws";

const app = express();

app.get("/", (req, res) => {
  res.send("WS alive");
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    if (msg.toString() === "ping") {
      ws.send("pong");
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Running on port", PORT);
});