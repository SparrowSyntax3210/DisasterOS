"use strict";

// ==========================================================
// DISASTEROS COMMAND CENTER
// REALTIME MODULE
// ==========================================================

console.log("✅ command-realtime.js loaded");

// ==========================================================
// STATE
// ==========================================================

let commandRealtimeInitialized = false;

// ==========================================================
// SOCKET
// ==========================================================

function getCommandSocket() {
  if (typeof CommandCenter !== "undefined" && CommandCenter.socket) {
    return CommandCenter.socket;
  }

  return null;
}

// ==========================================================
// UPDATE ARRAY
// ==========================================================

function realtimeID(item) {
  return (
    item?._id ||
    item?.id ||
    item?.incidentId ||
    item?.sosId ||
    item?.missionId ||
    item?.teamId ||
    item?.resourceId ||
    item?.deviceId
  );
}

function realtimeUpsert(array, item) {
  if (!Array.isArray(array)) {
    return;
  }

  const id = realtimeID(item);

  if (!id) {
    array.push(item);
    return;
  }

  const index = array.findIndex(
    (existing) => String(realtimeID(existing)) === String(id),
  );

  if (index === -1) {
    array.push(item);
  } else {
    array[index] = {
      ...array[index],
      ...item,
    };
  }
}

function realtimeRemove(array, id) {
  if (!Array.isArray(array)) {
    return;
  }

  const index = array.findIndex(
    (item) => String(realtimeID(item)) === String(id),
  );

  if (index !== -1) {
    array.splice(index, 1);
  }
}

// ==========================================================
// GET ENTITY FROM PAYLOAD
// ==========================================================

function getRealtimeEntity(payload, key) {
  if (payload && typeof payload === "object") {
    return payload[key] || payload.data || payload;
  }

  return null;
}

// ==========================================================
// INCIDENT
// ==========================================================

function handleRealtimeIncidentCreated(payload) {
  const item = getRealtimeEntity(payload, "incident");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.incidents, item);

  CommandCenter.incidents = CommandCenter.data.incidents;

  notifyRealtime("New incident received", "error");

  refreshRealtimeUI();
}

function handleRealtimeIncidentUpdated(payload) {
  const item = getRealtimeEntity(payload, "incident");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.incidents, item);

  CommandCenter.incidents = CommandCenter.data.incidents;

  refreshRealtimeUI();
}

function handleRealtimeIncidentDeleted(payload) {
  const id = payload?.incidentId || payload?.id || payload?._id;

  if (!id) return;

  realtimeRemove(CommandCenter.data.incidents, id);

  refreshRealtimeUI();
}

// ==========================================================
// SOS
// ==========================================================

function handleRealtimeSOSCreated(payload) {
  const item = getRealtimeEntity(payload, "sos");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.sos, item);

  CommandCenter.sos = CommandCenter.data.sos;

  notifyRealtime("New SOS received", "error");

  refreshRealtimeUI();
}

function handleRealtimeSOSUpdated(payload) {
  const item = getRealtimeEntity(payload, "sos");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.sos, item);

  CommandCenter.sos = CommandCenter.data.sos;

  refreshRealtimeUI();
}

function handleRealtimeSOSDeleted(payload) {
  const id = payload?.sosId || payload?.id || payload?._id;

  if (!id) return;

  realtimeRemove(CommandCenter.data.sos, id);

  refreshRealtimeUI();
}

// ==========================================================
// MISSION
// ==========================================================

function handleRealtimeMissionCreated(payload) {
  const item = getRealtimeEntity(payload, "mission");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.missions, item);

  CommandCenter.missions = CommandCenter.data.missions;

  refreshRealtimeUI();
}

function handleRealtimeMissionUpdated(payload) {
  const item = getRealtimeEntity(payload, "mission");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.missions, item);

  CommandCenter.missions = CommandCenter.data.missions;

  refreshRealtimeUI();
}

function handleRealtimeMissionDeleted(payload) {
  const id = payload?.missionId || payload?.id || payload?._id;

  if (!id) return;

  realtimeRemove(CommandCenter.data.missions, id);

  refreshRealtimeUI();
}

// ==========================================================
// TEAM
// ==========================================================

function handleRealtimeTeamCreated(payload) {
  const item = getRealtimeEntity(payload, "team");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.teams, item);

  CommandCenter.teams = CommandCenter.data.teams;

  refreshRealtimeUI();
}

