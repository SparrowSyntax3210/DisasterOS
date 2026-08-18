"use strict";

// ==========================================================
// DISASTEROS COMMAND CENTER
// COMMAND DATA MODULE
// ==========================================================

console.log("✅ command-data.js loaded");

// ==========================================================
// STATE
// ==========================================================

window.CommandCenter = window.CommandCenter || {};

CommandCenter.data = CommandCenter.data || {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  fieldDevices: [],

  lastLoaded: null,
  loading: false,
};

let commandData = {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  zones: [],
};

// ==========================================================
// HELPERS
// ==========================================================

function commandDataArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.incidents)) {
    return response.incidents;
  }

  if (Array.isArray(response?.sos)) {
    return response.sos;
  }

  if (Array.isArray(response?.missions)) {
    return response.missions;
  }

  if (Array.isArray(response?.teams)) {
    return response.teams;
  }

  if (Array.isArray(response?.resources)) {
    return response.resources;
  }

  if (Array.isArray(response?.devices)) {
    return response.devices;
  }

  return [];
}

// ==========================================================
// LOCATION QUERY
// ==========================================================

function getCommandDataLocationQuery() {
  if (typeof window.getCommandCenterLocationQuery === "function") {
    return window.getCommandCenterLocationQuery();
  }

  const location = CommandCenter.operationalLocation || CommandCenter.location;

  if (!location) {
    return {};
  }

  const latitude = location.latitude ?? location.lat;

  const longitude = location.longitude ?? location.lng;

  return {
    latitude,
    longitude,
    location: location.name || location.displayName || "",
  };
}

// ==========================================================
// GENERIC LOADER
// ==========================================================

async function loadCommandDataEndpoint(endpoint, key) {
  try {
    const query = getCommandDataLocationQuery();

    console.log(`[COMMAND DATA] Loading ${key}`, query);

    const response = await apiGet(endpoint, query);

    const data = commandDataArray(response);

    CommandCenter.data[key] = data;

    // Keep main state synchronized
    CommandCenter[key] = data;

    console.log(`[COMMAND DATA] ${key}: ${data.length}`);

    return data;
  } catch (error) {
    console.error(`[COMMAND DATA] Failed to load ${key}:`, error);

    CommandCenter.data[key] = [];
    CommandCenter[key] = [];

    return [];
  }
}

// ==========================================================
// INCIDENTS
// ==========================================================

async function loadOperationalIncidents() {
  return loadCommandDataEndpoint("/api/incidents", "incidents");
}

// ==========================================================
// SOS
// ==========================================================

async function loadOperationalSOS() {
  return loadCommandDataEndpoint("/api/sos", "sos");
}

// ==========================================================
// MISSIONS
// ==========================================================

async function loadOperationalMissions() {
  return loadCommandDataEndpoint("/api/missions", "missions");
}

// ==========================================================
// TEAMS
// ==========================================================

async function loadOperationalTeams() {
  return loadCommandDataEndpoint("/api/teams", "teams");
}

// ==========================================================
// RESOURCES
// ==========================================================

async function loadOperationalResources() {
  return loadCommandDataEndpoint("/api/resources", "resources");
}

// ==========================================================
// FIELD DEVICES
// ==========================================================

async function loadOperationalFieldDevices() {
  return loadCommandDataEndpoint("/api/field", "fieldDevices");
}

// ==========================================================
// LOAD EVERYTHING
// ==========================================================

async function loadOperationalData() {
  if (CommandCenter.data.loading) {
    return CommandCenter.data;
  }

  const location = getCommandDataLocationQuery();

  if (location.latitude === undefined || location.longitude === undefined) {
    console.warn("[COMMAND DATA] No operational location selected.");

    return CommandCenter.data;
  }

  CommandCenter.data.loading = true;

  try {
    const results = await Promise.allSettled([
      loadOperationalIncidents(),
      loadOperationalSOS(),
      loadOperationalMissions(),
      loadOperationalTeams(),
      loadOperationalResources(),
      loadOperationalFieldDevices(),
    ]);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`[COMMAND DATA] Loader ${index} failed`, result.reason);
      }
    });

    CommandCenter.data.lastLoaded = new Date();

    console.log("[COMMAND DATA] Operational data loaded.");

    return CommandCenter.data;
  } finally {
    CommandCenter.data.loading = false;
  }
}

// ==========================================================
// REFRESH
// ==========================================================

async function refreshOperationalData() {
  return loadOperationalData();
}

// ==========================================================
// GETTERS
// ==========================================================

function getOperationalData() {
  return CommandCenter.data;
}

function getOperationalIncidents() {
  return CommandCenter.data.incidents || [];
}

function getOperationalSOS() {
  return CommandCenter.data.sos || [];
}

function getOperationalMissions() {
  return CommandCenter.data.missions || [];
}

function getOperationalTeams() {
  return CommandCenter.data.teams || [];
}

function getOperationalResources() {
  return CommandCenter.data.resources || [];
}

function getOperationalFieldDevices() {
  return CommandCenter.data.fieldDevices || [];
}

// ==========================================================
// GLOBAL EXPORTS
// ==========================================================

window.loadOperationalData = loadOperationalData;

window.refreshOperationalData = refreshOperationalData;

window.loadOperationalIncidents = loadOperationalIncidents;

window.loadOperationalSOS = loadOperationalSOS;

window.loadOperationalMissions = loadOperationalMissions;

window.loadOperationalTeams = loadOperationalTeams;

window.loadOperationalResources = loadOperationalResources;

window.loadOperationalFieldDevices = loadOperationalFieldDevices;

window.getOperationalData = getOperationalData;

window.getOperationalIncidents = getOperationalIncidents;

window.getOperationalSOS = getOperationalSOS;

window.getOperationalMissions = getOperationalMissions;

window.getOperationalTeams = getOperationalTeams;

window.getOperationalResources = getOperationalResources;

window.getOperationalFieldDevices = getOperationalFieldDevices;

console.log("✅ Command data module ready.");
