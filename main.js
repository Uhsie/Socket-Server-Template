const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;
let adminSocket = null;  // Store the admin socket to send messages to it

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  // Assign the admin socket when admin connects
  if (req.url === '/admin') {
    adminSocket = ws;
    console.log("Admin connected");
  }

  if (wss.clients.size === 1) {
    console.log("first connection. starting keepalive");
    keepServerAlive();
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    
    // If it's from the client, send it to the admin panel
    if (req.url !== '/admin') {
      console.log("Received data from client:", stringifiedData);

      // Send data to admin for approval
      if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({ type: 'new-data', data: stringifiedData }));
      }
    }

    // If it's a response from the admin (approval/rejection), send it to the client
    if (req.url === '/admin' && stringifiedData) {
      const { action, clientData } = JSON.parse(stringifiedData);
      console.log(`Admin action: ${action} for data: ${clientData}`);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== adminSocket) {
          client.send(JSON.stringify({ action, message: action === 'approve' ? 'Data approved' : 'Data rejected' }));
        }
      });
    }
  });

  ws.on("close", (data) => {
    console.log("closing connection");

    if (wss.clients.size === 0) {
      console.log("last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }

    // Reset admin socket if admin disconnects
    if (adminSocket === ws) {
      adminSocket = null;
      console.log("Admin disconnected");
    }
  });
});

// Implement broadcast function because of ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

/**
 * Sends a ping message to all connected clients every 50 seconds
 */
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
