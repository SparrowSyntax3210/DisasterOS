const SocketService = (() => {
  let socket = null;

  const SOCKET_URL = "http://localhost:4000";

  function connect() {
    if (socket && socket.connected) {
      console.log("⚡ Socket already connected");

      return socket;
    }

    if (typeof io === "undefined") {
      console.error("❌ Socket.IO client is not loaded.");

      return null;
    }

    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],

      reconnection: true,

      reconnectionAttempts: Infinity,

      reconnectionDelay: 1000,
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

    return socket;
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();

      socket = null;

      console.log("🔌 Socket manually disconnected");
    }
  }

  function on(event, callback) {
    if (!socket) {
      console.warn(
        `⚠️ Socket not connected. Call SocketService.connect() before listening to "${event}".`,
      );

      return;
    }

    socket.on(event, callback);
  }

  function off(event, callback) {
    if (!socket) return;

    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }

  function emit(event, data) {
    if (!socket) {
      console.warn(`⚠️ Socket not connected. Cannot emit "${event}".`);

      return;
    }

    socket.emit(event, data);
  }

  function getSocket() {
    return socket;
  }

  return {
    connect,
    disconnect,
    on,
    off,
    emit,
    getSocket,
  };
})();
