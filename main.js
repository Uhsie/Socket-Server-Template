const http = require("http");
const express = require("express");
const app = express();
const WebSocket = require("ws");

app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);

let adminSocket = null;  // Store the admin socket
let clients = [];  // Store client WebSocket connections

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: serverPort });

server.listen(serverPort, () => {
  console.log(`Server running on port ${serverPort}`);
});

wss.on("connection", function (ws) {
  console.log("A new connection has been established");

  // Add the client to the clients array
  clients.push(ws);

  // When the client sends a message (client-side)
  ws.on("message", (data) => {
    let stringifiedData = data.toString();

    // If data is from client, send it to the admin
    if (clients.indexOf(ws) !== -1 && adminSocket) {
      console.log("Received data from client:", stringifiedData);
      if (adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({ type: 'new-data', data: stringifiedData }));
      }
    }

    // If data is from the admin (approve/reject), broadcast to all clients
    if (ws === adminSocket && stringifiedData) {
      const { action, clientData } = JSON.parse(stringifiedData);
      console.log(`Admin action: ${action} for data: ${clientData}`);

      // Send result to all clients
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            action,
            message: action === 'approve' ? 'Data approved' : 'Data rejected',
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    // Remove client from the array when connection is closed
    clients = clients.filter(client => client !== ws);

    // Reset admin socket if admin disconnects
    if (ws === adminSocket) {
      adminSocket = null;
      console.log("Admin disconnected");
    }
  });

  // If this is the admin socket, store it
  if (!adminSocket) {
    adminSocket = ws;
    console.log("Admin connected");
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});