function handleRealtimeTeamUpdated(payload) {
  const item = getRealtimeEntity(payload, "team");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.teams, item);

  CommandCenter.teams = CommandCenter.data.teams;

  refreshRealtimeUI();
}

function handleRealtimeTeamDeleted(payload) {
  const id = payload?.teamId || payload?.id || payload?._id;

  if (!id) return;

  realtimeRemove(CommandCenter.data.teams, id);

  refreshRealtimeUI();
}

// ==========================================================
// RESOURCE
// ==========================================================

function handleRealtimeResourceCreated(payload) {
  const item = getRealtimeEntity(payload, "resource");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.resources, item);

  CommandCenter.resources = CommandCenter.data.resources;

  refreshRealtimeUI();
}

function handleRealtimeResourceUpdated(payload) {
  const item = getRealtimeEntity(payload, "resource");

  if (!item) return;

  realtimeUpsert(CommandCenter.data.resources, item);

  CommandCenter.resources = CommandCenter.data.resources;

  refreshRealtimeUI();
}

function handleRealtimeResourceDeleted(payload) {
  const id = payload?.resourceId || payload?.id || payload?._id;

  if (!id) return;

  realtimeRemove(CommandCenter.data.resources, id);

  refreshRealtimeUI();
}

// ==========================================================
// UI REFRESH
// ==========================================================

function refreshRealtimeUI() {
  document.dispatchEvent(new CustomEvent("commandcenter:data-updated"));

  if (typeof window.updateCommandCenterDashboard === "function") {
    window.updateCommandCenterDashboard();
  }

  if (typeof window.renderCommandCenterMapData === "function") {
    try {
      window.renderCommandCenterMapData();
    } catch (error) {
      console.error("[REALTIME] Map update failed:", error);
    }
  }
}

// ==========================================================
// NOTIFICATION
// ==========================================================

function notifyRealtime(message, type = "info") {
  if (typeof window.showNotification === "function") {
    window.showNotification(message, type);

    return;
  }

  console.log(`[REALTIME:${type}]`, message);
}

// ==========================================================
// REGISTER EVENTS
// ==========================================================

function initializeCommandRealtime() {
  const socket = getCommandSocket();

  if (!socket) {
    console.warn("[REALTIME] Socket not ready.");

    return false;
  }

  if (commandRealtimeInitialized) {
    return true;
  }

  commandRealtimeInitialized = true;

  socket.on("incident:created", handleRealtimeIncidentCreated);

  socket.on("incident:updated", handleRealtimeIncidentUpdated);

  socket.on("incident:deleted", handleRealtimeIncidentDeleted);

  socket.on("sos:created", handleRealtimeSOSCreated);

  socket.on("sos:updated", handleRealtimeSOSUpdated);

  socket.on("sos:deleted", handleRealtimeSOSDeleted);

  socket.on("mission:created", handleRealtimeMissionCreated);

  socket.on("mission:updated", handleRealtimeMissionUpdated);

  socket.on("mission:deleted", handleRealtimeMissionDeleted);

  socket.on("team:created", handleRealtimeTeamCreated);

  socket.on("team:updated", handleRealtimeTeamUpdated);

  socket.on("team:deleted", handleRealtimeTeamDeleted);

  socket.on("resource:created", handleRealtimeResourceCreated);

  socket.on("resource:updated", handleRealtimeResourceUpdated);

  socket.on("resource:deleted", handleRealtimeResourceDeleted);

  console.log("✅ Command Center realtime events registered.");

  return true;
}

// ==========================================================
// WAIT FOR SOCKET
// ==========================================================

function waitForCommandRealtime() {
  if (initializeCommandRealtime()) {
    return;
  }

  let attempts = 0;

  const timer = setInterval(() => {
    attempts++;

    if (initializeCommandRealtime()) {
      clearInterval(timer);
      return;
    }

    if (attempts >= 100) {
      clearInterval(timer);

      console.warn("[REALTIME] Socket initialization timeout.");
    }
  }, 100);
}

// ==========================================================
// LOCATION CONTROLLED START
// ==========================================================

document.addEventListener("commandcenter:location-selected", () => {
  console.log("[REALTIME] Operational location selected.");

  waitForCommandRealtime();
});

// ==========================================================
// PUBLIC API
// ==========================================================

window.initializeCommandRealtime = initializeCommandRealtime;

window.waitForCommandRealtime = waitForCommandRealtime;

console.log("✅ Command realtime module ready.");
