"use strict";

console.log("🚀 Command API Loaded");

/* ==========================================================
   BASE URL
========================================================== */

function getCommandBaseURL() {
  let base =
    window.COMMAND_CONFIG?.API_BASE ||
    window.COMMAND_API_BASE ||
    window.COMMAND_API_URL ||
    "http://localhost:4000/api";

  base = String(base).trim();

  return base.replace(/\/+$/, "");
}

const COMMAND_API_BASE = getCommandBaseURL();

window.COMMAND_API_BASE = COMMAND_API_BASE;
window.COMMAND_API_URL = COMMAND_API_BASE;

console.log("🌐 Command API Base:", COMMAND_API_BASE);

/* ==========================================================
   URL BUILDER
========================================================== */

function commandApiUrl(path = "") {
  if (!path) {
    return COMMAND_API_BASE;
  }

  path = String(path).trim();

  /*
   * Already an absolute URL
   */
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  /*
   * Remove leading slash
   */
  path = path.replace(/^\/+/, "");

  /*
   * Prevent /api/api/...
   */
  if (path.startsWith("api/")) {
    path = path.substring(4);
  }

  return `${COMMAND_API_BASE}/${path}`;
}

/* ==========================================================
   AUTH TOKEN
========================================================== */

function getCommandAuthToken() {
  const keys = ["token", "authToken", "accessToken", "jwt", "userToken"];

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);

      if (value) {
        return value;
      }
    } catch (error) {
      console.warn(`⚠️ Unable to read localStorage key: ${key}`);
    }
  }

  return null;
}

/* ==========================================================
   AUTH HEADERS
========================================================== */

