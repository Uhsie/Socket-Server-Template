const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;
let pingInterval = 50000; // 50 seconds for ping

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  if (wss.clients.size === 1) {
    console.log("First connection. Starting keepalive");
    keepServerAlive();
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    if (stringifiedData === 'pong') {
      console.log('Received pong, connection is alive');
      return; // Ignore pong messages here, no need to broadcast them
    }
    broadcast(ws, stringifiedData, false);
  });

  ws.on("pong", () => {
    console.log('Pong received from client');
    // Optionally, handle any other logic when pong is received.
  });

  ws.on("close", () => {
    console.log("Closing connection");

    if (wss.clients.size === 0) {
      console.log("Last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }
  });
});

// Broadcast function to handle sending messages to clients
const broadcast = (ws, message, includeSelf) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (includeSelf || client !== ws)) {
      client.send(message);
    }
  });
};

/**
 * Sends a ping message to all connected clients every 50 seconds
 */
const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Sending ping');
        client.ping(); // Use the built-in ping method
      }
    });
  }, pingInterval);
};

app.get('/', (req, res) => {
  res.send('Hello World!');
});
