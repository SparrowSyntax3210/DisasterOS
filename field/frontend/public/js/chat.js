// ==========================================================
// DISASTEROS CHAT
// ==========================================================

console.log("💬 DisasterOS Chat starting...");

// ==========================================================
// CONFIG
// ==========================================================

const API_BASE = "http://localhost:4000";

// ==========================================================
// STATE
// ==========================================================

let socket = null;

let currentUser = null;

let currentTab = "team";

let typingTimeout = null;

let isTyping = false;

// ==========================================================
// LOCAL USER
// ==========================================================

function getCurrentUser() {
  try {
    const stored =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Could not parse stored user:", error);
  }

  return {
    _id: null,
    name: "Field User",
    email: "",
  };
}

// ==========================================================
// INITIALIZE
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initializing Chat...");

  currentUser = getCurrentUser();

  initializeSocket();

  initializeUI();

  loadInitialMessages();
});

// ==========================================================
// SOCKET CONNECTION
// ==========================================================

function initializeSocket() {
  console.log("🔌 Connecting Chat to DisasterOS Socket...");

  if (typeof SocketService === "undefined") {
    console.error("❌ SocketService not found.");

    setConnectionStatus(false);

    return;
  }

  socket = SocketService.connect();

  if (!socket) {
    setConnectionStatus(false);

    return;
  }

  socket.on("connect", () => {
    console.log("🟢 Chat Socket connected:", socket.id);

    setConnectionStatus(true);

    // Join team chat
    SocketService.emit("chat:join", {
      room: "rescue-team",
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Chat Socket disconnected");

    setConnectionStatus(false);
  });

  // ======================================================
  // NEW MESSAGE
  // ======================================================

  SocketService.on("chat:message", (message) => {
    console.log("💬 Incoming message:", message);

    renderMessage(message, true);
  });

  // ======================================================
  // USER TYPING
  // ======================================================

  SocketService.on("chat:typing", (data) => {
    if (data?.userId === currentUser?._id) {
      return;
    }

    showTyping(data?.name || "Team member");
  });

  SocketService.on("chat:stopTyping", () => {
    hideTyping();
  });

  // ======================================================
  // SYSTEM MESSAGE
  // ======================================================

  SocketService.on("chat:system", (data) => {
    addSystemMessage(data?.message || "Team update");
  });
}

// ==========================================================
// CONNECTION UI
// ==========================================================

function setConnectionStatus(connected) {
  const status = document.querySelector(".connection-status");

  const text = document.getElementById("connectionText");

  if (!status || !text) {
    return;
  }

  if (connected) {
    status.classList.remove("offline");

    text.textContent = "Connected to Command";
  } else {
    status.classList.add("offline");

    text.textContent = "Connection lost";
  }
}

// ==========================================================
// UI
// ==========================================================

function initializeUI() {
  // ======================================================
  // SEND BUTTON
  // ======================================================

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);

  // ======================================================
  // ENTER TO SEND
  // ======================================================

  document
    .getElementById("messageInput")
    ?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        sendMessage();
      }
    });

  // ======================================================
  // TYPING
  // ======================================================

  document
    .getElementById("messageInput")
    ?.addEventListener("input", handleTyping);

  // ======================================================
  // ATTACHMENT
  // ======================================================

  document.getElementById("attachBtn")?.addEventListener("click", () => {
    document.getElementById("attachmentMenu")?.classList.toggle("hidden");
  });

  // ======================================================
  // TEAM INFO
  // ======================================================

  document.getElementById("teamInfoBtn")?.addEventListener("click", () => {
    document.getElementById("teamModal")?.classList.remove("hidden");
  });

  // ======================================================
  // TABS
  // ======================================================

  document.querySelectorAll(".chat-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".chat-tab")
        .forEach((item) => item.classList.remove("active"));

      tab.classList.add("active");

      currentTab = tab.dataset.tab;

      switchChatTab();
    });
  });

  // ======================================================
  // SEARCH
  // ======================================================

  document.getElementById("searchBtn")?.addEventListener("click", () => {
    showToast("Search", "Chat search will be available soon.");
  });
}


// ==========================================================
// SEND MESSAGE
// ==========================================================

function sendMessage() {
  const input = document.getElementById("messageInput");

  if (!input) {
    return;
  }

  const text = input.value.trim();

  if (!text) {
    return;
  }

  const message = {
    id: Date.now().toString(),

    room: "rescue-team",

    senderId: currentUser?._id || currentUser?.id || "field-user",

    senderName: currentUser?.name || "Field User",

    text,

    timestamp: new Date().toISOString(),
  };

  console.log("📤 Sending chat message:", message);

  // ======================================================
  // SHOW IMMEDIATELY
  // ======================================================

  renderMessage(message, false);

  // ======================================================
  // SEND TO SOCKET SERVER
  // ======================================================

  if (socket?.connected) {
    SocketService.emit("chat:send", message);
  } else {
    console.warn("⚠️ Socket not connected");

    showToast("Offline", "Message could not be sent.");
  }

  input.value = "";

  stopTyping();
}

// ==========================================================
// TYPING
// ==========================================================

