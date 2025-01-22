const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  // Handle message from client or admin
  ws.on("message", (data) => {
    let stringifiedData = data.toString();

    // If the message is "pong", we ignore it (client response to ping)
    if (stringifiedData === 'pong') {
      console.log('keepAlive');
      return;
    }

    // Broadcast the message to all other clients
    broadcast(ws, stringifiedData, false);
  });

  // We won't close the connection unless the client manually disconnects
  ws.on("close", () => {
    console.log("Client disconnected");
    console.log("Client size: ", wss.clients.size);
  });

  // When the server is no longer needed, manually disconnect the connection
  // But for this case, we'll keep the connection open indefinitely.
});

// Implement broadcast function because WebSocket doesn't have it
const broadcast = (ws, message, includeSelf) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (includeSelf || client !== ws) {
        client.send(message);
      }
    }
  });
};

app.get('/', (req, res) => {
  res.send('Hello World!');
});
