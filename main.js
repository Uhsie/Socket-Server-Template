const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;
let adminSocket = null;  // Store the admin socket to send messages to it
let clients = [];  // Store client connections

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws) {
  console.log("Connection Opened");
  console.log("Clients size: ", wss.clients.size);

  // If it's the first connection, start the keepalive
  if (wss.clients.size === 1) {
    console.log("First connection. Starting keepalive");
    keepServerAlive();
  }

  // Store clients
  clients.push(ws);

  ws.on("message", (data) => {
    let stringifiedData = data.toString();

    // If message is from the client, send it to the admin
    if (clients.indexOf(ws) !== -1 && adminSocket) {
      console.log("Received data from client:", stringifiedData);

      // Send data to admin for approval
      if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({ type: 'new-data', data: stringifiedData }));
      }
    }

    // If message is from admin (approval/rejection), send the result to the client
    if (ws === adminSocket && stringifiedData) {
      const { action, clientData } = JSON.parse(stringifiedData);
      console.log(`Admin action: ${action} for data: ${clientData}`);

      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            action,
            message: action === 'approve' ? 'Data approved' : 'Data rejected'
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("Closing connection");

    // Remove client from the list
    clients = clients.filter(client => client !== ws);

    // If the last client disconnects, stop keepalive
    if (clients.length === 0) {
      console.log("Last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }

    // Reset admin socket if admin disconnects
    if (ws === adminSocket) {
      adminSocket = null;
      console.log("Admin disconnected");
    }
  });
});

// Sends a ping message to all connected clients every 50 seconds
const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('ping');
      }
    });
  }, 50000);
};

app.get('/', (req, res) => {
  res.send('Hello World!');
});