function getCommandAuthHeaders() {
  const headers = {
    Accept: "application/json",
  };

  const token = getCommandAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* ==========================================================
   CORE REQUEST
========================================================== */

async function commandApiRequest(path, options = {}) {
  const url = commandApiUrl(path);

  console.log(`🌐 COMMAND API ${options.method || "GET"}:`, url);

  const requestOptions = {
    method: options.method || "GET",

    /*
     * Important:
     * Your backend uses Express sessions.
     * This allows cookies to be sent.
     */
    credentials: "include",

    ...options,

    headers: {
      ...getCommandAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, requestOptions);

    const contentType = response.headers.get("content-type") || "";

    let data = null;

    /* ======================================================
       JSON RESPONSE
    ====================================================== */

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }
    } else {

    /* ======================================================
       NON JSON RESPONSE
    ====================================================== */
      try {
        const text = await response.text();
        data = text || null;
      } catch (error) {
        data = null;
      }
    }

    console.log("📥 COMMAND API RESPONSE:", {
      url,
      status: response.status,
      ok: response.ok,
      data,
    });

    /* ======================================================
       ERROR
    ====================================================== */

    if (!response.ok) {
      const message =
        data?.message || data?.error || data?.msg || `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error("❌ COMMAND API REQUEST FAILED:", {
      url,
      error: error.message,
    });

    throw error;
  }
}

/* ==========================================================
   GET
========================================================== */

async function commandApiGet(path, params = {}) {
  let url = commandApiUrl(path);

  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  /*
   * commandApiRequest recognizes absolute URLs.
   */
  return commandApiRequest(url, {
    method: "GET",
  });
}

/* ==========================================================
   POST
========================================================== */

async function commandApiPost(path, body = {}) {
  return commandApiRequest(path, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PUT
========================================================== */

async function commandApiPut(path, body = {}) {
  return commandApiRequest(path, {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PATCH
========================================================== */

async function commandApiPatch(path, body = {}) {
  return commandApiRequest(path, {
    method: "PATCH",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   DELETE
========================================================== */

async function commandApiDelete(path) {
  return commandApiRequest(path, {
    method: "DELETE",
  });
}

/* ==========================================================
   COMMAND CENTER LOCATION
========================================================== */

function getCommandLocationParams() {
  const location = window.CommandCenterLocation?.getLocation?.();

  if (!location) {
    return {};
  }

  const lat = Number(location.lat ?? location.latitude);

  const lng = Number(location.lng ?? location.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {};
  }

  return {
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  };
}

/* ==========================================================
   INCIDENTS
========================================================== */

async function getCommandIncidents() {
  return commandApiGet("/incidents", getCommandLocationParams());
}

/* ==========================================================
   SOS
========================================================== */

async function getCommandSOS() {
  return commandApiGet("/sos", getCommandLocationParams());
}

/* ==========================================================
   MISSIONS
========================================================== */

async function getCommandMissions() {
  return commandApiGet("/missions", getCommandLocationParams());
}

/* ==========================================================
   TEAMS
========================================================== */

async function getCommandTeams() {
  return commandApiGet("/teams", getCommandLocationParams());
}

/* ==========================================================
   RESOURCES
========================================================== */

async function getCommandResources() {
  return commandApiGet("/resources", getCommandLocationParams());
}

/* ==========================================================
   PREDICTIONS
========================================================== */

/*
 * IMPORTANT:
 *
 * Your backend prediction route contains:
 *
 * POST /api/predictions/predict
 * GET  /api/predictions/history/all
 * GET  /api/predictions/weather/live
 * GET  /api/predictions/:id
 *
 * Therefore we use those exact routes.
 */

async function getCommandPredictionHistory() {
  return commandApiGet("/predictions/history/all");
}

async function getCommandLiveWeather() {
  const location = getCommandLocationParams();

  return commandApiGet("/predictions/weather/live", {
    latitude: location.latitude,
    longitude: location.longitude,
  });
}

async function createCommandPrediction() {
  const location = getCommandLocationParams();

  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    throw new Error(
      "Valid Command Center location is required for prediction.",
    );
  }

  return commandApiPost("/predictions/predict", {
    latitude: location.latitude,
    longitude: location.longitude,
  });
}

async function getCommandPrediction(id) {
  return commandApiGet(`/predictions/${id}`);
}

async function deleteCommandPrediction(id) {
  return commandApiDelete(`/predictions/${id}`);
}

/* ==========================================================
   MAP RESOURCES
========================================================== */

async function getCommandMapResources() {
  const location = getCommandLocationParams();

  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
    throw new Error("Valid location is required to load map resources.");
  }

  return commandApiGet("/map/resources", {
    lat: location.lat,
    lng: location.lng,
  });
}

/* ==========================================================
   MAP — INDIVIDUAL RESOURCE TYPES
========================================================== */

async function getCommandPolice() {
  return commandApiGet("/map/police", getCommandLocationParams());
}

async function getCommandFireStations() {
  return commandApiGet("/map/fire-stations", getCommandLocationParams());
}

async function getCommandPharmacies() {
  return commandApiGet("/map/pharmacies", getCommandLocationParams());
}

async function getCommandShelters() {
  return commandApiGet("/map/shelters", getCommandLocationParams());
}

async function getCommandSchools() {
  return commandApiGet("/map/schools", getCommandLocationParams());
}

async function getCommandCommunityCentres() {
  return commandApiGet("/map/community-centres", getCommandLocationParams());
}

/* ==========================================================
   GEOCODING
========================================================== */

async function commandGeocode(place) {
  if (!place) {
    throw new Error("Location name is required.");
  }

  return commandApiGet("/map/geocode", {
    place: String(place).trim(),
  });
}

/* ==========================================================
   INCIDENT CRUD
========================================================== */

async function createCommandIncident(data) {
  return commandApiPost("/incidents", data);
}

async function getCommandIncident(id) {
  return commandApiGet(`/incidents/${id}`);
}

async function updateCommandIncident(id, data) {
  return commandApiPatch(`/incidents/${id}`, data);
}

async function deleteCommandIncident(id) {
  return commandApiDelete(`/incidents/${id}`);
}

/* ==========================================================
   SOS CRUD
========================================================== */

async function getCommandSOSById(id) {
  return commandApiGet(`/sos/${id}`);
}

async function updateCommandSOS(id, data) {
  return commandApiPatch(`/sos/${id}`, data);
}

async function deleteCommandSOS(id) {
  return commandApiDelete(`/sos/${id}`);
}

/* ==========================================================
   MISSION CRUD
========================================================== */

async function createCommandMission(data) {
  return commandApiPost("/missions", data);
}

async function getCommandMission(id) {
  return commandApiGet(`/missions/${id}`);
}

/*
 * Your backend uses PATCH here.
 *
 * PATCH /api/missions/:id
 */

async function updateCommandMission(id, data) {
  return commandApiPatch(`/missions/${id}`, data);
}

async function deleteCommandMission(id) {
  return commandApiDelete(`/missions/${id}`);
}

/* ==========================================================
   TEAM CRUD
========================================================== */

async function createCommandTeam(data) {
  return commandApiPost("/teams", data);
}

async function getCommandTeam(id) {
  return commandApiGet(`/teams/${id}`);
}

async function updateCommandTeam(id, data) {
  return commandApiPatch(`/teams/${id}`, data);
}

async function deleteCommandTeam(id) {
  return commandApiDelete(`/teams/${id}`);
}

/* ==========================================================
   RESOURCE CRUD
========================================================== */

async function createCommandResource(data) {
  return commandApiPost("/resources", data);
}

async function getCommandResource(id) {
  return commandApiGet(`/resources/${id}`);
}

async function updateCommandResource(id, data) {
  return commandApiPatch(`/resources/${id}`, data);
}

async function deleteCommandResource(id) {
  return commandApiDelete(`/resources/${id}`);
}

/* ==========================================================
   CENTRAL API OBJECT
========================================================== */

const commandApi = {
  /* -------------------------------
     INCIDENTS
  ------------------------------- */

  getIncidents: getCommandIncidents,

  createIncident: createCommandIncident,

  getIncident: getCommandIncident,

  updateIncident: updateCommandIncident,

  deleteIncident: deleteCommandIncident,

  /* -------------------------------
     SOS
  ------------------------------- */

  getSOS: getCommandSOS,

  getSOSById: getCommandSOSById,

  updateSOS: updateCommandSOS,

  deleteSOS: deleteCommandSOS,

  /* -------------------------------
     MISSIONS
  ------------------------------- */

  getMissions: getCommandMissions,

  createMission: createCommandMission,

  getMission: getCommandMission,

  updateMission: updateCommandMission,

  deleteMission: deleteCommandMission,

  /* -------------------------------
     TEAMS
  ------------------------------- */

  getTeams: getCommandTeams,

  createTeam: createCommandTeam,

  getTeam: getCommandTeam,

  updateTeam: updateCommandTeam,

  deleteTeam: deleteCommandTeam,

  /* -------------------------------
     RESOURCES
  ------------------------------- */

  getResources: getCommandResources,

  createResource: createCommandResource,

  getResource: getCommandResource,

  updateResource: updateCommandResource,

  deleteResource: deleteCommandResource,

  /* -------------------------------
     PREDICTION
  ------------------------------- */

  getPredictionHistory: getCommandPredictionHistory,

  getLiveWeather: getCommandLiveWeather,

  createPrediction: createCommandPrediction,

  getPrediction: getCommandPrediction,

  deletePrediction: deleteCommandPrediction,

  /* -------------------------------
     MAP
  ------------------------------- */

  getMapResources: getCommandMapResources,

  getPolice: getCommandPolice,

  getFireStations: getCommandFireStations,

  getPharmacies: getCommandPharmacies,

  getShelters: getCommandShelters,

  getSchools: getCommandSchools,

  getCommunityCentres: getCommandCommunityCentres,

  /* -------------------------------
     LOCATION
  ------------------------------- */

  geocode: commandGeocode,
};

/* ==========================================================
   GLOBAL EXPORTS
========================================================== */

window.commandApiUrl = commandApiUrl;

window.commandApiRequest = commandApiRequest;

window.commandApiGet = commandApiGet;

window.commandApiPost = commandApiPost;

window.commandApiPut = commandApiPut;

window.commandApiPatch = commandApiPatch;

window.commandApiDelete = commandApiDelete;

window.getCommandAuthToken = getCommandAuthToken;

window.getCommandAuthHeaders = getCommandAuthHeaders;

window.getCommandLocationParams = getCommandLocationParams;

window.commandApi = commandApi;

/* ==========================================================
   INDIVIDUAL GLOBAL HELPERS
========================================================== */

window.getCommandIncidents = getCommandIncidents;

window.getCommandSOS = getCommandSOS;

window.getCommandMissions = getCommandMissions;

window.getCommandTeams = getCommandTeams;

window.getCommandResources = getCommandResources;

window.getCommandMapResources = getCommandMapResources;

window.commandGeocode = commandGeocode;

/* ==========================================================
   READY
========================================================== */

console.log("✅ commandApi ready");

console.log("📡 Available Command APIs:", [
  "incidents",
  "sos",
  "missions",
  "teams",
  "resources",
  "predictions",
  "map resources",
  "geocode",
]);
