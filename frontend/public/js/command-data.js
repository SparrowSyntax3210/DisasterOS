/* ==========================================================
   DISASTEROS COMMAND CENTER
   DATA STORE + FETCH + UPDATE VALUES
   ========================================================== */

"use strict";

console.log("📦 Command Data Loaded");

const CommandData = window.CommandData || {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  field: [],
  users: [],
  predictions: [],
  lastRefresh: null,
  loading: false,
};

window.CommandData = CommandData;

/* Keep compatibility with the old monolithic CommandCenter object. */
window.CommandCenter = window.CommandCenter || {};
const CC = window.CommandCenter;

function ensureCommandArrays() {
  const keys = [
    "incidents", "sos", "missions", "teams", "resources",
    "field", "fieldData", "fieldDevices", "fieldAgents",
    "users", "predictions"
  ];

  keys.forEach((key) => {
    if (!Array.isArray(CommandData[key])) CommandData[key] = [];
  });

  if (!Array.isArray(CC.incidents)) CC.incidents = CommandData.incidents;
  if (!Array.isArray(CC.sos)) CC.sos = CommandData.sos;
  if (!Array.isArray(CC.missions)) CC.missions = CommandData.missions;
  if (!Array.isArray(CC.teams)) CC.teams = CommandData.teams;
  if (!Array.isArray(CC.resources)) CC.resources = CommandData.resources;
  if (!Array.isArray(CC.fieldData)) CC.fieldData = CommandData.field;
}

function extractArray(response, keys = []) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.items)) return response.items;

  return [];
}

function entityId(item) {
  if (!item) return null;
  return String(
    item._id ??
    item.id ??
    item.incidentId ??
    item.sosId ??
    item.missionId ??
    item.teamId ??
    item.resourceId ??
    item.deviceId ??
    ""
  ) || null;
}

function upsert(array, item) {
  if (!item) return array;
  const id = entityId(item);

  if (!id) {
    array.push(item);
    return array;
  }

  const index = array.findIndex((x) => entityId(x) === id);
  if (index === -1) array.push(item);
  else array[index] = { ...array[index], ...item };

  return array;
}

function remove(array, id) {
  const target = String(id ?? "");
  return array.filter((x) => entityId(x) !== target);
}

function syncCompatibilityState() {
  CC.incidents = CommandData.incidents;
  CC.sos = CommandData.sos;
  CC.missions = CommandData.missions;
  CC.teams = CommandData.teams;
  CC.resources = CommandData.resources;
  CC.fieldData = CommandData.field;
  CC.fieldDevices = CommandData.fieldDevices || [];
  CC.fieldAgents = CommandData.fieldAgents || [];

  CC.dashboard = CC.dashboard || {};
  CC.dashboard.incidents = CommandData.incidents;
  CC.dashboard.sos = CommandData.sos;
  CC.dashboard.missions = CommandData.missions;
  CC.dashboard.teams = CommandData.teams;
  CC.dashboard.resources = CommandData.resources;
  CC.dashboard.fieldDevices = CommandData.fieldDevices || [];
  CC.dashboard.lastRefresh = CommandData.lastRefresh;
}

