class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  /**
   * Connect to backend Socket.IO server
   */
  connect(url) {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(url);

    this.socket.on("connect", () => {
      this.connected = true;

      console.log("🟢 Connected to DisasterOS Socket Server");
      console.log("Socket ID:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;

      console.log("🔴 Disconnected from Socket Server");
      console.log("Reason:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
    });

    return this.socket;
  }

  /**
   * Emit event to backend
   */
  emit(event, data) {
    if (!this.socket) {
      console.warn(`⚠️ Cannot emit "${event}". Socket is not connected.`);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Listen for an event
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn(`⚠️ Cannot listen for "${event}". Socket is not connected.`);
      return;
    }

    this.socket.on(event, callback);
  }

  /**
   * Listen for an event only once
   */
  once(event, callback) {
    if (!this.socket) {
      console.warn(`⚠️ Cannot listen for "${event}". Socket is not connected.`);
      return;
    }

    this.socket.once(event, callback);
  }

  /**
   * Remove a specific listener
   */
  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);
  }

  /**
   * Join a room
   */
  joinRoom(room) {
    this.emit("room:join", {
      room,
    });
  }

  /**
   * Leave a room
   */
  leaveRoom(room) {
    this.emit("room:leave", {
      room,
    });
  }

  /**
   * Disconnect manually
   */
  disconnect() {
    if (!this.socket) return;

    this.socket.disconnect();

    this.socket = null;
    this.connected = false;
  }

  /**
   * Get raw Socket.IO instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.connected;
  }
}

const socketService = new SocketService();

window.socketService = socketService;
