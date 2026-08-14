let io = null;

function initializeSocket(socketIO) {
  io = socketIO;

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    /*
     * Client can identify itself.
     *
     * Example:
     * socket.emit("client:identify", {
     *   role: "field",
     *   userId: "..."
     * });
     */

    socket.on("client:identify", (data) => {
      console.log(`👤 Client identified:`, data);

      if (data?.role) {
        socket.join(`role:${data.role}`);
      }

      if (data?.userId) {
        socket.join(`user:${data.userId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔴 Socket disconnected: ${socket.id}`, reason);
    });
  });
}

/*
|--------------------------------------------------------------------------
| Broadcast to everyone
|--------------------------------------------------------------------------
*/

function broadcast(event, data = {}) {
  if (!io) {
    console.warn(`⚠️ Socket.IO not initialized: ${event}`);
    return;
  }

  io.emit(event, data);

  console.log(`📡 ${event}`);
}

/*
|--------------------------------------------------------------------------
| Send to specific role
|--------------------------------------------------------------------------
*/

function broadcastToRole(role, event, data = {}) {
  if (!io) return;

  io.to(`role:${role}`).emit(event, data);

  console.log(`📡 ${event} → role:${role}`);
}

/*
|--------------------------------------------------------------------------
| Send to specific user
|--------------------------------------------------------------------------
*/

function broadcastToUser(userId, event, data = {}) {
  if (!io) return;

  io.to(`user:${userId}`).emit(event, data);

  console.log(`📡 ${event} → user:${userId}`);
}

/*
|--------------------------------------------------------------------------
| Send to room
|--------------------------------------------------------------------------
*/

function broadcastToRoom(room, event, data = {}) {
  if (!io) return;

  io.to(room).emit(event, data);

  console.log(`📡 ${event} → room:${room}`);
}

module.exports = {
  initializeSocket,
  broadcast,
  broadcastToRole,
  broadcastToUser,
  broadcastToRoom,
};
