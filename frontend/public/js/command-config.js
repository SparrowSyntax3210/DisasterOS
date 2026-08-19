"use strict";

console.log("⚙️ Command Config Loaded");

/* ==========================================================
   API CONFIGURATION
========================================================== */

window.COMMAND_CONFIG = window.COMMAND_CONFIG || {
  API_BASE:
    window.COMMAND_API_URL ||
    window.COMMAND_API_BASE ||
    "http://localhost:4000/api",

  SOCKET_URL:
    window.COMMAND_SOCKET_URL ||
    "http://localhost:4000",

  REFRESH_INTERVAL: 30000,
};

/* ==========================================================
   NORMALIZE API BASE
========================================================== */

window.COMMAND_CONFIG.API_BASE = String(
  window.COMMAND_CONFIG.API_BASE,
).replace(/\/+$/, "");

/* ==========================================================
   GLOBAL COMPATIBILITY
========================================================== */

window.COMMAND_API_BASE = window.COMMAND_CONFIG.API_BASE;
window.COMMAND_API_URL = window.COMMAND_CONFIG.API_BASE;

console.log(
  "✅ Command API Base:",
  window.COMMAND_CONFIG.API_BASE,
);

console.log(
  "🔌 Command Socket URL:",
  window.COMMAND_CONFIG.SOCKET_URL,
);