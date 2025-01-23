const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const dbConfig = {
  host: '171.22.127.152', // Replace with your MySQL host
  user: 'shanken', // Replace with your MySQL username
  password: 'shanken', // Replace with your MySQL password
  database: 'shanken' // Replace with your MySQL database name
};

// MySQL connection
const db = mysql.createConnection(dbConfig);
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database.');
});

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Save the data to the database
    const { sunanshi, gidansu, qasarsu, garinsu, yankinsu, REMOTE_ADDR, online_status } = data;
    const sql = `INSERT INTO orders (sunanshi, gidansu, qasarsu, garinsu, yankinsu, REMOTE_ADDR, online_status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [sunanshi, gidansu, qasarsu, garinsu, yankinsu, REMOTE_ADDR, online_status], (err) => {
      if (err) {
        console.error('Error inserting data into database:', err.stack);
        return;
      }
      console.log('Data saved to database');
      
      // Broadcast the data to all clients (including admin)
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
