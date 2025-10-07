require("dotenv").config();

const http = require("http");
const app = require("./app");
const socketSetup = require("./sockets/chatSocket");

const { Server } = require("socket.io");

const port = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO to server
const io = new Server(server, {
  cors: { 
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000",
      "https://lastchat-psi.vercel.app"
    ], 
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Setup sockets
socketSetup(io);

// Start server
server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
