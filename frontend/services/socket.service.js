const SOCKET_URL = "http://localhost:4000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("🟢 Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔴 Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error.message);
});

const SocketService = {
  socket,

  on(event, callback) {
    socket.on(event, callback);
  },

  off(event, callback) {
    socket.off(event, callback);
  },

  emit(event, data) {
    socket.emit(event, data);
  },

  join(data) {
    socket.emit("join", data);
  },

  disconnect() {
    socket.disconnect();
  },
};

window.SocketService = SocketService;
