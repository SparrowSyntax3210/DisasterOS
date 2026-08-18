// ==========================================================
// DISASTEROS COMMAND CENTER
// DATA / API / OPERATIONAL STATE
// ==========================================================

console.log("✅ command-center-data.js LOADED");

// ==========================================================
// API
// ==========================================================

const COMMAND_API = "http://localhost:4000/api";

// ==========================================================
// OPERATIONAL LOCATION
// ==========================================================

let commandLatitude = null;
let commandLongitude = null;
let commandLocationName = "";

// ==========================================================
// COMMAND CENTER DATA
// ==========================================================

let commandData = {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  zones: [],
};

// ==========================================================
// LOADING STATE
// ==========================================================

let commandDataLoading = false;

// ==========================================================
// SAFE JSON FETCH
// ==========================================================

async function commandFetch(url, options = {}) {
  const response = await fetch(url, options);

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid response received from server.");
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Server request failed with status ${response.status}`,
    );
  }

  return data;
}

// ==========================================================
// SET COMMAND LOCATION
// ==========================================================

function setCommandLocation(lat, lng, name = "", source = "search") {
  lat = Number(lat);
  lng = Number(lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid location coordinates.");
  }

  window.commandLocation = {
    lat,
    lng,
    name: name || "Selected Location",
    source,
  };

  // Synchronize data module location
  if (window.CommandCenterData?.setCommandLocation) {
    window.CommandCenterData.setCommandLocation(
      lat,
      lng,
      name || "Selected Location",
    );
  }

  console.log("Command Center location:", window.commandLocation);

  return window.commandLocation;
}

// ==========================================================
// GET COMMAND LOCATION
// ==========================================================

function getCommandLocation() {
  if (commandLatitude === null || commandLongitude === null) {
    return null;
  }

  return {
    latitude: commandLatitude,
    longitude: commandLongitude,
    name: commandLocationName,
  };
}

// ==========================================================
// UPDATE MAP COORDINATES
// ==========================================================

function updateCommandCoordinates() {
  const latElement = document.getElementById("mapLat");
  const lngElement = document.getElementById("mapLng");

  if (latElement) {
    latElement.textContent =
      commandLatitude !== null ? commandLatitude.toFixed(5) : "--";
  }

  if (lngElement) {
    lngElement.textContent =
      commandLongitude !== null ? commandLongitude.toFixed(5) : "--";
  }
}

// ==========================================================
// LOCATION QUERY
// ==========================================================

function getLocationQuery() {
  if (commandLatitude === null || commandLongitude === null) {
    throw new Error("No operational location selected.");
  }

  return `lat=${encodeURIComponent(
    commandLatitude,
  )}&lng=${encodeURIComponent(commandLongitude)}`;
}

// ==========================================================
// LOAD OPERATIONAL DATA
// ==========================================================

async function loadCommandCenterData() {
  if (commandDataLoading) {
    return commandData;
  }

  const location = window.commandLocation;

if (
    !location ||
    !Number.isFinite(Number(location.lat)) ||
    !Number.isFinite(Number(location.lng))
) {
    throw new Error("Select an operational location first.");
}

  commandDataLoading = true;

  try {
    console.log("🔄 Loading Command Center data...");

    const locationQuery =
    `lat=${encodeURIComponent(Number(location.lat))}` +
    `&lng=${encodeURIComponent(Number(location.lng))}`;

    const requests = {
      incidents: loadIncidents(locationQuery),
      sos: loadSOS(locationQuery),
      missions: loadMissions(locationQuery),
      teams: loadTeams(locationQuery),
      resources: loadCommandResources(locationQuery),
    };

    const results = await Promise.allSettled(Object.values(requests));

    const keys = Object.keys(requests);

    results.forEach((result, index) => {
      const key = keys[index];

      if (result.status === "fulfilled") {
        commandData[key] = normalizeArray(result.value);
      } else {
        console.warn(`⚠️ Failed to load ${key}:`, result.reason);

        commandData[key] = [];
      }
    });

    console.log("✅ Command Center data loaded:", commandData);

    return commandData;
  } finally {
    commandDataLoading = false;
  }
}

// ==========================================================
// NORMALIZE ARRAY
// ==========================================================

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.incidents)) {
    return data.incidents;
  }

  if (Array.isArray(data?.sos)) {
    return data.sos;
  }

  if (Array.isArray(data?.missions)) {
    return data.missions;
  }

  if (Array.isArray(data?.teams)) {
    return data.teams;
  }

  if (Array.isArray(data?.resources)) {
    return data.resources;
  }

  return [];
}

// ==========================================================
// INCIDENTS
// ==========================================================

async function loadIncidents(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/incidents?${locationQuery}`,
    `${COMMAND_API}/incident?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// SOS
// ==========================================================

async function loadSOS(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/sos?${locationQuery}`,
    `${COMMAND_API}/emergency/sos?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// MISSIONS
// ==========================================================

async function loadMissions(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/missions?${locationQuery}`,
    `${COMMAND_API}/mission?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// TEAMS / RESPONDERS
// ==========================================================

async function loadTeams(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/teams?${locationQuery}`,
    `${COMMAND_API}/responders?${locationQuery}`,
    `${COMMAND_API}/volunteers?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// RESOURCES
// ==========================================================

async function loadCommandResources(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/map/resources?${locationQuery}`,
    `${COMMAND_API}/resources?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// TRY MULTIPLE ROUTES
// ==========================================================

async function tryRoutes(routes) {
  let lastError = null;

  for (const route of routes) {
    try {
      const result = await commandFetch(route);

      return result;
    } catch (error) {
      lastError = error;

      console.warn("Route failed:", route, error.message);
    }
  }

  throw lastError || new Error("No valid API route found.");
}

// ==========================================================
// DATA COUNTS
// ==========================================================

function getCommandCounts() {
  return {
    incidents: commandData.incidents.length,

    sos: commandData.sos.length,

    missions: commandData.missions.length,

    teams: commandData.teams.length,

    resources: commandData.resources.length,

    zones: commandData.zones.length,
  };
}

// ==========================================================
// UPDATE SITUATION COUNTERS
// ==========================================================

function updateCommandCounters() {
  const counts = getCommandCounts();

  const incidentCount = document.getElementById("incidentCount");

  const sosCount = document.getElementById("sosCount");

  const missionCount = document.getElementById("missionCount");

  const teamCount = document.getElementById("teamCount");

  if (incidentCount) {
    incidentCount.textContent = counts.incidents;
  }

  if (sosCount) {
    sosCount.textContent = counts.sos;
  }

  if (missionCount) {
    missionCount.textContent = counts.missions;
  }

  if (teamCount) {
    teamCount.textContent = counts.teams;
  }
}

// ==========================================================
// UPDATE RESOURCE COUNTERS
// ==========================================================

function updateResourceCounters() {
  const resources = commandData.resources || [];

  let teams = 0;
  let ambulance = 0;
  let boats = 0;
  let supplies = 0;

  resources.forEach((resource) => {
    const type = String(
      resource.type || resource.category || resource.resourceType || "",
    ).toLowerCase();

    const quantity = Number(
      resource.quantity ?? resource.count ?? resource.available ?? 1,
    );

    const amount = Number.isFinite(quantity) ? quantity : 1;

    if (type.includes("team") || type.includes("responder")) {
      teams += amount;
    }

    if (type.includes("ambulance") || type.includes("medical")) {
      ambulance += amount;
    }

    if (type.includes("boat")) {
      boats += amount;
    }

    if (type.includes("supply") || type.includes("supplies")) {
      supplies += amount;
    }
  });

  const resourceTeams = document.getElementById("resourceTeams");

  const resourceAmbulance = document.getElementById("resourceAmbulance");

  const resourceBoats = document.getElementById("resourceBoats");

  const resourceSupplies = document.getElementById("resourceSupplies");

  if (resourceTeams) {
    resourceTeams.textContent = teams;
  }

  if (resourceAmbulance) {
    resourceAmbulance.textContent = ambulance;
  }

  if (resourceBoats) {
    resourceBoats.textContent = boats;
  }

  if (resourceSupplies) {
    resourceSupplies.textContent = supplies;
  }
}

// ==========================================================
// SAVE LOCATION
// ==========================================================

function saveCommandLocation() {
  if (commandLatitude === null || commandLongitude === null) {
    return;
  }

  const location = {
    latitude: commandLatitude,
    longitude: commandLongitude,
    name: commandLocationName,
  };

  localStorage.setItem("commandCenterLocation", JSON.stringify(location));
}

// ==========================================================
// LOAD SAVED LOCATION
// ==========================================================

function loadSavedCommandLocation() {
  try {
    const saved = localStorage.getItem("commandCenterLocation");

    if (!saved) {
      return null;
    }

    const location = JSON.parse(saved);

    if (
      !location ||
      !Number.isFinite(Number(location.latitude)) ||
      !Number.isFinite(Number(location.longitude))
    ) {
      return null;
    }

    return location;
  } catch (error) {
    console.error("Failed to load saved Command Center location:", error);

    return null;
  }
}

// ==========================================================
// CLEAR LOCATION
// ==========================================================

function clearCommandLocation() {
  commandLatitude = null;
  commandLongitude = null;
  commandLocationName = "";

  localStorage.removeItem("commandCenterLocation");

  updateCommandCoordinates();
}

// ==========================================================
// EXPORT GLOBAL API
// ==========================================================

window.CommandCenterData = {
  loadCommandCenterData,
  setCommandLocation,
  getCommandLocation,
  loadSavedCommandLocation,
  saveCommandLocation,
  clearCommandLocation,
  getCommandCounts,
  updateCommandCounters,
  updateResourceCounters,
};

console.log("✅ Command Center data module initialized.");
