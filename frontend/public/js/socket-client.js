const SocketService = (() => {
    let socket = null;

    const SOCKET_URL = "http://localhost:4000";

    function connect() {
        if (socket && socket.connected) {
            return socket;
        }

        socket = io(SOCKET_URL);

        socket.on("connect", () => {
            console.log("🟢 Socket connected:", socket.id);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔴 Socket disconnected:", reason);
        });

        socket.on("connect_error", (error) => {
            console.error("❌ Socket connection error:", error);
        });

        return socket;
    }

    function on(event, callback) {
        if (!socket) {
            connect();
        }

        socket.on(event, callback);
    }

    function off(event, callback) {
        if (!socket) return;

        socket.off(event, callback);
    }

    function emit(event, data) {
        if (!socket) {
            connect();
        }

        socket.emit(event, data);
    }

    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }

    return {
        connect,
        on,
        off,
        emit,
        disconnect
    };
})();