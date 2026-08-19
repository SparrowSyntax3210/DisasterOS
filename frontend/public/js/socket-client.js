"use strict";

console.log("🔌 Socket Client Loaded");

let commandSocket = null;

/* ==========================================================
   CONNECT
========================================================== */

function initializeCommandSocket() {
  if (
    typeof io !== "function"
  ) {
    console.error(
      "❌ Socket.IO library not loaded",
    );

    return null;
  }

  if (
    commandSocket &&
    commandSocket.connected
  ) {
    return commandSocket;
  }

  const socketUrl =
    window.COMMAND_SOCKET_URL ||
    "http://localhost:4000";

  commandSocket = io(
    socketUrl,
    {
      transports: [
        "websocket",
        "polling",
      ],

      withCredentials: true,
    },
  );

  commandSocket.on(
    "connect",
    () => {
      console.log(
        "🟢 Command Socket Connected:",
        commandSocket.id,
      );
    },
  );

  commandSocket.on(
    "disconnect",
    (reason) => {
      console.warn(
        "🔴 Command Socket Disconnected:",
        reason,
      );
    },
  );

  commandSocket.on(
    "connect_error",
    (error) => {
      console.error(
        "❌ Socket connection error:",
        error.message,
      );
    },
  );

  window.commandSocket =
    commandSocket;

  return commandSocket;
}

/* ==========================================================
   EXPORT
========================================================== */

window.initializeCommandSocket =
  initializeCommandSocket;

window.commandSocket =
  commandSocket;

console.log(
  "✅ Socket Client Ready",
);