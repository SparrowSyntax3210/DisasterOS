const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const connectDB = require("./db/db");
const socketService = require("./services/socket.service");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

socketService.initializeSocket(io);

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