function handleTyping() {
  if (!socket?.connected) {
    return;
  }

  if (!isTyping) {
    isTyping = true;

    SocketService.emit("chat:typing", {
      room: "rescue-team",

      userId: currentUser?._id || currentUser?.id,

      name: currentUser?.name || "Field User",
    });
  }

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(stopTyping, 1200);
}

function stopTyping() {
  if (!isTyping) {
    return;
  }

  isTyping = false;

  if (socket?.connected) {
    SocketService.emit("chat:stopTyping", {
      room: "rescue-team",

      userId: currentUser?._id || currentUser?.id,
    });
  }
}

// ==========================================================
// RENDER MESSAGE
// ==========================================================

function renderMessage(message, incoming) {
  const container = document.getElementById("messages");

  if (!container) {
    return;
  }

  const senderId = message.senderId || message.userId;

  const myId = currentUser?._id || currentUser?.id || "field-user";

  const mine = String(senderId) === String(myId);

  // Don't duplicate own messages
  // if backend echoes them

  if (incoming && mine) {
    return;
  }

  const row = document.createElement("div");

  row.className = `message-row ${mine ? "mine" : ""}`;

  const content = document.createElement("div");

  content.className = "message-content";

  if (!mine) {
    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.textContent = getInitial(message.senderName);

    row.appendChild(avatar);

    const sender = document.createElement("span");

    sender.className = "message-sender";

    sender.textContent = message.senderName || "Team Member";

    content.appendChild(sender);
  }

  const bubble = document.createElement("div");

  bubble.className = "message-bubble";

  bubble.textContent = message.text || message.message || "";

  content.appendChild(bubble);

  const time = document.createElement("span");

  time.className = "message-time";

  time.textContent = formatTime(message.timestamp || message.time);

  content.appendChild(time);

  row.appendChild(content);

  container.appendChild(row);

  scrollMessages();
}

// ==========================================================
// SYSTEM MESSAGE
// ==========================================================

function addSystemMessage(text) {
  const container = document.getElementById("messages");

  if (!container) {
    return;
  }

  const element = document.createElement("div");

  element.className = "system-message";

  element.textContent = text;

  container.appendChild(element);
}

// ==========================================================
// TYPING UI
// ==========================================================

function showTyping(name) {
  const container = document.getElementById("typingContainer");

  const text = document.getElementById("typingText");

  if (!container || !text) {
    return;
  }

  text.textContent = `${name} is typing...`;

  container.classList.add("show");
}

function hideTyping() {
  document.getElementById("typingContainer")?.classList.remove("show");
}

// ==========================================================
// LOCATION
// ==========================================================

function sendLocation() {
  closeAttachmentMenu();

  if (!navigator.geolocation) {
    showToast("Location", "GPS is not available.");

    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;

      const longitude = position.coords.longitude;

      const message = {
        room: "rescue-team",

        senderId: currentUser?._id || currentUser?.id || "field-user",

        senderName: currentUser?.name || "Field User",

        text: `📍 My location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,

        type: "LOCATION",

        location: {
          latitude,

          longitude,
        },

        timestamp: new Date().toISOString(),
      };

      renderMessage(message, false);

      SocketService.emit("chat:send", message);
    },

    () => {
      showToast("Location", "Unable to get your location.");
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    },
  );
}

// ==========================================================
// EMERGENCY MESSAGE
// ==========================================================

function sendEmergencyUpdate() {
  closeAttachmentMenu();

  const message = {
    room: "rescue-team",

    senderId: currentUser?._id || currentUser?.id || "field-user",

    senderName: currentUser?.name || "Field User",

    text: "🚨 EMERGENCY: Immediate assistance required.",

    type: "EMERGENCY",

    timestamp: new Date().toISOString(),
  };

  renderMessage(message, false);

  SocketService.emit("chat:send", message);
}

// ==========================================================
// MISSION UPDATE
// ==========================================================

function sendMissionUpdate() {
  closeAttachmentMenu();

  const message = {
    room: "rescue-team",

    senderId: currentUser?._id || currentUser?.id || "field-user",

    senderName: currentUser?.name || "Field User",

    text: "🎯 Mission update: Team is proceeding to assigned location.",

    type: "MISSION",

    timestamp: new Date().toISOString(),
  };

  renderMessage(message, false);

  SocketService.emit("chat:send", message);
}

// ==========================================================
// CLOSE ATTACHMENT MENU
// ==========================================================

function closeAttachmentMenu() {
  document.getElementById("attachmentMenu")?.classList.add("hidden");
}

// ==========================================================
// TAB SWITCH
// ==========================================================

function switchChatTab() {
  if (currentTab === "groups") {
    showToast("Groups", "Group channels will appear here.");
  }
}

// ==========================================================
// HELPERS
// ==========================================================

function scrollMessages() {
  const container = document.getElementById("messages");

  if (!container) {
    return;
  }

  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function getInitial(name) {
  if (!name) {
    return "?";
  }

  return name.trim().charAt(0).toUpperCase();
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==========================================================
// TOAST
// ==========================================================

function showToast(title, message) {
  const toast = document.getElementById("toast");

  const text = document.getElementById("toastMessage");

  if (!toast || !text) {
    return;
  }

  text.textContent = `${title}: ${message}`;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ==========================================================
// NAVIGATION
// ==========================================================

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "./field-app.html";
  }
}

function closeTeamModal() {
  document.getElementById("teamModal")?.classList.add("hidden");
}