function calculateCommandValues() {
  const incidents = CommandData.incidents;
  const sos = CommandData.sos;
  const missions = CommandData.missions;
  const teams = CommandData.teams;
  const resources = CommandData.resources;

  const active = (item) => {
    const status = String(item?.status || "").toLowerCase();
    return !["resolved", "closed", "completed", "cancelled", "rejected"].includes(status);
  };

  const activeIncidents = incidents.filter(active);
  const activeSOS = sos.filter(active);

  const critical = [...incidents, ...sos].filter((x) =>
    ["critical", "extreme"].includes(
      String(x?.severity || x?.priority || "").toLowerCase()
    )
  );

  const riskScore = Math.min(
    100,
    Math.round(
      activeIncidents.length * 10 +
      activeSOS.length * 15 +
      critical.length * 10 +
      missions.filter(active).length * 4
    )
  );

  let riskLevel = "LOW";
  if (riskScore >= 75) riskLevel = "CRITICAL";
  else if (riskScore >= 50) riskLevel = "HIGH";
  else if (riskScore >= 25) riskLevel = "MEDIUM";

  const resourceCount = (type) =>
    resources.filter((r) => {
      const text = String(
        r?.resourceType || r?.type || r?.category || r?.name || ""
      ).toLowerCase();
      return text.includes(type);
    }).length;

  return {
    incidents: incidents.length,
    sos: sos.length,
    missions: missions.length,
    teams: teams.length,
    activeIncidents: activeIncidents.length,
    activeSOS: activeSOS.length,
    critical: critical.length,
    riskScore,
    riskLevel,
    ambulance: resourceCount("ambulance"),
    boats: resourceCount("boat"),
    supplies: resources.filter((r) => {
      const text = String(r?.type || r?.category || r?.name || "").toLowerCase();
      return /supply|food|water/.test(text);
    }).length,
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? 0;
}

function updateValues() {
  const v = calculateCommandValues();

  setText("incidentCount", v.incidents);
  setText("sosCount", v.sos);
  setText("missionCount", v.missions);
  setText("teamCount", v.teams);

  setText("resourceTeams", v.teams);
  setText("resourceAmbulance", v.ambulance);
  setText("resourceBoats", v.boats);
  setText("resourceSupplies", v.supplies);

  setText("riskLevel", v.riskLevel);
  setText("riskScore", v.riskScore);
  setText(
    "situationSummary",
    `${v.activeIncidents} active incidents, ${v.activeSOS} active SOS requests and ${v.missions} missions are currently being monitored.`
  );

  setText("alertCount", v.critical);

  renderAlerts();

  document.dispatchEvent(new CustomEvent("commandcenter:values-updated", {
    detail: v
  }));

  return v;
}

function renderAlerts() {
  const list = document.getElementById("alertsList");
  if (!list) return;

  const items = [...CommandData.sos, ...CommandData.incidents]
    .filter((x) => {
      const severity = String(x?.severity || x?.priority || "").toLowerCase();
      return ["critical", "extreme", "high"].includes(severity);
    })
    .slice(0, 8);

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">No active alerts</div>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const title =
      item?.title ||
      item?.type ||
      item?.subject ||
      "Emergency";

    const status = item?.status || "ACTIVE";

    return `
      <div class="alert-item">
        <strong>${escapeHTML(title)}</strong>
        <span>${escapeHTML(status)}</span>
      </div>
    `;
  }).join("");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchCommandCenterData() {
  ensureCommandArrays();

  if (!window.commandApi) {
    throw new Error("commandApi is not available");
  }

  CommandData.loading = true;

  const loaders = [
    ["incidents", window.commandApi.getIncidents, ["incidents", "data"]],
    ["sos", window.commandApi.getSOS, ["sos", "requests", "data"]],
    ["missions", window.commandApi.getMissions, ["missions", "data"]],
    ["teams", window.commandApi.getTeams, ["teams", "data"]],
    ["resources", window.commandApi.getResources, ["resources", "data"]],
    ["field", window.commandApi.getField, ["field", "devices", "fieldDevices", "data"]],
    ["users", window.commandApi.getUsers, ["users", "data"]],
    ["predictions", window.commandApi.getPredictions, ["predictions", "data"]],
  ];

  const results = await Promise.allSettled(
    loaders.map(([, fn]) => fn())
  );

  results.forEach((result, index) => {
    const [key, , responseKeys] = loaders[index];

    if (result.status === "fulfilled") {
      CommandData[key] = extractArray(result.value, responseKeys);

      if (key === "field") {
        const response = result.value;
        CommandData.fieldDevices =
          response?.devices ||
          response?.fieldDevices ||
          CommandData.field ||
          [];

        CommandData.fieldAgents =
          response?.agents ||
          response?.fieldAgents ||
          [];
      }
    } else {
      console.warn(`[DATA] ${key} failed:`, result.reason);
      CommandData[key] = [];
    }
  });

  CommandData.lastRefresh = new Date().toISOString();
  CommandData.loading = false;

  syncCompatibilityState();
  updateValues();

  document.dispatchEvent(new CustomEvent("commandcenter:data-loaded", {
    detail: CommandData
  }));

  if (typeof window.refreshCommandMap === "function") {
    window.refreshCommandMap(CommandData);
  }

  return CommandData;
}

async function refreshCommandCenterData() {
  return fetchCommandCenterData();
}

function updateCollection(type, payload) {
  const keyMap = {
    incident: "incidents",
    sos: "sos",
    mission: "missions",
    team: "teams",
    resource: "resources",
    field: "field",
  };

  const key = keyMap[type] || type;
  if (!Array.isArray(CommandData[key])) CommandData[key] = [];

  if (Array.isArray(payload)) {
    CommandData[key] = payload;
  } else if (payload) {
    upsert(CommandData[key], payload);
  }

  syncCompatibilityState();
  updateValues();

  if (typeof window.refreshCommandMap === "function") {
    window.refreshCommandMap(CommandData);
  }
}

function deleteCollectionItem(type, id) {
  const keyMap = {
    incident: "incidents",
    sos: "sos",
    mission: "missions",
    team: "teams",
    resource: "resources",
  };

  const key = keyMap[type] || type;
  if (!Array.isArray(CommandData[key])) return;

  CommandData[key] = remove(CommandData[key], id);

  syncCompatibilityState();
  updateValues();

  if (typeof window.refreshCommandMap === "function") {
    window.refreshCommandMap(CommandData);
  }
}

window.fetchCommandCenterData = fetchCommandCenterData;
window.refreshCommandCenterData = refreshCommandCenterData;
window.updateCommandCenterValues = updateValues;
window.calculateCommandValues = calculateCommandValues;
window.updateCollection = updateCollection;
window.deleteCollectionItem = deleteCollectionItem;
window.CommandData = CommandData;

ensureCommandArrays();
syncCompatibilityState();
