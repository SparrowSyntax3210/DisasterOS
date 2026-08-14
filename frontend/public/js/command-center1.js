"use strict";

/* ============================================================
   DISASTEROS COMMAND CENTER
   PART 1 — CORE / STATE / API / SOCKET / INITIALIZATION
   ============================================================ */

/* ============================================================
   1. CONFIGURATION
   ============================================================ */

const API_BASE = window.API_BASE || "http://localhost:4000";

const SOCKET_URL = window.SOCKET_URL || "http://localhost:4000";

/* ============================================================
   2. GLOBAL STATE
   ============================================================ */

const CommandCenter = {
  /* ----------------------------------------------------------
     Authentication
     ---------------------------------------------------------- */

  token:
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    null,

  user: (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      console.warn("[AUTH] Invalid user data in localStorage.");
      return null;
    }
  })(),

  /* ----------------------------------------------------------
     Socket
     ---------------------------------------------------------- */

  socket: null,

  socketConnected: false,

  reconnectAttempts: 0,

  socketEventsRegistered: false,

  /* ----------------------------------------------------------
     Initialization
     ---------------------------------------------------------- */

  initialized: false,

  isLoading: false,

  /* ----------------------------------------------------------
     Currently selected objects
     ---------------------------------------------------------- */

  selectedIncident: null,

  selectedAgent: null,

  selectedResource: null,

  /* ----------------------------------------------------------
     Dashboard collections
     IMPORTANT:
     Every collection is initialized as an array.
     This prevents ".length of undefined" errors.
     ---------------------------------------------------------- */

  incidents: [],

  activeIncidents: [],

  sos: [],

  missions: [],

  teams: [],

  resources: [],

  fieldData: [],

  fieldAgents: [],

  fieldDevices: [],

  users: [],

  predictions: [],

  activity: [],

  /* ----------------------------------------------------------
     Map data
     ---------------------------------------------------------- */

  map: null,

  mapData: null,

  markers: {},

  layers: {},

  routeLayers: {},

  shelters: [],

  hospitals: [],

  policeStations: [],

  fireStations: [],

  pharmacies: [],

  schools: [],

  communityCenters: [],

  dangerZones: [],

  safeZones: [],

  /* ----------------------------------------------------------
     Statistics
     ---------------------------------------------------------- */

  stats: {
    totalIncidents: 0,

    activeIncidents: 0,

    resolvedIncidents: 0,

    onlineAgents: 0,

    availableAgents: 0,

    busyAgents: 0,

    shelters: 0,

    hospitals: 0,

    policeStations: 0,

    fireStations: 0,

    criticalAlerts: 0,
  },
};

/* ============================================================
   3. DOM ELEMENTS
   ============================================================ */

const DOM = {
  /* ----------------------------------------------------------
     Main containers
     ---------------------------------------------------------- */

  dashboard:
    document.querySelector("#commandCenter") ||
    document.querySelector(".command-center") ||
    document.body,

  incidents:
    document.querySelector("#incidentsList") ||
    document.querySelector(".incidents-list") ||
    document.querySelector("#incidentList"),

  agents:
    document.querySelector("#agentsList") ||
    document.querySelector(".agents-list") ||
    document.querySelector("#fieldAgentsList"),

  resources:
    document.querySelector("#resourcesList") ||
    document.querySelector(".resources-list"),

  alerts:
    document.querySelector("#alertsList") ||
    document.querySelector(".alerts-list"),

  history:
    document.querySelector("#historyList") ||
    document.querySelector(".history-list"),

  /* ----------------------------------------------------------
     Map
     ---------------------------------------------------------- */

  map: document.querySelector("#map") || document.querySelector("#commandMap"),

  /* ----------------------------------------------------------
     Statistics
     ---------------------------------------------------------- */

  totalIncidents: document.querySelector("#totalIncidents"),

  activeIncidents: document.querySelector("#activeIncidents"),

  resolvedIncidents: document.querySelector("#resolvedIncidents"),

  onlineAgents: document.querySelector("#onlineAgents"),

  availableAgents: document.querySelector("#availableAgents"),

  busyAgents: document.querySelector("#busyAgents"),

  shelters: document.querySelector("#shelterCount"),

  hospitals: document.querySelector("#hospitalCount"),

  policeStations: document.querySelector("#policeCount"),

  fireStations: document.querySelector("#fireCount"),

  criticalAlerts: document.querySelector("#criticalAlerts"),

  /* ----------------------------------------------------------
     Connection indicator
     ---------------------------------------------------------- */

  connectionStatus:
    document.querySelector("#connectionStatus") ||
    document.querySelector(".connection-status"),

  connectionDot:
    document.querySelector("#connectionDot") ||
    document.querySelector(".connection-dot"),

  /* ----------------------------------------------------------
     Loading
     ---------------------------------------------------------- */

  loader:
    document.querySelector("#loader") || document.querySelector(".loader"),

  /* ----------------------------------------------------------
     Filters
     ---------------------------------------------------------- */

  incidentFilter: document.querySelector("#incidentFilter"),

  statusFilter: document.querySelector("#statusFilter"),

  agentFilter: document.querySelector("#agentFilter"),

  /* ----------------------------------------------------------
     Refresh
     ---------------------------------------------------------- */

  refreshButton:
    document.querySelector("#refreshBtn") ||
    document.querySelector(".refresh-btn") ||
    document.querySelector("[data-action='refresh']"),
};

/* ============================================================
   4. AUTHENTICATION / API HELPERS
   ============================================================ */

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    CommandCenter.token ||
    null
  );
}

/**
 * Build authenticated headers.
 */
function getHeaders(extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Normalize API URL.
 */
function apiURL(route) {
  if (!route) {
    return API_BASE;
  }

  if (
    typeof route === "string" &&
    (route.startsWith("http://") || route.startsWith("https://"))
  ) {
    return route;
  }

  if (typeof route !== "string") {
    route = String(route);
  }

  if (!route.startsWith("/")) {
    route = `/${route}`;
  }

  return `${API_BASE}${route}`;
}

/**
 * Safe JSON parser.
 */
function safeJSON(value, fallback = null) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

/**
 * Generic API request helper.
 */
async function apiRequest(route, options = {}) {
  const url = apiURL(route);

  const config = {
    method: "GET",

    ...options,

    headers: getHeaders(options.headers || {}),
  };

  try {
    const response = await fetch(url, config);

    const contentType = response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();

      data = text ? safeJSON(text, text) : null;
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        data?.details ||
        `HTTP ${response.status}`;

      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`[API ERROR] ${config.method} ${url}`, error);

    throw error;
  }
}

/* ============================================================
   5. DATE / TIME HELPERS
   ============================================================ */

function formatTime(timestamp) {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

/* ============================================================
   6. DATA NORMALIZATION HELPERS
   ============================================================ */

/**
 * Get object's ID regardless of backend naming.
 */
function getID(object) {
  if (!object) {
    return null;
  }

  const possibleID =
    object._id ??
    object.id ??
    object.incidentId ??
    object.agentId ??
    object.resourceId ??
    object.missionId ??
    object.teamId ??
    object.sosId ??
    object.userId ??
    object.deviceId ??
    null;

  if (possibleID === null || possibleID === undefined) {
    return null;
  }

  try {
    if (
      typeof possibleID === "object" &&
      typeof possibleID.toString === "function"
    ) {
      return possibleID.toString();
    }

    return String(possibleID);
  } catch (error) {
    return null;
  }
}

/**
 * Extract latitude.
 */
function getLatitude(object) {
  if (!object) {
    return null;
  }

  const value =
    object.latitude ??
    object.lat ??
    object.location?.latitude ??
    object.location?.lat ??
    object.coordinates?.latitude ??
    object.coordinates?.lat ??
    object.location?.coordinates?.[1] ??
    object.geometry?.coordinates?.[1] ??
    null;

  const latitude = Number(value);

  return Number.isFinite(latitude) ? latitude : null;
}

/**
 * Extract longitude.
 */
function getLongitude(object) {
  if (!object) {
    return null;
  }

  const value =
    object.longitude ??
    object.lng ??
    object.lon ??
    object.location?.longitude ??
    object.location?.lng ??
    object.location?.lon ??
    object.coordinates?.longitude ??
    object.coordinates?.lng ??
    object.location?.coordinates?.[0] ??
    object.geometry?.coordinates?.[0] ??
    null;

  const longitude = Number(value);

  return Number.isFinite(longitude) ? longitude : null;
}

/**
 * Check whether object contains valid coordinates.
 */
function hasCoordinates(object) {
  const lat = getLatitude(object);

  const lng = getLongitude(object);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Normalize status.
 */
function normalizeStatus(status) {
  if (status === null || status === undefined || status === "") {
    return "unknown";
  }

  return String(status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

/**
 * Safely return an array.
 */
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Extract array from common backend response structures.
 */
function extractArray(response, possibleKeys = []) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  for (const key of possibleKeys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  const standardKeys = [
    "data",
    "results",
    "items",
    "records",
    "incidents",
    "missions",
    "teams",
    "resources",
    "sos",
    "users",
    "agents",
    "devices",
    "fieldAgents",
    "fieldDevices",
    "shelters",
    "hospitals",
    "policeStations",
    "fireStations",
  ];

  for (const key of standardKeys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  return [];
}

/**
 * Normalize collection.
 */
function normalizeCollection(response) {
  return extractArray(response);
}

/**
 * Normalize single object.
 */
function normalizeObject(response) {
  if (response === null || response === undefined) {
    return null;
  }

  if (
    response.data &&
    !Array.isArray(response.data) &&
    typeof response.data === "object"
  ) {
    return response.data;
  }

  return response;
}

/**
 * Add or update object in collection.
 */
function upsertByID(array, object) {
  if (!Array.isArray(array)) {
    return array;
  }

  if (!object) {
    return array;
  }

  const id = getID(object);

  if (!id) {
    return array;
  }

  const index = array.findIndex((item) => String(getID(item)) === String(id));

  if (index === -1) {
    array.push(object);
  } else {
    array[index] = {
      ...array[index],
      ...object,
    };
  }

  return array;
}

/**
 * Remove object by ID.
 */
function removeByID(array, id) {
  if (!Array.isArray(array)) {
    return [];
  }

  if (id === null || id === undefined || id === "") {
    return array;
  }

  return array.filter((item) => String(getID(item)) !== String(id));
}

/* ============================================================
   7. SOCKET.IO
   ============================================================ */

function initializeSocket() {
  if (typeof io === "undefined") {
    console.error("[SOCKET] Socket.IO client is not loaded.");

    updateConnectionStatus(false, "Socket.IO unavailable");

    return null;
  }

  /* Prevent duplicate socket connections. */
  if (CommandCenter.socket) {
    if (CommandCenter.socket.connected || CommandCenter.socket.active) {
      console.log("[SOCKET] Existing socket already available.");

      return CommandCenter.socket;
    }
  }

  console.log("[COMMAND CENTER] Connecting to socket:", SOCKET_URL);

  CommandCenter.socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 10000,

    auth: {
      token: getAuthToken(),
    },
  });

  registerSocketEvents();

  return CommandCenter.socket;
}

/* ============================================================
   8. SOCKET CONNECTION EVENTS
   ============================================================ */

function registerSocketEvents() {
  const socket = CommandCenter.socket;

  if (!socket) {
    return;
  }

  /* ----------------------------------------------------------
     Connected
     ---------------------------------------------------------- */

  socket.on("connect", () => {
    CommandCenter.socketConnected = true;

    CommandCenter.reconnectAttempts = 0;

    console.log("[SOCKET] Connected:", socket.id);

    updateConnectionStatus(true, "Live");

    /*
     * Register application-specific events
     * only once.
     */

    registerCommandCenterSocketEvents();

    emitCommandCenterPresence();
  });

  /* ----------------------------------------------------------
     Disconnect
     ---------------------------------------------------------- */

  socket.on("disconnect", (reason) => {
    CommandCenter.socketConnected = false;

    console.warn("[SOCKET] Disconnected:", reason);

    updateConnectionStatus(false, "Disconnected");
  });

  /* ----------------------------------------------------------
     Reconnecting
     ---------------------------------------------------------- */

  if (socket.io) {
    socket.io.on("reconnect_attempt", (attempt) => {
      CommandCenter.reconnectAttempts = attempt;

      console.log(`[SOCKET] Reconnecting... attempt ${attempt}`);

      updateConnectionStatus(false, "Reconnecting...");
    });

    /* --------------------------------------------------------
       Reconnected
       -------------------------------------------------------- */

    socket.io.on("reconnect", (attempt) => {
      console.log(`[SOCKET] Reconnected after ${attempt} attempts`);

      CommandCenter.socketConnected = true;

      updateConnectionStatus(true, "Live");

      registerCommandCenterSocketEvents();

      emitCommandCenterPresence();
    });

    /* --------------------------------------------------------
       Reconnect failed
       -------------------------------------------------------- */

    socket.io.on("reconnect_failed", () => {
      console.error("[SOCKET] Reconnection failed.");

      updateConnectionStatus(false, "Connection failed");
    });
  }

  /* ----------------------------------------------------------
     Socket error
     ---------------------------------------------------------- */

  socket.on("connect_error", (error) => {
    console.error("[SOCKET] Connection error:", error?.message || error);

    CommandCenter.socketConnected = false;

    updateConnectionStatus(false, "Connection error");
  });
}

/* ============================================================
   9. COMMAND CENTER PRESENCE
   ============================================================ */

function emitCommandCenterPresence() {
  const socket = CommandCenter.socket;

  if (!socket || !socket.connected) {
    return false;
  }

  const payload = {
    role: "command_center",

    type: "command_center",

    userId: CommandCenter.user?._id || CommandCenter.user?.id || null,

    timestamp: new Date().toISOString(),
  };

  socket.emit("command_center_connected", payload);

  return true;
}

/* ============================================================
   10. SOCKET EMIT HELPER
   ============================================================ */

function socketEmit(event, payload = {}) {
  const socket = CommandCenter.socket;

  if (!socket || !socket.connected) {
    console.warn(`[SOCKET] Cannot emit "${event}" — socket offline`);

    return false;
  }

  const finalPayload = {
    ...payload,

    timestamp: payload.timestamp || new Date().toISOString(),
  };

  socket.emit(event, finalPayload);

  console.log(`[SOCKET →] ${event}`, finalPayload);

  return true;
}

/* ============================================================
   11. SOCKET LISTENER HELPER
   ============================================================ */

function socketOn(event, handler) {
  const socket = CommandCenter.socket;

  if (!socket) {
    console.warn(`[SOCKET] Cannot listen for "${event}" — socket unavailable`);

    return;
  }

  if (typeof handler !== "function") {
    console.warn(`[SOCKET] Invalid handler for "${event}"`);

    return;
  }

  socket.on(event, (...args) => {
    console.log(`[SOCKET ←] ${event}`, ...args);

    try {
      handler(...args);
    } catch (error) {
      console.error(`[SOCKET HANDLER ERROR] ${event}`, error);
    }
  });
}

/* ============================================================
   12. CONNECTION STATUS UI
   ============================================================ */

function updateConnectionStatus(connected, text) {
  if (DOM.connectionStatus) {
    DOM.connectionStatus.textContent = text || (connected ? "Live" : "Offline");
  }

  if (DOM.connectionDot) {
    DOM.connectionDot.classList.toggle("connected", Boolean(connected));

    DOM.connectionDot.classList.toggle("disconnected", !connected);
  }

  document.body.classList.toggle("socket-online", Boolean(connected));

  document.body.classList.toggle("socket-offline", !connected);
}

/* ============================================================
   13. LOADING STATE
   ============================================================ */

function setLoading(loading) {
  CommandCenter.isLoading = Boolean(loading);

  if (DOM.loader) {
    DOM.loader.classList.toggle("active", Boolean(loading));
  }

  document.body.classList.toggle("is-loading", Boolean(loading));
}

/* ============================================================
   14. NOTIFICATION HELPER
   ============================================================ */

function showNotification(message, type = "info") {
  console.log(`[NOTIFICATION:${type}]`, message);

  const existingToast =
    document.querySelector("#toast") || document.querySelector(".toast");

  if (existingToast) {
    existingToast.textContent = message;

    existingToast.className = `toast ${type} show`;

    setTimeout(() => {
      existingToast.classList.remove("show");
    }, 3500);

    return;
  }

  const toast = document.createElement("div");

  toast.className = `command-toast ${type}`;

  toast.textContent = message;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ============================================================
   15. STATISTICS
   ============================================================ */

/**
 * IMPORTANT:
 * This function is now defensive.
 *
 * Even if backend data has not loaded yet,
 * it will NEVER attempt:
 *
 * undefined.length
 *
 * Every collection is normalized through
 * ensureArray().
 */
function calculateStats() {
  const incidents = ensureArray(CommandCenter.incidents);

  const agents = ensureArray(CommandCenter.fieldAgents);

  const shelters = ensureArray(CommandCenter.shelters);

  const hospitals = ensureArray(CommandCenter.hospitals);

  const policeStations = ensureArray(CommandCenter.policeStations);

  const fireStations = ensureArray(CommandCenter.fireStations);

  /* ----------------------------------------------------------
     Incidents
     ---------------------------------------------------------- */

  CommandCenter.stats.totalIncidents = incidents.length;

  CommandCenter.stats.activeIncidents = incidents.filter((incident) => {
    const status = normalizeStatus(incident?.status);

    return [
      "reported",
      "active",
      "pending",
      "assigned",
      "in_progress",
      "ongoing",
      "responding",
      "dispatched",
      "open",
    ].includes(status);
  }).length;

  CommandCenter.stats.resolvedIncidents = incidents.filter((incident) => {
    const status = normalizeStatus(incident?.status);

    return [
      "resolved",
      "closed",
      "completed",
      "complete",
      "recovered",
    ].includes(status);
  }).length;

  /* ----------------------------------------------------------
     Agents
     ---------------------------------------------------------- */

  CommandCenter.stats.onlineAgents = agents.filter((agent) => {
    const status = normalizeStatus(agent?.status);

    return [
      "online",
      "available",
      "active",
      "busy",
      "responding",
      "on_mission",
      "assigned",
    ].includes(status);
  }).length;

  CommandCenter.stats.availableAgents = agents.filter((agent) => {
    const status = normalizeStatus(agent?.status);

    return ["available", "idle", "ready"].includes(status);
  }).length;

  CommandCenter.stats.busyAgents = agents.filter((agent) => {
    const status = normalizeStatus(agent?.status);

    return ["busy", "responding", "on_mission", "assigned"].includes(status);
  }).length;

  /* ----------------------------------------------------------
     Map resources
     ---------------------------------------------------------- */

  CommandCenter.stats.shelters = shelters.length;

  CommandCenter.stats.hospitals = hospitals.length;

  CommandCenter.stats.policeStations = policeStations.length;

  CommandCenter.stats.fireStations = fireStations.length;

  /* ----------------------------------------------------------
     Critical alerts
     ---------------------------------------------------------- */

  CommandCenter.stats.criticalAlerts = incidents.filter((incident) => {
    const priority = normalizeStatus(incident?.priority);

    const severity = normalizeStatus(incident?.severity);

    return (
      [
        "critical",
        "emergency",
        "life_threatening",
        "life-threatening",
      ].includes(priority) ||
      [
        "critical",
        "emergency",
        "life_threatening",
        "life-threatening",
      ].includes(severity)
    );
  }).length;

  updateStatisticsUI();

  return CommandCenter.stats;
}

/* ============================================================
   16. UPDATE STATISTICS UI
   ============================================================ */

function updateStatisticsUI() {
  const stats = CommandCenter.stats || {};

  updateText(DOM.totalIncidents, stats.totalIncidents);

  updateText(DOM.activeIncidents, stats.activeIncidents);

  updateText(DOM.resolvedIncidents, stats.resolvedIncidents);

  updateText(DOM.onlineAgents, stats.onlineAgents);

  updateText(DOM.availableAgents, stats.availableAgents);

  updateText(DOM.busyAgents, stats.busyAgents);

  updateText(DOM.shelters, stats.shelters);

  updateText(DOM.hospitals, stats.hospitals);

  updateText(DOM.policeStations, stats.policeStations);

  updateText(DOM.fireStations, stats.fireStations);

  updateText(DOM.criticalAlerts, stats.criticalAlerts);
}

/**
 * Safely update DOM text.
 */
function updateText(element, value) {
  if (!element) {
    return;
  }

  element.textContent = value ?? 0;
}

/* ============================================================
   17. INITIALIZATION
   ============================================================ */

async function initializeCommandCenter() {
  if (CommandCenter.initialized) {
    console.warn("[COMMAND CENTER] Already initialized.");

    return;
  }

  console.log("==========================================");

  console.log(" DISASTEROS COMMAND CENTER");

  console.log(" Initializing...");

  console.log("==========================================");

  /*
   * Mark initialized BEFORE starting
   * asynchronous operations.
   */
  CommandCenter.initialized = true;

  setLoading(true);

  try {
    /*
     * Ensure every important collection
     * exists before anything calls
     * calculateStats().
     */

    CommandCenter.incidents = ensureArray(CommandCenter.incidents);

    CommandCenter.activeIncidents = ensureArray(CommandCenter.activeIncidents);

    CommandCenter.sos = ensureArray(CommandCenter.sos);

    CommandCenter.missions = ensureArray(CommandCenter.missions);

    CommandCenter.teams = ensureArray(CommandCenter.teams);

    CommandCenter.resources = ensureArray(CommandCenter.resources);

    CommandCenter.fieldData = ensureArray(CommandCenter.fieldData);

    CommandCenter.fieldAgents = ensureArray(CommandCenter.fieldAgents);

    CommandCenter.fieldDevices = ensureArray(CommandCenter.fieldDevices);

    CommandCenter.users = ensureArray(CommandCenter.users);

    CommandCenter.predictions = ensureArray(CommandCenter.predictions);

    CommandCenter.shelters = ensureArray(CommandCenter.shelters);

    CommandCenter.hospitals = ensureArray(CommandCenter.hospitals);

    CommandCenter.policeStations = ensureArray(CommandCenter.policeStations);

    CommandCenter.fireStations = ensureArray(CommandCenter.fireStations);

    CommandCenter.pharmacies = ensureArray(CommandCenter.pharmacies);

    CommandCenter.schools = ensureArray(CommandCenter.schools);

    CommandCenter.communityCenters = ensureArray(
      CommandCenter.communityCenters,
    );

    CommandCenter.dangerZones = ensureArray(CommandCenter.dangerZones);

    CommandCenter.safeZones = ensureArray(CommandCenter.safeZones);

    /*
     * Initialize socket.
     */

    initializeSocket();

    /*
     * Calculate initial empty statistics.
     *
     * This is now safe.
     */

    calculateStats();

    console.log("[COMMAND CENTER] Core initialized.");
  } catch (error) {
    console.error("[COMMAND CENTER] Initialization error:", error);

    /*
     * Do NOT leave the application
     * in a broken initialized state.
     */

    CommandCenter.initialized = false;

    showNotification("Command Center initialization failed.", "error");
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   18. PAGE LOAD
   ============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCommandCenter, {
    once: true,
  });
} else {
  initializeCommandCenter();
}

/* ============================================================
   19. GLOBAL EXPORTS
   ============================================================ */

window.CommandCenter = CommandCenter;

window.DOM = DOM;

window.apiURL = apiURL;

window.apiRequest = apiRequest;

window.getAuthToken = getAuthToken;

window.getHeaders = getHeaders;

window.socketEmit = socketEmit;

window.socketOn = socketOn;

window.showNotification = showNotification;

window.calculateStats = calculateStats;

window.updateStatisticsUI = updateStatisticsUI;

window.getID = getID;

window.getLatitude = getLatitude;

window.getLongitude = getLongitude;

window.hasCoordinates = hasCoordinates;

window.normalizeStatus = normalizeStatus;

window.extractArray = extractArray;

window.normalizeCollection = normalizeCollection;

window.normalizeObject = normalizeObject;

window.upsertByID = upsertByID;

window.removeByID = removeByID;

/* ============================================================
   20. API ROUTES
   ============================================================ */

const API_ROUTES = {
  incidents: "/api/incidents",

  missions: "/api/missions",

  teams: "/api/teams",

  resources: "/api/resources",

  sos: "/api/sos",

  field: "/api/field",

  map: "/api/map",

  users: "/api/users",

  predictions: "/api/predictions",

  auth: "/auth",
};

/* ============================================================
   21. GENERIC GET
   ============================================================ */

async function apiGet(route, query = {}) {
  let url = apiURL(route);

  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  const queryString = params.toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  return apiRequest(url, {
    method: "GET",
  });
}

/* ============================================================
   22. GENERIC POST
   ============================================================ */

async function apiPost(route, body = {}) {
  return apiRequest(route, {
    method: "POST",

    body: JSON.stringify(body),
  });
}

/* ============================================================
   23. GENERIC PATCH
   ============================================================ */

async function apiPatch(route, body = {}) {
  return apiRequest(route, {
    method: "PATCH",

    body: JSON.stringify(body),
  });
}

/* ============================================================
   24. GENERIC PUT
   ============================================================ */

async function apiPut(route, body = {}) {
  return apiRequest(route, {
    method: "PUT",

    body: JSON.stringify(body),
  });
}

/* ============================================================
   25. GENERIC DELETE
   ============================================================ */

async function apiDelete(route) {
  return apiRequest(route, {
    method: "DELETE",
  });
}

/* ============================================================
   26. SOS API
   ============================================================ */

async function loadSOS() {
  try {
    console.log("[API] GET /api/sos");

    const response = await apiGet(API_ROUTES.sos);

    const sosRequests = normalizeCollection(response);

    CommandCenter.sos = sosRequests;

    console.log(`[API] Loaded ${sosRequests.length} SOS requests`);

    calculateStats();

    return sosRequests;
  } catch (error) {
    console.error("[API] Failed to load SOS:", error);

    CommandCenter.sos = [];

    return [];
  }
}

async function getSOS(sosId) {
  if (!sosId) {
    throw new Error("SOS ID is required.");
  }

  return apiGet(`${API_ROUTES.sos}/${sosId}`);
}

async function createSOS(sosData) {
  if (!sosData || typeof sosData !== "object") {
    throw new Error("SOS data is required.");
  }

  const payload = {
    reporter: sosData.reporter || null,

    latitude: sosData.latitude,

    longitude: sosData.longitude,

    type: sosData.type,

    severity: sosData.severity,

    description: sosData.description || "",

    peopleCount: sosData.peopleCount || 1,
  };

  console.log("[API] POST /api/sos", payload);

  return apiPost(API_ROUTES.sos, payload);
}

async function updateSOS(sosId, updates) {
  if (!sosId) {
    throw new Error("SOS ID is required.");
  }

  if (!updates || typeof updates !== "object") {
    throw new Error("SOS update data is required.");
  }

  console.log(`[API] PATCH /api/sos/${sosId}`, updates);

  return apiPatch(`${API_ROUTES.sos}/${sosId}`, updates);
}

async function deleteSOS(sosId) {
  if (!sosId) {
    throw new Error("SOS ID is required.");
  }

  console.log(`[API] DELETE /api/sos/${sosId}`);

  return apiDelete(`${API_ROUTES.sos}/${sosId}`);
}

/* ============================================================
   27. INCIDENT API
   ============================================================ */

async function loadIncidents() {
  try {
    console.log("[API] GET /api/incidents");

    const response = await apiGet(API_ROUTES.incidents);

    const incidents = normalizeCollection(response);

    CommandCenter.incidents = incidents;

    refreshActiveIncidents();

    console.log(`[API] Loaded ${incidents.length} incidents`);

    calculateStats();

    return incidents;
  } catch (error) {
    console.error("[API] Failed to load incidents:", error);

    CommandCenter.incidents = [];

    CommandCenter.activeIncidents = [];

    calculateStats();

    return [];
  }
}

async function getIncident(incidentId) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  return apiGet(`${API_ROUTES.incidents}/${incidentId}`);
}

async function createIncident(incidentData) {
  if (!incidentData || typeof incidentData !== "object") {
    throw new Error("Incident data is required.");
  }

  console.log("[API] POST /api/incidents", incidentData);

  return apiPost(API_ROUTES.incidents, incidentData);
}

async function updateIncident(incidentId, updates) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  console.log(`[API] PATCH /api/incidents/${incidentId}`, updates);

  return apiPatch(`${API_ROUTES.incidents}/${incidentId}`, updates);
}

async function deleteIncident(incidentId) {
  if (!incidentId) {
    throw new Error("Incident ID is required.");
  }

  console.log(`[API] DELETE /api/incidents/${incidentId}`);

  return apiDelete(`${API_ROUTES.incidents}/${incidentId}`);
}

/* ============================================================
   28. MISSION API
   ============================================================ */

async function loadMissions() {
  try {
    console.log("[API] GET /api/missions");

    const response = await apiGet(API_ROUTES.missions);

    const missions = normalizeCollection(response);

    CommandCenter.missions = missions;

    console.log(`[API] Loaded ${missions.length} missions`);

    return missions;
  } catch (error) {
    console.error("[API] Failed to load missions:", error);

    CommandCenter.missions = [];

    return [];
  }
}

/* ============================================================
   29. TEAM API
   ============================================================ */

async function loadTeams() {
  try {
    console.log("[API] GET /api/teams");

    const response = await apiGet(API_ROUTES.teams);

    const teams = normalizeCollection(response);

    CommandCenter.teams = teams;

    console.log(`[API] Loaded ${teams.length} teams`);

    return teams;
  } catch (error) {
    console.error("[API] Failed to load teams:", error);

    CommandCenter.teams = [];

    return [];
  }
}

/* ============================================================
   30. RESOURCE API
   ============================================================ */

async function loadResources() {
  try {
    console.log("[API] GET /api/resources");

    const response = await apiGet(API_ROUTES.resources);

    const resources = normalizeCollection(response);

    CommandCenter.resources = resources;

    console.log(`[API] Loaded ${resources.length} resources`);

    return resources;
  } catch (error) {
    console.error("[API] Failed to load resources:", error);

    CommandCenter.resources = [];

    return [];
  }
}

/* ============================================================
   31. FIELD DATA API
   ============================================================ */

async function loadFieldData() {
  try {
    console.log("[API] GET /api/field");

    const response = await apiGet(API_ROUTES.field);

    const fieldData = normalizeCollection(response);

    CommandCenter.fieldData = fieldData;

    /*
     * Try to derive agents/devices
     * from common backend structures.
     */

    if (response && typeof response === "object") {
      if (Array.isArray(response.agents)) {
        CommandCenter.fieldAgents = response.agents;
      }

      if (Array.isArray(response.fieldAgents)) {
        CommandCenter.fieldAgents = response.fieldAgents;
      }

      if (Array.isArray(response.devices)) {
        CommandCenter.fieldDevices = response.devices;
      }

      if (Array.isArray(response.fieldDevices)) {
        CommandCenter.fieldDevices = response.fieldDevices;
      }

      CommandCenter.fieldDataResponse = response;
    }

    console.log(`[API] Loaded field data: ${fieldData.length}`);

    calculateStats();

    return response;
  } catch (error) {
    console.error("[API] Failed to load field data:", error);

    CommandCenter.fieldData = [];

    CommandCenter.fieldAgents = [];

    CommandCenter.fieldDevices = [];

    calculateStats();

    return [];
  }
}

/* ============================================================
   32. MAP DATA API
   ============================================================ */

async function loadMapData(query = {}) {
  try {
    console.log("[API] GET /api/map");

    const response = await apiGet(API_ROUTES.map, query);

    CommandCenter.mapData = response;

    return response;
  } catch (error) {
    console.error("[API] Failed to load map data:", error);

    CommandCenter.mapData = null;

    return null;
  }
}

/* ============================================================
   33. USERS API
   ============================================================ */

async function loadUsers() {
  try {
    console.log("[API] GET /api/users");

    const response = await apiGet(API_ROUTES.users);

    const users = normalizeCollection(response);

    CommandCenter.users = users;

    return users;
  } catch (error) {
    console.error("[API] Failed to load users:", error);

    CommandCenter.users = [];

    return [];
  }
}

/* ============================================================
   34. PREDICTIONS API
   ============================================================ */

async function loadPredictions() {
  try {
    console.log("[API] GET /api/predictions");

    const response = await apiGet(API_ROUTES.predictions);

    CommandCenter.predictions = normalizeCollection(response);

    return response;
  } catch (error) {
    console.error("[API] Failed to load predictions:", error);

    CommandCenter.predictions = [];

    return [];
  }
}

/* ============================================================
   35. LOAD ALL COMMAND CENTER DATA
   ============================================================ */

async function loadAllCommandCenterData() {
  console.log("==========================================");

  console.log(" DISASTEROS COMMAND CENTER");

  console.log(" LOADING BACKEND DATA");

  console.log("==========================================");

  setLoading(true);

  try {
    const results = await Promise.allSettled([
      loadIncidents(),

      loadMissions(),

      loadTeams(),

      loadResources(),

      loadSOS(),

      loadFieldData(),

      loadUsers(),

      loadPredictions(),
    ]);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`[COMMAND CENTER] Loader ${index} failed:`, result.reason);
      }
    });

    /*
     * Make sure map collections remain
     * valid even before map module loads.
     */

    CommandCenter.shelters = ensureArray(CommandCenter.shelters);

    CommandCenter.hospitals = ensureArray(CommandCenter.hospitals);

    CommandCenter.policeStations = ensureArray(CommandCenter.policeStations);

    CommandCenter.fireStations = ensureArray(CommandCenter.fireStations);

    calculateStats();

    console.log("==========================================");

    console.log(" BACKEND DATA LOADED");

    console.log("==========================================");

    return {
      incidents: ensureArray(CommandCenter.incidents),

      missions: ensureArray(CommandCenter.missions),

      teams: ensureArray(CommandCenter.teams),

      resources: ensureArray(CommandCenter.resources),

      sos: ensureArray(CommandCenter.sos),

      field: ensureArray(CommandCenter.fieldData),

      users: ensureArray(CommandCenter.users),

      predictions: ensureArray(CommandCenter.predictions),
    };
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   36. REFRESH
   ============================================================ */

async function refreshCommandCenter() {
  console.log("[COMMAND CENTER] Refresh requested.");

  try {
    await loadAllCommandCenterData();

    showNotification("Command Center refreshed.", "success");
  } catch (error) {
    console.error("[COMMAND CENTER] Refresh error:", error);

    showNotification("Unable to refresh Command Center.", "error");
  }
}

/* ============================================================
   37. REFRESH BUTTON
   ============================================================ */

if (DOM.refreshButton) {
  DOM.refreshButton.addEventListener("click", refreshCommandCenter);
}

/* ============================================================
   38. AUTO REFRESH
   ============================================================ */

const COMMAND_CENTER_REFRESH_INTERVAL = 60 * 1000;

let commandCenterRefreshTimer = null;

function startCommandCenterAutoRefresh() {
  if (commandCenterRefreshTimer) {
    clearInterval(commandCenterRefreshTimer);
  }

  commandCenterRefreshTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      refreshCommandCenter();
    }
  }, COMMAND_CENTER_REFRESH_INTERVAL);
}

/* ============================================================
   39. PAGE VISIBILITY
   ============================================================ */

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    /*
     * Do not immediately hammer
     * the backend if the page has just
     * loaded and is still initializing.
     */

    if (CommandCenter.initialized) {
      refreshCommandCenter();
    }
  }
});

/* ============================================================
   40. SOCKET EVENTS
   ============================================================ */

const SOCKET_EVENTS = {
  /* ----------------------------------------------------------
     INCIDENTS
     ---------------------------------------------------------- */

  INCIDENT_CREATED: "incident:created",

  INCIDENT_UPDATED: "incident:updated",

  INCIDENT_DELETED: "incident:deleted",

  /* ----------------------------------------------------------
     MISSIONS
     ---------------------------------------------------------- */

  MISSION_CREATED: "mission:created",

  MISSION_UPDATED: "mission:updated",

  MISSION_DELETED: "mission:deleted",

  /* ----------------------------------------------------------
     TEAMS
     ---------------------------------------------------------- */

  TEAM_CREATED: "team:created",

  TEAM_UPDATED: "team:updated",

  TEAM_DELETED: "team:deleted",

  /* ----------------------------------------------------------
     RESOURCES
     ---------------------------------------------------------- */

  RESOURCE_CREATED: "resource:created",

  RESOURCE_UPDATED: "resource:updated",

  RESOURCE_DELETED: "resource:deleted",

  /* ----------------------------------------------------------
     SOS
     ---------------------------------------------------------- */

  SOS_CREATED: "sos:created",

  SOS_UPDATED: "sos:updated",

  SOS_DELETED: "sos:deleted",
};

/* ============================================================
   41. SOCKET EVENT REGISTRATION
   ============================================================ */

function registerCommandCenterSocketEvents() {
  if (!CommandCenter.socket) {
    console.warn("[SOCKET] Cannot register events — socket unavailable.");

    return;
  }

  /*
   * IMPORTANT:
   * Prevent duplicate listeners.
   */

  if (CommandCenter.socketEventsRegistered) {
    return;
  }

  CommandCenter.socketEventsRegistered = true;

  /* ----------------------------------------------------------
     INCIDENT EVENTS
     ---------------------------------------------------------- */

  socketOn(SOCKET_EVENTS.INCIDENT_CREATED, handleIncidentCreated);

  socketOn(SOCKET_EVENTS.INCIDENT_UPDATED, handleIncidentUpdated);

  socketOn(SOCKET_EVENTS.INCIDENT_DELETED, handleIncidentDeleted);

  /* ----------------------------------------------------------
     MISSION EVENTS
     ---------------------------------------------------------- */

  socketOn(SOCKET_EVENTS.MISSION_CREATED, handleMissionCreated);

  socketOn(SOCKET_EVENTS.MISSION_UPDATED, handleMissionUpdated);

  socketOn(SOCKET_EVENTS.MISSION_DELETED, handleMissionDeleted);

  /* ----------------------------------------------------------
     TEAM EVENTS
     ---------------------------------------------------------- */

  socketOn(SOCKET_EVENTS.TEAM_CREATED, handleTeamCreated);

  socketOn(SOCKET_EVENTS.TEAM_UPDATED, handleTeamUpdated);

  socketOn(SOCKET_EVENTS.TEAM_DELETED, handleTeamDeleted);

  /* ----------------------------------------------------------
     RESOURCE EVENTS
     ---------------------------------------------------------- */

  socketOn(SOCKET_EVENTS.RESOURCE_CREATED, handleResourceCreated);

  socketOn(SOCKET_EVENTS.RESOURCE_UPDATED, handleResourceUpdated);

  socketOn(SOCKET_EVENTS.RESOURCE_DELETED, handleResourceDeleted);

  /* ----------------------------------------------------------
     SOS EVENTS
     ---------------------------------------------------------- */

  socketOn(SOCKET_EVENTS.SOS_CREATED, handleSOSCreated);

  socketOn(SOCKET_EVENTS.SOS_UPDATED, handleSOSUpdated);

  socketOn(SOCKET_EVENTS.SOS_DELETED, handleSOSDeleted);

  console.log("[SOCKET] All Command Center events registered.");
}

/* ============================================================
   42. INCIDENT — CREATED
   ============================================================ */

function handleIncidentCreated(payload) {
  const incident = payload?.incident || payload;

  if (!incident) {
    return;
  }

  console.log("[LIVE INCIDENT] CREATED", incident);

  upsertByID(CommandCenter.incidents, incident);

  refreshActiveIncidents();

  calculateStats();

  showNotification(
    `New incident reported: ${incident.type || incident.title || "Emergency"}`,
    "error",
  );

  triggerCommandCenterUpdate("incident_created", incident);

  if (hasCoordinates(incident)) {
    triggerMapUpdate("incident", incident);
  }
}

/* ============================================================
   43. INCIDENT — UPDATED
   ============================================================ */

function handleIncidentUpdated(payload) {
  const incident = payload?.incident || payload;

  if (!incident) {
    return;
  }

  console.log("[LIVE INCIDENT] UPDATED", incident);

  upsertByID(CommandCenter.incidents, incident);

  refreshActiveIncidents();

  calculateStats();

  triggerCommandCenterUpdate("incident_updated", incident);

  if (hasCoordinates(incident)) {
    triggerMapUpdate("incident", incident);
  }
}

/* ============================================================
   44. INCIDENT — DELETED
   ============================================================ */

function handleIncidentDeleted(payload) {
  const incidentId = payload?.incidentId || payload?.id || payload?._id;

  if (!incidentId) {
    return;
  }

  console.log("[LIVE INCIDENT] DELETED:", incidentId);

  CommandCenter.incidents = removeByID(CommandCenter.incidents, incidentId);

  CommandCenter.activeIncidents = removeByID(
    CommandCenter.activeIncidents,
    incidentId,
  );

  calculateStats();

  triggerCommandCenterUpdate("incident_deleted", {
    incidentId,
  });

  triggerMapDelete("incident", incidentId);
}

/* ============================================================
   45. REFRESH ACTIVE INCIDENTS
   ============================================================ */

function refreshActiveIncidents() {
  const incidents = ensureArray(CommandCenter.incidents);

  CommandCenter.activeIncidents = incidents.filter((incident) => {
    const status = normalizeStatus(incident?.status);

    return [
      "reported",
      "active",
      "pending",
      "assigned",
      "in_progress",
      "ongoing",
      "responding",
      "dispatched",
      "open",
    ].includes(status);
  });

  return CommandCenter.activeIncidents;
}

/* ============================================================
   46. MISSION — CREATED
   ============================================================ */

function handleMissionCreated(payload) {
  const mission = payload?.mission || payload;

  if (!mission) {
    return;
  }

  console.log("[LIVE MISSION] CREATED", mission);

  upsertByID(CommandCenter.missions, mission);

  showNotification(
    `New mission created: ${mission.title || mission.name || "Mission"}`,
    "info",
  );

  triggerCommandCenterUpdate("mission_created", mission);
}

/* ============================================================
   47. MISSION — UPDATED
   ============================================================ */

function handleMissionUpdated(payload) {
  const mission = payload?.mission || payload;

  if (!mission) {
    return;
  }

  console.log("[LIVE MISSION] UPDATED", mission);

  upsertByID(CommandCenter.missions, mission);

  triggerCommandCenterUpdate("mission_updated", mission);
}

/* ============================================================
   48. MISSION — DELETED
   ============================================================ */

function handleMissionDeleted(payload) {
  const missionId = payload?.missionId || payload?.id || payload?._id;

  if (!missionId) {
    return;
  }

  console.log("[LIVE MISSION] DELETED:", missionId);

  CommandCenter.missions = removeByID(CommandCenter.missions, missionId);

  triggerCommandCenterUpdate("mission_deleted", {
    missionId,
  });
}

/* ============================================================
   49. TEAM — CREATED
   ============================================================ */

function handleTeamCreated(payload) {
  const team = payload?.team || payload;

  if (!team) {
    return;
  }

  console.log("[LIVE TEAM] CREATED", team);

  upsertByID(CommandCenter.teams, team);

  showNotification(
    `Team available: ${team.name || team.teamId || "New Team"}`,
    "success",
  );

  triggerCommandCenterUpdate("team_created", team);
}

/* ============================================================
   50. TEAM — UPDATED
   ============================================================ */

function handleTeamUpdated(payload) {
  const team = payload?.team || payload;

  if (!team) {
    return;
  }

  console.log("[LIVE TEAM] UPDATED", team);

  upsertByID(CommandCenter.teams, team);

  triggerCommandCenterUpdate("team_updated", team);
}

/* ============================================================
   51. TEAM — DELETED
   ============================================================ */

function handleTeamDeleted(payload) {
  const teamId = payload?.teamId || payload?.id || payload?._id;

  if (!teamId) {
    return;
  }

  console.log("[LIVE TEAM] DELETED:", teamId);

  CommandCenter.teams = removeByID(CommandCenter.teams, teamId);

  triggerCommandCenterUpdate("team_deleted", {
    teamId,
  });
}

/* ============================================================
   52. RESOURCE — CREATED
   ============================================================ */

function handleResourceCreated(payload) {
  const resource = payload?.resource || payload;

  if (!resource) {
    return;
  }

  console.log("[LIVE RESOURCE] CREATED", resource);

  upsertByID(CommandCenter.resources, resource);

  triggerCommandCenterUpdate("resource_created", resource);
}

/* ============================================================
   53. RESOURCE — UPDATED
   ============================================================ */

function handleResourceUpdated(payload) {
  const resource = payload?.resource || payload;

  if (!resource) {
    return;
  }

  console.log("[LIVE RESOURCE] UPDATED", resource);

  upsertByID(CommandCenter.resources, resource);

  triggerCommandCenterUpdate("resource_updated", resource);
}

/* ============================================================
   54. RESOURCE — DELETED
   ============================================================ */

function handleResourceDeleted(payload) {
  const resourceId = payload?.resourceId || payload?.id || payload?._id;

  if (!resourceId) {
    return;
  }

  console.log("[LIVE RESOURCE] DELETED:", resourceId);

  CommandCenter.resources = removeByID(CommandCenter.resources, resourceId);

  triggerCommandCenterUpdate("resource_deleted", {
    resourceId,
  });
}

/* ============================================================
   55. SOS — CREATED
   ============================================================ */

function handleSOSCreated(payload) {
  const sos = payload?.sos || payload;

  if (!sos) {
    return;
  }

  console.log("[LIVE SOS] CREATED", sos);

  upsertByID(CommandCenter.sos, sos);

  showNotification(`SOS received — ${sos.type || "Emergency"}`, "error");

  triggerCommandCenterUpdate("sos_created", sos);

  if (hasCoordinates(sos)) {
    triggerMapUpdate("sos", sos);
  }
}

/* ============================================================
   56. SOS — UPDATED
   ============================================================ */

function handleSOSUpdated(payload) {
  const sos = payload?.sos || payload;

  if (!sos) {
    return;
  }

  console.log("[LIVE SOS] UPDATED", sos);

  upsertByID(CommandCenter.sos, sos);

  triggerCommandCenterUpdate("sos_updated", sos);

  if (hasCoordinates(sos)) {
    triggerMapUpdate("sos", sos);
  }
}

/* ============================================================
   57. SOS — DELETED
   ============================================================ */

function handleSOSDeleted(payload) {
  const sosId = payload?.sosId || payload?.id || payload?._id;

  if (!sosId) {
    return;
  }

  console.log("[LIVE SOS] DELETED:", sosId);

  CommandCenter.sos = removeByID(CommandCenter.sos, sosId);

  triggerCommandCenterUpdate("sos_deleted", {
    sosId,
  });

  triggerMapDelete("sos", sosId);
}

/* ============================================================
   58. COMMAND CENTER UPDATE EVENT
   ============================================================ */

function triggerCommandCenterUpdate(type, data) {
  const event = new CustomEvent("commandcenter:update", {
    detail: {
      type,

      data,

      timestamp: new Date().toISOString(),
    },
  });

  document.dispatchEvent(event);

  if (typeof window.onCommandCenterUpdate === "function") {
    try {
      window.onCommandCenterUpdate(type, data);
    } catch (error) {
      console.error("[COMMAND CENTER] Update callback error:", error);
    }
  }
}

/* ============================================================
   59. MAP UPDATE EVENT
   ============================================================ */

function triggerMapUpdate(type, data) {
  const event = new CustomEvent("commandcenter:map-update", {
    detail: {
      type,
      data,
    },
  });

  document.dispatchEvent(event);
}

/* ============================================================
   60. MAP DELETE EVENT
   ============================================================ */

function triggerMapDelete(type, id) {
  const event = new CustomEvent("commandcenter:map-delete", {
    detail: {
      type,
      id,
    },
  });

  document.dispatchEvent(event);
}

/* ============================================================
   61. EXPORTS
   ============================================================ */

window.API_ROUTES = API_ROUTES;

window.SOCKET_EVENTS = SOCKET_EVENTS;

/* Generic API */

window.apiGet = apiGet;

window.apiPost = apiPost;

window.apiPatch = apiPatch;

window.apiPut = apiPut;

window.apiDelete = apiDelete;

/* SOS */

window.loadSOS = loadSOS;

window.getSOS = getSOS;

window.createSOS = createSOS;

window.updateSOS = updateSOS;

window.deleteSOS = deleteSOS;

/* Incidents */

window.loadIncidents = loadIncidents;

window.getIncident = getIncident;

window.createIncident = createIncident;

window.updateIncident = updateIncident;

window.deleteIncident = deleteIncident;

/* Other modules */

window.loadMissions = loadMissions;

window.loadTeams = loadTeams;

window.loadResources = loadResources;

window.loadFieldData = loadFieldData;

window.loadMapData = loadMapData;

window.loadUsers = loadUsers;

window.loadPredictions = loadPredictions;

/* Command Center */

window.loadAllCommandCenterData = loadAllCommandCenterData;

window.refreshCommandCenter = refreshCommandCenter;

window.refreshActiveIncidents = refreshActiveIncidents;

window.startCommandCenterAutoRefresh = startCommandCenterAutoRefresh;

/* Socket */

window.initializeSocket = initializeSocket;

window.registerCommandCenterSocketEvents = registerCommandCenterSocketEvents;

/* ============================================================
   62. FINAL STATE SAFETY
   ============================================================ */

/*
 * These are deliberately repeated here as a final
 * safety net because later parts of the file may
 * execute before their loaders have completed.
 */

CommandCenter.incidents = ensureArray(CommandCenter.incidents);

CommandCenter.activeIncidents = ensureArray(CommandCenter.activeIncidents);

CommandCenter.sos = ensureArray(CommandCenter.sos);

CommandCenter.missions = ensureArray(CommandCenter.missions);

CommandCenter.teams = ensureArray(CommandCenter.teams);

CommandCenter.resources = ensureArray(CommandCenter.resources);

CommandCenter.fieldData = ensureArray(CommandCenter.fieldData);

CommandCenter.fieldAgents = ensureArray(CommandCenter.fieldAgents);

CommandCenter.fieldDevices = ensureArray(CommandCenter.fieldDevices);

CommandCenter.users = ensureArray(CommandCenter.users);

CommandCenter.predictions = ensureArray(CommandCenter.predictions);

CommandCenter.shelters = ensureArray(CommandCenter.shelters);

CommandCenter.hospitals = ensureArray(CommandCenter.hospitals);

CommandCenter.policeStations = ensureArray(CommandCenter.policeStations);

CommandCenter.fireStations = ensureArray(CommandCenter.fireStations);

CommandCenter.pharmacies = ensureArray(CommandCenter.pharmacies);

CommandCenter.schools = ensureArray(CommandCenter.schools);

CommandCenter.communityCenters = ensureArray(CommandCenter.communityCenters);

CommandCenter.dangerZones = ensureArray(CommandCenter.dangerZones);

CommandCenter.safeZones = ensureArray(CommandCenter.safeZones);

CommandCenter.mapData = CommandCenter.mapData || null;

/* ============================================================
   DISASTEROS COMMAND CENTER
   REALTIME + FIELD DEVICES + GIS MAP
   ============================================================ */

/* ============================================================
   74. RECONNECT HANDLING
   ============================================================ */

function handleCommandCenterReconnect() {
  console.log("[SOCKET] Command Center reconnected.");

  updateConnectionStatus(true, "Live");

  setTimeout(() => {
    refreshCommandCenter();
  }, 500);

  emitCommandCenterPresence();
}

/* ============================================================
   75. DISCONNECT HANDLING
   ============================================================ */

function handleCommandCenterDisconnect(reason) {
  console.warn("[SOCKET] Command Center disconnected:", reason);

  updateConnectionStatus(false, "Offline");
}

/* ============================================================
   76. REGISTER CONNECTION HANDLERS
   ============================================================ */

function registerCommandCenterConnectionHandlers() {
  if (!CommandCenter.socket) {
    console.warn("[SOCKET] Socket unavailable.");
    return;
  }

  /* Prevent duplicate listeners */
  CommandCenter.socket.off("connect", handleCommandCenterReconnect);
  CommandCenter.socket.off("disconnect", handleCommandCenterDisconnect);

  CommandCenter.socket.on("connect", handleCommandCenterReconnect);
  CommandCenter.socket.on("disconnect", handleCommandCenterDisconnect);

  console.log("[SOCKET] Connection handlers registered.");
}

/* ============================================================
   78. LOAD FIELD DEVICES
   ============================================================ */

async function loadFieldDevices() {
  try {
    const response = await apiGet("/api/field");

    const devices = normalizeCollection(response);

    CommandCenter.fieldData = devices;

    CommandCenter.mapData.fieldDevices = devices;

    console.log(`[FIELD] Loaded ${devices.length} devices`);

    return devices;
  } catch (error) {
    console.error("[FIELD] Failed to load devices:", error);

    CommandCenter.fieldData = [];

    return [];
  }
}

/* ============================================================
   79. REGISTER FIELD DEVICE
   ============================================================ */

async function registerFieldDevice(deviceData) {
  if (!deviceData) {
    throw new Error("Device data is required.");
  }

  const payload = {
    deviceId: deviceData.deviceId,

    volunteer: deviceData.volunteer || null,

    team: deviceData.team || null,

    latitude: deviceData.latitude ?? null,

    longitude: deviceData.longitude ?? null,

    battery: deviceData.battery ?? null,

    networkStatus: deviceData.networkStatus || "ONLINE",
  };

  return apiPost("/api/field/register", payload);
}

/* ============================================================
   80. UPDATE FIELD DEVICE LOCATION
   ============================================================ */

async function updateFieldDeviceLocation(deviceId, latitude, longitude) {
  if (!deviceId) {
    throw new Error("Field device ID is required.");
  }

  if (latitude === undefined || longitude === undefined) {
    throw new Error("Latitude and longitude are required.");
  }

  return apiPatch(`/api/field/${deviceId}/location`, {
    latitude,
    longitude,
  });
}

/* ============================================================
   81. UPDATE FIELD DEVICE STATUS
   ============================================================ */

async function updateFieldDeviceStatus(deviceId, statusData) {
  if (!deviceId) {
    throw new Error("Field device ID is required.");
  }

  return apiPatch(`/api/field/${deviceId}/status`, statusData);
}

/* ============================================================
   82. REFRESH FIELD DEVICES
   ============================================================ */

async function refreshFieldDevices() {
  try {
    const devices = await loadFieldDevices();

    devices.forEach((device) => {
      if (hasCoordinates(device)) {
        triggerMapUpdate("field_device", device);
      }
    });

    renderAllFieldDeviceMarkers();

    triggerCommandCenterUpdate("field_devices_refreshed", devices);

    return devices;
  } catch (error) {
    console.error("[FIELD] Refresh failed:", error);

    return [];
  }
}

const FIELD_REFRESH_INTERVAL = 15 * 1000;

let fieldRefreshTimer = null;

function startFieldDeviceRefresh() {
  if (fieldRefreshTimer) {
    clearInterval(fieldRefreshTimer);
  }

  fieldRefreshTimer = setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      CommandCenter.socket &&
      CommandCenter.socket.connected
    ) {
      refreshFieldDevices();
    }
  }, FIELD_REFRESH_INTERVAL);
}

/* ============================================================
   84. INITIAL SOCKET REGISTRATION
   ============================================================ */

function initializeCommandCenterRealtime() {
  if (!CommandCenter.socket) {
    console.warn("[SOCKET] Socket does not exist yet.");
    return;
  }

  registerCommandCenterSocketEvents();

  registerCommandCenterConnectionHandlers();

  startFieldDeviceRefresh();

  console.log("==========================================");
  console.log("[SOCKET] REAL-TIME COMMAND CENTER READY");
  console.log("==========================================");
}

/* ============================================================
   WAIT FOR SOCKET
   ============================================================ */

function waitForSocketAndInitialize() {
  if (CommandCenter.socket) {
    initializeCommandCenterRealtime();
    return;
  }

  let attempts = 0;

  const maxAttempts = 50;

  const timer = setInterval(() => {
    attempts++;

    if (CommandCenter.socket) {
      clearInterval(timer);

      initializeCommandCenterRealtime();

      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);

      console.warn("[SOCKET] Unable to initialize realtime layer.");
    }
  }, 100);
}

/* ============================================================
   86. PUBLIC SOCKET API
   ============================================================ */

window.SOCKET_EVENTS = SOCKET_EVENTS;

/* Incident */

window.handleIncidentCreated = handleIncidentCreated;

window.handleIncidentUpdated = handleIncidentUpdated;

window.handleIncidentDeleted = handleIncidentDeleted;

/* Mission */

window.handleMissionCreated = handleMissionCreated;

window.handleMissionUpdated = handleMissionUpdated;

window.handleMissionDeleted = handleMissionDeleted;

/* Team */

window.handleTeamCreated = handleTeamCreated;

window.handleTeamUpdated = handleTeamUpdated;

window.handleTeamDeleted = handleTeamDeleted;

/* Resource */

window.handleResourceCreated = handleResourceCreated;

window.handleResourceUpdated = handleResourceUpdated;

window.handleResourceDeleted = handleResourceDeleted;

/* SOS */

window.handleSOSCreated = handleSOSCreated;

window.handleSOSUpdated = handleSOSUpdated;

window.handleSOSDeleted = handleSOSDeleted;

/* Field */

window.loadFieldDevices = loadFieldDevices;

window.registerFieldDevice = registerFieldDevice;

window.updateFieldDeviceLocation = updateFieldDeviceLocation;

window.updateFieldDeviceStatus = updateFieldDeviceStatus;

window.refreshFieldDevices = refreshFieldDevices;

/* Realtime */

window.initializeCommandCenterRealtime = initializeCommandCenterRealtime;

/* ============================================================
   87. START REALTIME LAYER
   ============================================================ */

waitForSocketAndInitialize();

/* ============================================================
   88. COMMAND CENTER MAP DATA
   ============================================================ */

CommandCenter.mapData = CommandCenter.mapData || {
  hospitals: [],
  policeStations: [],
  fireStations: [],
  pharmacies: [],
  schools: [],
  shelters: [],
  communityCentres: [],

  incidents: [],
  sos: [],
  fieldDevices: [],

  markers: {},
  layers: {},

  lastLatitude: null,
  lastLongitude: null,
};

/* ============================================================
   89. MAP CONFIGURATION
   ============================================================ */

const MAP_CONFIG = {
  defaultLatitude: 28.6139,
  defaultLongitude: 77.209,

  defaultZoom: 11,

  resourceRefreshInterval: 60 * 1000,

  fieldRefreshInterval: 15 * 1000,
};

/* ============================================================
   90. MAP ICON CACHE
   ============================================================ */

const mapIconCache = {};

/* ============================================================
   91. CREATE MAP ICON
   ============================================================ */

function createCommandCenterIcon(type) {
  if (mapIconCache[type]) {
    return mapIconCache[type];
  }

  const iconMap = {
    incident: "⚠️",
    sos: "🆘",
    field: "📡",

    hospital: "🏥",
    police: "👮",
    fire: "🚒",
    pharmacy: "💊",
    school: "🏫",
    shelter: "🏠",
    community: "🏢",
  };

  const icon = L.divIcon({
    className: "command-center-map-icon",

    html: `
      <div class="cc-map-marker cc-map-marker-${type}">
        <span>${icon}</span>
      </div>
    `,

    iconSize: [38, 38],

    iconAnchor: [19, 19],

    popupAnchor: [0, -20],
  });

  mapIconCache[type] = icon;

  return icon;
}

/* ============================================================
   92. GET LATITUDE
   ============================================================ */

function getLatitude(item) {
  if (!item) {
    return null;
  }

  const value =
    item.latitude ??
    item.lat ??
    item.location?.latitude ??
    item.location?.lat ??
    item.coordinates?.latitude ??
    item.coordinates?.lat;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/* ============================================================
   93. GET LONGITUDE
   ============================================================ */

function getLongitude(item) {
  if (!item) {
    return null;
  }

  const value =
    item.longitude ??
    item.lng ??
    item.lon ??
    item.location?.longitude ??
    item.location?.lng ??
    item.location?.lon ??
    item.coordinates?.longitude ??
    item.coordinates?.lng;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/* ============================================================
   94. CHECK COORDINATES
   ============================================================ */

function hasCoordinates(item) {
  return getLatitude(item) !== null && getLongitude(item) !== null;
}

/* ============================================================
   95. FORMAT COORDINATES
   ============================================================ */

function formatCoordinates(item) {
  const lat = getLatitude(item);

  const lng = getLongitude(item);

  if (lat === null || lng === null) {
    return "Location unavailable";
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/* ============================================================
   96. ESCAPE HTML
   ============================================================ */

function escapeMapHTML(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   97. RESOURCE NAME
   ============================================================ */

function getResourceName(item, fallback) {
  return (
    item?.name ||
    item?.formatted ||
    item?.address_line1 ||
    item?.address_line2 ||
    item?.place_name ||
    fallback
  );
}

/* ============================================================
   98. RESOURCE ADDRESS
   ============================================================ */

function getResourceAddress(item) {
  return (
    item?.formatted ||
    item?.address ||
    item?.address_line1 ||
    item?.address_line2 ||
    "Address unavailable"
  );
}

/* ============================================================
   99. RESOURCE POPUP
   ============================================================ */

function createResourcePopup(item, type) {
  const name = getResourceName(item, type);

  const address = getResourceAddress(item);

  return `
    <div class="cc-map-popup">

      <div class="cc-popup-type">
        ${escapeMapHTML(type.toUpperCase())}
      </div>

      <h3>
        ${escapeMapHTML(name)}
      </h3>

      <p>
        ${escapeMapHTML(address)}
      </p>

      <p>
        <strong>Coordinates:</strong><br>
        ${escapeMapHTML(formatCoordinates(item))}
      </p>

    </div>
  `;
}

/* ============================================================
   100. INCIDENT POPUP
   ============================================================ */

function createIncidentPopup(incident) {
  const title = incident.type || "Incident";

  const severity = incident.severity || "UNKNOWN";

  const status = incident.status || "UNKNOWN";

  const description = incident.description || "No description";

  const affected = incident.peopleAffected ?? 0;

  return `
    <div class="cc-map-popup cc-popup-incident">

      <div class="cc-popup-type">
        INCIDENT
      </div>

      <h3>
        ${escapeMapHTML(title)}
      </h3>

      <p>
        ${escapeMapHTML(description)}
      </p>

      <div class="cc-popup-grid">

        <div>
          <strong>Severity</strong>
          <span>
            ${escapeMapHTML(severity)}
          </span>
        </div>

        <div>
          <strong>Status</strong>
          <span>
            ${escapeMapHTML(status)}
          </span>
        </div>

        <div>
          <strong>Affected</strong>
          <span>
            ${escapeMapHTML(affected)}
          </span>
        </div>

        <div>
          <strong>Location</strong>
          <span>
            ${escapeMapHTML(formatCoordinates(incident))}
          </span>
        </div>

      </div>

    </div>
  `;
}

/* ============================================================
   101. SOS POPUP
   ============================================================ */

function createSOSPopup(sos) {
  const type = sos.type || "Emergency";

  const severity = sos.severity || "UNKNOWN";

  const status = sos.status || "WAITING";

  const people = sos.peopleCount ?? 1;

  const description = sos.description || "No description";

  return `
    <div class="cc-map-popup cc-popup-sos">

      <div class="cc-popup-type">
        SOS EMERGENCY
      </div>

      <h3>
        ${escapeMapHTML(type)}
      </h3>

      <p>
        ${escapeMapHTML(description)}
      </p>

      <div class="cc-popup-grid">

        <div>
          <strong>Severity</strong>
          <span>
            ${escapeMapHTML(severity)}
          </span>
        </div>

        <div>
          <strong>Status</strong>
          <span>
            ${escapeMapHTML(status)}
          </span>
        </div>

        <div>
          <strong>People</strong>
          <span>
            ${escapeMapHTML(people)}
          </span>
        </div>

        <div>
          <strong>Location</strong>
          <span>
            ${escapeMapHTML(formatCoordinates(sos))}
          </span>
        </div>

      </div>

    </div>
  `;
}

/* ============================================================
   102. FIELD DEVICE POPUP
   ============================================================ */

function createFieldPopup(device) {
  const deviceId = device.deviceId || "Unknown device";

  const status = device.status || "UNKNOWN";

  const network = device.networkStatus || "UNKNOWN";

  const battery =
    device.battery !== null && device.battery !== undefined
      ? `${device.battery}%`
      : "N/A";

  const volunteer =
    typeof device.volunteer === "object"
      ? device.volunteer?.name
      : device.volunteer;

  const team =
    typeof device.team === "object"
      ? device.team?.name || device.team?.teamId
      : device.team;

  return `
    <div class="cc-map-popup cc-popup-field">

      <div class="cc-popup-type">
        FIELD DEVICE
      </div>

      <h3>
        ${escapeMapHTML(deviceId)}
      </h3>

      <div class="cc-popup-grid">

        <div>
          <strong>Status</strong>
          <span>
            ${escapeMapHTML(status)}
          </span>
        </div>

        <div>
          <strong>Network</strong>
          <span>
            ${escapeMapHTML(network)}
          </span>
        </div>

        <div>
          <strong>Battery</strong>
          <span>
            ${escapeMapHTML(battery)}
          </span>
        </div>

        <div>
          <strong>Volunteer</strong>
          <span>
            ${escapeMapHTML(volunteer || "Unassigned")}
          </span>
        </div>

        <div>
          <strong>Team</strong>
          <span>
            ${escapeMapHTML(team || "Unassigned")}
          </span>
        </div>

        <div>
          <strong>Location</strong>
          <span>
            ${escapeMapHTML(formatCoordinates(device))}
          </span>
        </div>

      </div>

    </div>
  `;
}

/* ============================================================
   103. GET COMMAND CENTER MAP
   ============================================================ */

function getCommandCenterMap() {
  if (
    CommandCenter &&
    CommandCenter.map &&
    typeof CommandCenter.map.addLayer === "function"
  ) {
    return CommandCenter.map;
  }

  if (
    window.commandCenterMap &&
    typeof window.commandCenterMap.addLayer === "function"
  ) {
    return window.commandCenterMap;
  }

  return null;
}

/* ============================================================
   104. CREATE / GET MAP LAYER
   ============================================================ */

function getMapLayer(type) {
  const mapInstance = getCommandCenterMap();

  if (!mapInstance) {
    return null;
  }

  if (CommandCenter.mapData.layers[type]) {
    return CommandCenter.mapData.layers[type];
  }

  const layer = L.layerGroup();

  layer.addTo(mapInstance);

  CommandCenter.mapData.layers[type] = layer;

  return layer;
}

/* ============================================================
   105. ADD RESOURCE MARKER
   ============================================================ */

function addResourceMarker(item, type) {
  if (!hasCoordinates(item)) {
    return null;
  }

  const lat = getLatitude(item);

  const lng = getLongitude(item);

  const layer = getMapLayer(type);

  if (!layer) {
    return null;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandCenterIcon(type),
  });

  marker.bindPopup(createResourcePopup(item, type));

  marker.addTo(layer);

  return marker;
}

/* ============================================================
   106. CLEAR MAP LAYER
   ============================================================ */

function clearMapLayer(type) {
  const layer = CommandCenter.mapData.layers[type];

  if (!layer) {
    return;
  }

  layer.clearLayers();
}

/* ============================================================
   107. RENDER RESOURCE COLLECTION
   ============================================================ */

function renderResourceCollection(type, resources) {
  const list = Array.isArray(resources) ? resources : [];

  clearMapLayer(type);

  CommandCenter.mapData[type] = list;

  list.forEach((item) => {
    addResourceMarker(item, type);
  });

  return list.length;
}

/* ============================================================
   108. LOAD NEARBY MAP RESOURCES
   ============================================================ */

async function loadNearbyMapResources(latitude, longitude) {
  if (latitude === undefined || longitude === undefined) {
    throw new Error("Latitude and longitude are required.");
  }

  const query =
    `?lat=${encodeURIComponent(latitude)}` +
    `&lng=${encodeURIComponent(longitude)}`;

  try {
    const response = await apiGet(`/api/map/resources${query}`);

    const resources = response?.resources || response?.data?.resources || {};

    const resourceTypes = [
      "hospitals",
      "policeStations",
      "fireStations",
      "pharmacies",
      "schools",
      "shelters",
      "communityCentres",
    ];

    resourceTypes.forEach((type) => {
      CommandCenter.mapData[type] = Array.isArray(resources[type])
        ? resources[type]
        : [];

      renderResourceCollection(type, CommandCenter.mapData[type]);
    });

    CommandCenter.mapData.lastLatitude = Number(latitude);

    CommandCenter.mapData.lastLongitude = Number(longitude);

    triggerCommandCenterUpdate("map_resources_loaded", resources);

    console.log("[MAP] Resources loaded:", {
      hospitals: CommandCenter.mapData.hospitals.length,

      police: CommandCenter.mapData.policeStations.length,

      fire: CommandCenter.mapData.fireStations.length,

      pharmacies: CommandCenter.mapData.pharmacies.length,

      schools: CommandCenter.mapData.schools.length,

      shelters: CommandCenter.mapData.shelters.length,

      communityCentres: CommandCenter.mapData.communityCentres.length,
    });

    return resources;
  } catch (error) {
    console.error("[MAP] Resource loading failed:", error);

    throw error;
  }
}

/* ============================================================
   109. GENERIC MAP PLACE REQUEST
   ============================================================ */

async function loadMapPlaceEndpoint(endpoint, latitude, longitude) {
  if (latitude === undefined || longitude === undefined) {
    throw new Error("Latitude and longitude are required.");
  }

  const query =
    `?lat=${encodeURIComponent(latitude)}` +
    `&lng=${encodeURIComponent(longitude)}`;

  const response = await apiGet(`${endpoint}${query}`);

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.resources)) {
    return response.resources;
  }

  return [];
}

/* ============================================================
   110. LOAD POLICE
   ============================================================ */

async function loadPoliceStations(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/police",
    latitude,
    longitude,
  );

  renderResourceCollection("policeStations", data);

  return data;
}

/* ============================================================
   111. LOAD FIRE STATIONS
   ============================================================ */

async function loadFireStations(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/fire-stations",
    latitude,
    longitude,
  );

  renderResourceCollection("fireStations", data);

  return data;
}

/* ============================================================
   112. LOAD PHARMACIES
   ============================================================ */

async function loadPharmacies(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/pharmacies",
    latitude,
    longitude,
  );

  renderResourceCollection("pharmacies", data);

  return data;
}

/* ============================================================
   113. LOAD SHELTERS
   ============================================================ */

async function loadShelters(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/shelters",
    latitude,
    longitude,
  );

  renderResourceCollection("shelters", data);

  return data;
}

/* ============================================================
   114. LOAD SCHOOLS
   ============================================================ */

async function loadSchools(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/schools",
    latitude,
    longitude,
  );

  renderResourceCollection("schools", data);

  return data;
}

/* ============================================================
   115. LOAD COMMUNITY CENTRES
   ============================================================ */

async function loadCommunityCentres(latitude, longitude) {
  const data = await loadMapPlaceEndpoint(
    "/api/map/community-centres",
    latitude,
    longitude,
  );

  renderResourceCollection("communityCentres", data);

  return data;
}

/* ============================================================
   116. GEOCODE LOCATION
   ============================================================ */

async function geocodeCommandCenterLocation(location) {
  if (!location || !String(location).trim()) {
    throw new Error("Location is required.");
  }

  const query = `?location=${encodeURIComponent(location)}`;

  const response = await apiGet(`/api/map/geocode${query}`);

  const result = response?.location || response?.data?.location || null;

  if (!result) {
    throw new Error("Location not found.");
  }

  return result;
}

/* ============================================================
   117. FOCUS MAP
   ============================================================ */

function focusCommandCenterMap(latitude, longitude, zoom = 14) {
  const mapInstance = getCommandCenterMap();

  if (!mapInstance) {
    console.warn("[MAP] Map instance unavailable.");

    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn("[MAP] Invalid coordinates.");

    return;
  }

  mapInstance.setView([lat, lng], zoom);
}

/* ============================================================
   118. FOCUS + LOAD RESOURCES
   ============================================================ */

async function focusAndLoadResources(latitude, longitude) {
  focusCommandCenterMap(latitude, longitude, 14);

  return loadNearbyMapResources(latitude, longitude);
}

/* ============================================================
   119. RENDER INCIDENT MARKER
   ============================================================ */

function renderIncidentMarker(incident) {
  if (!hasCoordinates(incident)) {
    return;
  }

  const layer = getMapLayer("incidents");

  if (!layer) {
    return;
  }

  const marker = L.marker([getLatitude(incident), getLongitude(incident)], {
    icon: createCommandCenterIcon("incident"),
  });

  marker.bindPopup(createIncidentPopup(incident));

  marker.addTo(layer);

  const id = getEntityID(incident);

  if (id) {
    CommandCenter.mapData.markers.incidents =
      CommandCenter.mapData.markers.incidents || {};

    CommandCenter.mapData.markers.incidents[id] = marker;
  }
}

/* ============================================================
   120. RENDER ALL INCIDENT MARKERS
   ============================================================ */

function renderAllIncidentMarkers() {
  clearMapLayer("incidents");

  CommandCenter.mapData.markers.incidents = {};

  const incidents = CommandCenter.incidents || [];

  incidents.forEach(renderIncidentMarker);
}

/* ============================================================
   121. RENDER SOS MARKER
   ============================================================ */

function renderSOSMarker(sos) {
  if (!hasCoordinates(sos)) {
    return;
  }

  const layer = getMapLayer("sos");

  if (!layer) {
    return;
  }

  const marker = L.marker([getLatitude(sos), getLongitude(sos)], {
    icon: createCommandCenterIcon("sos"),
  });

  marker.bindPopup(createSOSPopup(sos));

  marker.addTo(layer);

  const id = getEntityID(sos);

  if (id) {
    CommandCenter.mapData.markers.sos = CommandCenter.mapData.markers.sos || {};

    CommandCenter.mapData.markers.sos[id] = marker;
  }
}

/* ============================================================
   122. RENDER ALL SOS
   ============================================================ */

function renderAllSOSMarkers() {
  clearMapLayer("sos");

  CommandCenter.mapData.markers.sos = {};

  const requests = CommandCenter.sos || [];

  requests.forEach(renderSOSMarker);
}

/* ============================================================
   123. RENDER FIELD DEVICE MARKER
   ============================================================ */

function renderFieldDeviceMarker(device) {
  if (!hasCoordinates(device)) {
    return;
  }

  const layer = getMapLayer("fieldDevices");

  if (!layer) {
    return;
  }

  const marker = L.marker([getLatitude(device), getLongitude(device)], {
    icon: createCommandCenterIcon("field"),
  });

  marker.bindPopup(createFieldPopup(device));

  marker.addTo(layer);

  const id = getEntityID(device) || device.deviceId;

  if (id) {
    CommandCenter.mapData.markers.fieldDevices =
      CommandCenter.mapData.markers.fieldDevices || {};

    CommandCenter.mapData.markers.fieldDevices[id] = marker;
  }
}

/* ============================================================
   124. RENDER ALL FIELD DEVICES
   ============================================================ */

function renderAllFieldDeviceMarkers() {
  clearMapLayer("fieldDevices");

  CommandCenter.mapData.markers.fieldDevices = {};

  const devices = CommandCenter.fieldData || [];

  devices.forEach(renderFieldDeviceMarker);
}

/* ============================================================
   125. RENDER EVERYTHING
   ============================================================ */

function renderCommandCenterMapData() {
  renderAllIncidentMarkers();

  renderAllSOSMarkers();

  renderAllFieldDeviceMarkers();

  console.log("[MAP] Operational layers rendered.");
}

/* ============================================================
   126. COMMAND CENTER UPDATE EVENTS
   ============================================================ */

document.addEventListener("commandcenter:update", (event) => {
  const detail = event.detail;

  if (!detail) {
    return;
  }

  switch (detail.type) {
    case "incident_created":

    case "incident_updated":

    case "incident_deleted":
      renderAllIncidentMarkers();
      break;

    case "sos_created":

    case "sos_updated":

    case "sos_deleted":
      renderAllSOSMarkers();
      break;

    case "field_devices_refreshed":
      renderAllFieldDeviceMarkers();
      break;
  }
});

/* ============================================================
   127. LIVE MAP UPDATE EVENTS
   ============================================================ */

document.addEventListener("commandcenter:map-update", (event) => {
  const detail = event.detail;

  if (!detail) {
    return;
  }

  if (detail.type === "sos") {
    renderAllSOSMarkers();
  }

  if (detail.type === "field_device") {
    renderAllFieldDeviceMarkers();
  }
});

/* ============================================================
   128. LIVE MAP DELETE EVENTS
   ============================================================ */

document.addEventListener("commandcenter:map-delete", (event) => {
  const detail = event.detail;

  if (!detail) {
    return;
  }

  if (detail.type === "sos") {
    renderAllSOSMarkers();
  }
});

/* ============================================================
   129. MAP RESOURCE AUTO REFRESH
   ============================================================ */

let mapResourceRefreshTimer = null;

function startMapResourceRefresh(latitude, longitude) {
  if (mapResourceRefreshTimer) {
    clearInterval(mapResourceRefreshTimer);
  }

  if (latitude === undefined || longitude === undefined) {
    return;
  }

  mapResourceRefreshTimer = setInterval(async () => {
    try {
      await loadNearbyMapResources(latitude, longitude);
    } catch (error) {
      console.warn("[MAP] Resource refresh failed:", error);
    }
  }, MAP_CONFIG.resourceRefreshInterval);
}

/* ============================================================
   130. LOAD MAP FROM CURRENT LOCATION
   ============================================================ */

function loadMapFromCurrentLocation() {
  if (!navigator.geolocation) {
    console.error("[MAP] Geolocation is not supported.");

    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;

      const longitude = position.coords.longitude;

      try {
        focusCommandCenterMap(latitude, longitude, 14);

        await loadNearbyMapResources(latitude, longitude);

        startMapResourceRefresh(latitude, longitude);
      } catch (error) {
        console.error("[MAP] Current location loading failed:", error);
      }
    },

    (error) => {
      console.error("[MAP] Geolocation error:", error);
    },

    {
      enableHighAccuracy: true,

      timeout: 15000,

      maximumAge: 30000,
    },
  );
}

/* ============================================================
   131. LOAD MAP FROM ADDRESS
   ============================================================ */

async function loadMapFromAddress(location) {
  try {
    const result = await geocodeCommandCenterLocation(location);

    const latitude = getLatitude(result);

    const longitude = getLongitude(result);

    if (latitude === null || longitude === null) {
      throw new Error("Geocoding result does not contain valid coordinates.");
    }

    await focusAndLoadResources(latitude, longitude);

    startMapResourceRefresh(latitude, longitude);

    return result;
  } catch (error) {
    console.error("[MAP] Address lookup failed:", error);

    throw error;
  }
}

/* ============================================================
   132. FIT MAP TO OPERATIONAL DATA
   ============================================================ */

function fitMapToOperationalData() {
  const mapInstance = getCommandCenterMap();

  if (!mapInstance) {
    return;
  }

  const points = [];

  const collect = (item) => {
    if (hasCoordinates(item)) {
      points.push([getLatitude(item), getLongitude(item)]);
    }
  };

  (CommandCenter.incidents || []).forEach(collect);

  (CommandCenter.sos || []).forEach(collect);

  (CommandCenter.fieldData || []).forEach(collect);

  if (points.length === 0) {
    return;
  }

  mapInstance.fitBounds(L.latLngBounds(points), {
    padding: [50, 50],
  });
}

/* ============================================================
   133. MAP LAYER VISIBILITY
   ============================================================ */

function setMapLayerVisibility(type, visible) {
  const mapInstance = getCommandCenterMap();

  const layer = CommandCenter.mapData.layers[type];

  if (!mapInstance || !layer) {
    return;
  }

  if (visible) {
    if (!mapInstance.hasLayer(layer)) {
      layer.addTo(mapInstance);
    }
  } else {
    if (mapInstance.hasLayer(layer)) {
      mapInstance.removeLayer(layer);
    }
  }
}

/* ============================================================
   134. TOGGLE MAP LAYER
   ============================================================ */

function toggleMapLayer(type) {
  const mapInstance = getCommandCenterMap();

  const layer = CommandCenter.mapData.layers[type];

  if (!mapInstance || !layer) {
    return false;
  }

  if (mapInstance.hasLayer(layer)) {
    mapInstance.removeLayer(layer);

    return false;
  }

  layer.addTo(mapInstance);

  return true;
}

/* ============================================================
   135. MAP LEGEND
   ============================================================ */

const COMMAND_CENTER_MAP_LEGEND = [
  {
    type: "incident",
    label: "Incidents",
  },

  {
    type: "sos",
    label: "SOS",
  },

  {
    type: "field",
    label: "Field Devices",
  },

  {
    type: "hospital",
    label: "Hospitals",
  },

  {
    type: "police",
    label: "Police",
  },

  {
    type: "fire",
    label: "Fire Stations",
  },

  {
    type: "pharmacy",
    label: "Pharmacies",
  },

  {
    type: "school",
    label: "Schools",
  },

  {
    type: "shelter",
    label: "Shelters",
  },

  {
    type: "community",
    label: "Community Centres",
  },
];

/* ============================================================
   136. INITIALIZE LEAFLET MAP
   ============================================================ */

function initializeCommandCenterMap() {
  console.log("[MAP] Initializing Leaflet map...");

  const mapElement = document.getElementById("commandMap");

  if (!mapElement) {
    console.error("[MAP] #commandMap element not found.");

    return null;
  }

  if (typeof L === "undefined") {
    console.error("[MAP] Leaflet is not loaded.");

    return null;
  }

  /* ----------------------------------------------------------
     EXISTING COMMAND CENTER MAP
     ---------------------------------------------------------- */

  if (CommandCenter.map && typeof CommandCenter.map.addLayer === "function") {
    console.log("[MAP] Existing Command Center map reused.");

    return CommandCenter.map;
  }

  /* ----------------------------------------------------------
     EXISTING GLOBAL MAP
     ---------------------------------------------------------- */

  if (
    window.commandCenterMap &&
    typeof window.commandCenterMap.addLayer === "function"
  ) {
    console.log("[MAP] Existing global map reused.");

    CommandCenter.map = window.commandCenterMap;

    return window.commandCenterMap;
  }

  /* ----------------------------------------------------------
     PREVENT DUPLICATE LEAFLET INITIALIZATION
     ---------------------------------------------------------- */

  if (mapElement._leaflet_id) {
    console.warn("[MAP] Map container already belongs to Leaflet.");

    return null;
  }

  /* ----------------------------------------------------------
     CREATE MAP
     ---------------------------------------------------------- */

  try {
    const mapInstance = L.map("commandMap", {
      center: [MAP_CONFIG.defaultLatitude, MAP_CONFIG.defaultLongitude],

      zoom: MAP_CONFIG.defaultZoom,

      zoomControl: false,

      attributionControl: true,

      preferCanvas: true,
    });

    /* --------------------------------------------------------
       OPENSTREETMAP
       -------------------------------------------------------- */

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,

      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance);

    /* --------------------------------------------------------
       ZOOM CONTROL
       -------------------------------------------------------- */

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(mapInstance);

    /* --------------------------------------------------------
       STORE CANONICAL MAP INSTANCE
       -------------------------------------------------------- */

    CommandCenter.map = mapInstance;

    window.commandCenterMap = mapInstance;

    window.commandCenterLeafletMap = mapInstance;

    /* --------------------------------------------------------
       FIX SIZE AFTER DOM PAINT
       -------------------------------------------------------- */

    setTimeout(() => {
      try {
        mapInstance.invalidateSize();
      } catch (error) {
        console.warn("[MAP] invalidateSize failed:", error);
      }
    }, 300);

    console.log("[MAP] Leaflet map initialized successfully.");

    return mapInstance;
  } catch (error) {
    console.error("[MAP] Leaflet initialization failed:", error);

    return null;
  }
}

/* ============================================================
   137. INITIALIZE MAP LAYERS
   ============================================================ */

function initializeCommandCenterMapLayers() {
  const mapInstance = getCommandCenterMap();

  if (!mapInstance) {
    console.warn("[MAP] Cannot initialize layers: map unavailable.");

    return false;
  }

  const layers = [
    "hospitals",
    "policeStations",
    "fireStations",
    "pharmacies",
    "schools",
    "shelters",
    "communityCentres",

    "incidents",
    "sos",
    "fieldDevices",
  ];

  layers.forEach((type) => {
    getMapLayer(type);
  });

  renderCommandCenterMapData();

  console.log("[MAP] GIS layers initialized.");

  return true;
}

/* ============================================================
   138. INITIALIZE COMPLETE MAP SYSTEM
   ============================================================ */

function initializeCommandCenterGIS() {
  console.log("==========================================");

  console.log("[MAP] Starting Command Center GIS...");

  console.log("==========================================");

  if (typeof L === "undefined") {
    console.error("[MAP] Leaflet is not available.");

    return null;
  }

  const mapInstance = initializeCommandCenterMap();

  if (!mapInstance) {
    console.error("[MAP] Failed to initialize map.");

    return null;
  }

  initializeCommandCenterMapLayers();

  /* Load field devices after map exists */
  refreshFieldDevices().catch((error) => {
    console.warn("[FIELD] Initial field device load failed:", error);
  });

  console.log("[MAP] Command Center GIS ready.");

  return mapInstance;
}

/* ============================================================
   139. PUBLIC MAP API
   ============================================================ */

window.loadNearbyMapResources = loadNearbyMapResources;

window.loadPoliceStations = loadPoliceStations;

window.loadFireStations = loadFireStations;

window.loadPharmacies = loadPharmacies;

window.loadShelters = loadShelters;

window.loadSchools = loadSchools;

window.loadCommunityCentres = loadCommunityCentres;

window.geocodeCommandCenterLocation = geocodeCommandCenterLocation;

window.focusCommandCenterMap = focusCommandCenterMap;

window.focusAndLoadResources = focusAndLoadResources;

window.loadMapFromCurrentLocation = loadMapFromCurrentLocation;

window.loadMapFromAddress = loadMapFromAddress;

window.fitMapToOperationalData = fitMapToOperationalData;

window.setMapLayerVisibility = setMapLayerVisibility;

window.toggleMapLayer = toggleMapLayer;

window.initializeCommandCenterMap = initializeCommandCenterMap;

window.initializeCommandCenterMapLayers = initializeCommandCenterMapLayers;

window.initializeCommandCenterGIS = initializeCommandCenterGIS;

/* ============================================================
   140. START GIS
   ============================================================ */

function startCommandCenterGISWhenReady() {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initializeCommandCenterGIS();
      },
      {
        once: true,
      },
    );

    return;
  }

  initializeCommandCenterGIS();
}

startCommandCenterGISWhenReady();

CommandCenter.dashboard = CommandCenter.dashboard || {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  fieldDevices: [],

  activity: [],

  lastRefresh: null,
};

/* ============================================================
   COMMAND CENTER — OPERATIONAL DASHBOARD
   Clean unified version
   ============================================================ */

/* ============================================================
   1. API ENDPOINTS
   ============================================================ */

const COMMAND_CENTER_ENDPOINTS = {
  incidents: "/api/incidents",
  sos: "/api/sos",
  missions: "/api/missions",
  teams: "/api/teams",
  resources: "/api/resources",
  field: "/api/field",
};

/* ============================================================
   2. COMMAND CENTER STATE
   ============================================================ */

function ensureCommandCenterRoot() {
  if (typeof window.CommandCenter !== "object" || !window.CommandCenter) {
    window.CommandCenter = {};
  }

  const state = window.CommandCenter;

  if (!state.dashboard || typeof state.dashboard !== "object") {
    state.dashboard = {};
  }

  const dashboard = state.dashboard;

  if (!Array.isArray(dashboard.incidents)) {
    dashboard.incidents = Array.isArray(state.incidents) ? state.incidents : [];
  }

  if (!Array.isArray(dashboard.sos)) {
    dashboard.sos = Array.isArray(state.sos) ? state.sos : [];
  }

  if (!Array.isArray(dashboard.missions)) {
    dashboard.missions = Array.isArray(state.missions) ? state.missions : [];
  }

  if (!Array.isArray(dashboard.teams)) {
    dashboard.teams = Array.isArray(state.teams) ? state.teams : [];
  }

  if (!Array.isArray(dashboard.resources)) {
    dashboard.resources = Array.isArray(state.resources) ? state.resources : [];
  }

  if (!Array.isArray(dashboard.fieldDevices)) {
    dashboard.fieldDevices = Array.isArray(state.fieldData)
      ? state.fieldData
      : [];
  }

  if (!Array.isArray(dashboard.activity)) {
    dashboard.activity = [];
  }

  return state;
}

function ensureDashboardState() {
  return ensureCommandCenterRoot().dashboard;
}

/* ============================================================
   3. BASIC HELPERS
   ============================================================ */

function safeValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function extractArray(response) {
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

  return [];
}

/* ============================================================
   4. ENTITY ID
   ============================================================ */

function getEntityID(entity) {
  if (!entity) {
    return null;
  }

  return (
    entity._id ||
    entity.id ||
    entity.incidentId ||
    entity.sosId ||
    entity.missionId ||
    entity.teamId ||
    entity.resourceId ||
    entity.deviceId ||
    null
  );
}

/* ============================================================
   5. STATUS NORMALIZATION
   ============================================================ */

/*
 * IMPORTANT:
 *
 * Always return lowercase.
 *
 * This prevents bugs like:
 *
 * normalizeStatus("ACTIVE") === "ACTIVE"
 *
 * while code checks:
 *
 * ["active", "pending"].includes(...)
 *
 * Now everything consistently uses lowercase.
 */

function normalizeStatus(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

/* ============================================================
   6. DATE HELPERS
   ============================================================ */

function formatDashboardDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(value) {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const difference = Math.max(0, Date.now() - timestamp);

  const seconds = Math.floor(difference / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

/* ============================================================
   7. HTML ESCAPE
   ============================================================ */

function escapeMapHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ============================================================
   8. GENERIC ARRAY OPERATIONS
   ============================================================ */

function upsertByID(array, entity) {
  if (!Array.isArray(array) || !entity) {
    return array;
  }

  const incomingID = getEntityID(entity);

  if (!incomingID) {
    array.push(entity);
    return array;
  }

  const index = array.findIndex(
    (item) => String(getEntityID(item)) === String(incomingID),
  );

  if (index === -1) {
    array.push(entity);
  } else {
    array[index] = {
      ...array[index],
      ...entity,
    };
  }

  return array;
}

function removeByID(array, id) {
  if (!Array.isArray(array) || !id) {
    return Array.isArray(array) ? array : [];
  }

  return array.filter((item) => String(getEntityID(item)) !== String(id));
}

/* ============================================================
   9. COUNT HELPERS
   ============================================================ */

function countByStatus(items, status) {
  if (!Array.isArray(items)) {
    return 0;
  }

  const normalizedStatus = normalizeStatus(status);

  return items.filter(
    (item) => normalizeStatus(item?.status) === normalizedStatus,
  ).length;
}

/* ============================================================
   10. ACTIVE STATUS DEFINITIONS
   ============================================================ */

const COMMAND_CENTER_ACTIVE_STATUSES = [
  "active",
  "pending",
  "assigned",
  "in_progress",
  "ongoing",
  "responding",
  "open",
];

/* ============================================================
   11. INCIDENT COUNTS
   ============================================================ */

function getActiveIncidentCount() {
  const dashboard = ensureDashboardState();

  return dashboard.incidents.filter((incident) =>
    COMMAND_CENTER_ACTIVE_STATUSES.includes(normalizeStatus(incident?.status)),
  ).length;
}

/* ============================================================
   12. SOS COUNTS
   ============================================================ */

function getActiveSOSCount() {
  const dashboard = ensureDashboardState();

  return dashboard.sos.filter((sos) =>
    COMMAND_CENTER_ACTIVE_STATUSES.includes(normalizeStatus(sos?.status)),
  ).length;
}

/* ============================================================
   13. MISSION COUNTS
   ============================================================ */

function getActiveMissionCount() {
  const dashboard = ensureDashboardState();

  return dashboard.missions.filter((mission) =>
    COMMAND_CENTER_ACTIVE_STATUSES.includes(normalizeStatus(mission?.status)),
  ).length;
}

/* ============================================================
   14. TEAM COUNTS
   ============================================================ */

function getAvailableTeamCount() {
  const dashboard = ensureDashboardState();

  return dashboard.teams.filter((team) =>
    ["available", "idle", "ready", "active"].includes(
      normalizeStatus(team?.status),
    ),
  ).length;
}

/* ============================================================
   15. RESOURCE COUNTS
   ============================================================ */

function getResourceCount() {
  const dashboard = ensureDashboardState();

  return dashboard.resources.length;
}

/* ============================================================
   16. FIELD DEVICE COUNTS
   ============================================================ */

function getActiveFieldDeviceCount() {
  const dashboard = ensureDashboardState();

  return dashboard.fieldDevices.filter((device) =>
    ["active", "online", "connected", "available"].includes(
      normalizeStatus(device?.status),
    ),
  ).length;
}

function getOnlineFieldDeviceCount() {
  const dashboard = ensureDashboardState();

  return dashboard.fieldDevices.filter((device) =>
    ["online", "connected", "active"].includes(
      normalizeStatus(device?.networkStatus || device?.status),
    ),
  ).length;
}

/* ============================================================
   17. PEOPLE COUNTS
   ============================================================ */

function getTotalPeopleAffected() {
  const dashboard = ensureDashboardState();

  return dashboard.incidents.reduce((total, incident) => {
    return (
      total +
      (Number(
        incident?.peopleAffected ??
          incident?.affectedPeople ??
          incident?.peopleCount,
      ) || 0)
    );
  }, 0);
}

function getTotalSOSPeople() {
  const dashboard = ensureDashboardState();

  return dashboard.sos.reduce((total, request) => {
    return total + (Number(request?.peopleCount) || 0);
  }, 0);
}

/* ============================================================
   18. DOM HELPERS
   ============================================================ */

function updateElementText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = safeValue(value, "0");
}

function updateElementHTML(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.innerHTML = value ?? "";
}

/* ============================================================
   19. DASHBOARD STATISTICS
   ============================================================ */

function updateDashboardStatistics() {
  const dashboard = ensureDashboardState();

  const incidents = dashboard.incidents.length;
  const activeIncidents = getActiveIncidentCount();

  const sos = dashboard.sos.length;
  const activeSOS = getActiveSOSCount();

  const missions = dashboard.missions.length;
  const activeMissions = getActiveMissionCount();

  const teams = dashboard.teams.length;
  const availableTeams = getAvailableTeamCount();

  const resources = getResourceCount();

  const devices = dashboard.fieldDevices.length;
  const activeDevices = getActiveFieldDeviceCount();
  const onlineDevices = getOnlineFieldDeviceCount();

  const affected = getTotalPeopleAffected();
  const sosPeople = getTotalSOSPeople();

  const values = {
    "#incidentCount": incidents,
    "#incidentsCount": incidents,
    "#totalIncidents": incidents,

    "#activeIncidentCount": activeIncidents,
    "#activeIncidents": activeIncidents,

    "#sosCount": sos,
    "#sosRequestCount": sos,
    "#activeSOSCount": activeSOS,

    "#missionCount": missions,
    "#missionsCount": missions,
    "#activeMissionCount": activeMissions,

    "#teamCount": teams,
    "#teamsCount": teams,
    "#availableTeamCount": availableTeams,

    "#resourceCount": resources,
    "#resourcesCount": resources,

    "#fieldDeviceCount": devices,
    "#deviceCount": devices,
    "#activeDeviceCount": activeDevices,
    "#onlineDeviceCount": onlineDevices,

    "#peopleAffected": affected,
    "#affectedCount": affected,

    "#sosPeopleCount": sosPeople,
  };

  Object.entries(values).forEach(([selector, value]) => {
    updateElementText(selector, value);
  });
}

/* ============================================================
   20. STATUS BREAKDOWNS
   ============================================================ */

function buildStatusBreakdown(items) {
  const breakdown = {};

  if (!Array.isArray(items)) {
    return breakdown;
  }

  items.forEach((item) => {
    const status = normalizeStatus(item?.status);

    breakdown[status] = (breakdown[status] || 0) + 1;
  });

  return breakdown;
}

function getIncidentStatusBreakdown() {
  return buildStatusBreakdown(ensureDashboardState().incidents);
}

function getSOSStatusBreakdown() {
  return buildStatusBreakdown(ensureDashboardState().sos);
}

function getMissionStatusBreakdown() {
  return buildStatusBreakdown(ensureDashboardState().missions);
}

function getTeamStatusBreakdown() {
  return buildStatusBreakdown(ensureDashboardState().teams);
}

function getResourceStatusBreakdown() {
  return buildStatusBreakdown(ensureDashboardState().resources);
}

/* ============================================================
   21. ACTIVITY
   ============================================================ */

function createActivityItem(type, entity, title, description, timestamp) {
  const entityId = getEntityID(entity);

  return {
    id: `${type}-${entityId || Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    type,

    entityId,

    title: safeValue(title),

    description: safeValue(description),

    timestamp:
      timestamp ||
      entity?.updatedAt ||
      entity?.createdAt ||
      new Date().toISOString(),

    entity,
  };
}

/* ============================================================
   22. BUILD ACTIVITY
   ============================================================ */

function buildCommandCenterActivity() {
  const dashboard = ensureDashboardState();

  const activity = [];

  /* ---------------- INCIDENTS ---------------- */

  dashboard.incidents.forEach((incident) => {
    activity.push(
      createActivityItem(
        "incident",
        incident,
        `Incident: ${safeValue(incident?.type, "Unknown")}`,
        safeValue(
          incident?.description,
          `Status: ${safeValue(incident?.status, "Unknown")}`,
        ),
        incident?.updatedAt || incident?.createdAt,
      ),
    );
  });

  /* ---------------- SOS ---------------- */

  dashboard.sos.forEach((sos) => {
    activity.push(
      createActivityItem(
        "sos",
        sos,
        `SOS: ${safeValue(sos?.type, "Emergency")}`,
        `Severity: ${safeValue(sos?.severity, "Unknown")} | Status: ${safeValue(
          sos?.status,
          "Unknown",
        )}`,
        sos?.updatedAt || sos?.createdAt,
      ),
    );
  });

  /* ---------------- MISSIONS ---------------- */

  dashboard.missions.forEach((mission) => {
    activity.push(
      createActivityItem(
        "mission",
        mission,
        `Mission: ${safeValue(mission?.title, "Mission")}`,
        `Priority: ${safeValue(
          mission?.priority,
          "Unknown",
        )} | Status: ${safeValue(mission?.status, "Unknown")}`,
        mission?.updatedAt || mission?.createdAt,
      ),
    );
  });

  /* ---------------- TEAMS ---------------- */

  dashboard.teams.forEach((team) => {
    activity.push(
      createActivityItem(
        "team",
        team,
        `Team: ${safeValue(team?.name, "Team")}`,
        `Status: ${safeValue(team?.status, "Unknown")}`,
        team?.updatedAt || team?.createdAt,
      ),
    );
  });

  /* ---------------- RESOURCES ---------------- */

  dashboard.resources.forEach((resource) => {
    activity.push(
      createActivityItem(
        "resource",
        resource,
        `Resource: ${safeValue(resource?.name, resource?.type || "Resource")}`,
        `Status: ${safeValue(resource?.status, "Unknown")}`,
        resource?.updatedAt || resource?.createdAt,
      ),
    );
  });

  /* ---------------- FIELD DEVICES ---------------- */

  dashboard.fieldDevices.forEach((device) => {
    activity.push(
      createActivityItem(
        "field",
        device,
        `Field Device: ${safeValue(device?.deviceId, "Unknown Device")}`,
        `Status: ${safeValue(device?.status, "Unknown")} | Network: ${safeValue(
          device?.networkStatus,
          "Unknown",
        )}`,
        device?.updatedAt || device?.lastSeen || device?.createdAt,
      ),
    );
  });

  /* ---------------- SORT ---------------- */

  activity.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    return (
      (Number.isFinite(timeB) ? timeB : 0) -
      (Number.isFinite(timeA) ? timeA : 0)
    );
  });

  dashboard.activity = activity;

  return activity;
}

/* ============================================================
   24. ACTIVITY HTML
   ============================================================ */

function activityItemHTML(item) {
  const type = safeValue(item?.type, "unknown");

  return `
    <div
      class="cc-activity-item"
      data-type="${escapeMapHTML(type)}"
    >

      <div class="cc-activity-icon">
        ${getActivityIcon(type)}
      </div>

      <div class="cc-activity-content">

        <div class="cc-activity-title">
          ${escapeMapHTML(safeValue(item?.title))}
        </div>

        <div class="cc-activity-description">
          ${escapeMapHTML(safeValue(item?.description))}
        </div>

        <div class="cc-activity-time">
          ${escapeMapHTML(relativeTime(item?.timestamp))}
        </div>

      </div>

    </div>
  `;
}

/* ============================================================
   25. RENDER ACTIVITY
   ============================================================ */

function renderCommandCenterActivity() {
  const dashboard = ensureDashboardState();

  const activity = Array.isArray(dashboard.activity) ? dashboard.activity : [];

  const selectors = [
    "#activityFeed",
    "#commandActivity",
    "#activityList",
    ".activity-list",
    ".activity-feed",
  ];

  let container = null;

  for (const selector of selectors) {
    container = document.querySelector(selector);

    if (container) {
      break;
    }
  }

  if (!container) {
    return;
  }

  if (activity.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No operational activity.
      </div>
    `;

    return;
  }

  container.innerHTML = activity.slice(0, 20).map(activityItemHTML).join("");
}

/* ============================================================
   26. INCIDENT LIST
   ============================================================ */

function renderIncidentList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#incidentList") ||
    document.querySelector("#incidentsList") ||
    document.querySelector(".incident-list") ||
    document.querySelector(".incidents-list");

  if (!container) {
    return;
  }

  const incidents = dashboard.incidents;

  if (incidents.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No incidents found.
      </div>
    `;

    return;
  }

  container.innerHTML = incidents
    .slice(0, 20)
    .map((incident) => {
      const id = getEntityID(incident);

      return `
        <div
          class="cc-incident-row"
          data-id="${escapeMapHTML(safeValue(id, ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(incident?.type, "Incident"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(incident?.incidentId, id))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(incident?.severity))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(incident?.status))}
            </span>

            <span>
              ${escapeMapHTML(
                relativeTime(incident?.updatedAt || incident?.createdAt),
              )}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   27. SOS LIST
   ============================================================ */

function renderSOSList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#sosList") || document.querySelector(".sos-list");

  if (!container) {
    return;
  }

  const requests = dashboard.sos;

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No SOS requests.
      </div>
    `;

    return;
  }

  container.innerHTML = requests
    .slice(0, 20)
    .map((sos) => {
      const peopleCount = Number(sos?.peopleCount) || 1;

      return `
        <div
          class="cc-sos-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(sos), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              🆘
              ${escapeMapHTML(safeValue(sos?.type, "Emergency"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(sos?.description, "No description"))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(sos?.severity))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(sos?.status))}
            </span>

            <span>
              ${peopleCount} people
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   28. MISSION LIST
   ============================================================ */

function renderMissionList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#missionList") ||
    document.querySelector(".mission-list");

  if (!container) {
    return;
  }

  const missions = dashboard.missions;

  if (missions.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No missions found.
      </div>
    `;

    return;
  }

  container.innerHTML = missions
    .slice(0, 20)
    .map((mission) => {
      let assignedTeam = mission?.assignedTeam;

      if (assignedTeam && typeof assignedTeam === "object") {
        assignedTeam =
          assignedTeam?.name || assignedTeam?.teamId || "Unassigned";
      }

      assignedTeam = assignedTeam || "Unassigned";

      return `
        <div
          class="cc-mission-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(mission), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(mission?.title, "Mission"))}
            </strong>

            <span>
              ${escapeMapHTML(
                safeValue(mission?.description, "No description"),
              )}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              Priority:
              ${escapeMapHTML(safeValue(mission?.priority))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(mission?.status))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(assignedTeam))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   29. TEAM LIST
   ============================================================ */

function renderTeamList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#teamList") || document.querySelector(".team-list");

  if (!container) {
    return;
  }

  const teams = dashboard.teams;

  if (teams.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No teams found.
      </div>
    `;

    return;
  }

  container.innerHTML = teams
    .slice(0, 20)
    .map((team) => {
      const members = Array.isArray(team?.members) ? team.members.length : 0;

      return `
        <div
          class="cc-team-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(team), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(team?.name, "Team"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(team?.teamId, getEntityID(team)))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(team?.type))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(team?.status))}
            </span>

            <span>
              ${members} members
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   30. RESOURCE LIST
   ============================================================ */

function renderResourceList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#resourceList") ||
    document.querySelector("#resourcesList") ||
    document.querySelector(".resource-list") ||
    document.querySelector(".resources-list");

  if (!container) {
    return;
  }

  const resources = dashboard.resources;

  if (resources.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No resources found.
      </div>
    `;

    return;
  }

  container.innerHTML = resources
    .slice(0, 20)
    .map((resource) => {
      let assignedTeam = resource?.assignedTeam;

      if (assignedTeam && typeof assignedTeam === "object") {
        assignedTeam =
          assignedTeam?.name || assignedTeam?.teamId || "Unassigned";
      }

      assignedTeam = assignedTeam || "Unassigned";

      return `
        <div
          class="cc-resource-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(resource), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(
                safeValue(resource?.name, resource?.type || "Resource"),
              )}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(resource?.type, "Resource"))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(resource?.status))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(assignedTeam))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   31. FIELD DEVICE LIST
   ============================================================ */

function renderFieldDeviceList() {
  const dashboard = ensureDashboardState();

  const container =
    document.querySelector("#fieldDeviceList") ||
    document.querySelector(".field-device-list");

  if (!container) {
    return;
  }

  const devices = dashboard.fieldDevices;

  if (devices.length === 0) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No field devices found.
      </div>
    `;

    return;
  }

  container.innerHTML = devices
    .slice(0, 20)
    .map((device) => {
      const battery =
        device?.battery !== null && device?.battery !== undefined
          ? `${device.battery}%`
          : "N/A";

      return `
        <div
          class="cc-field-device-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(device), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              📡
              ${escapeMapHTML(safeValue(device?.deviceId, getEntityID(device)))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(device?.status))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              Network:
              ${escapeMapHTML(safeValue(device?.networkStatus))}
            </span>

            <span>
              Battery:
              ${escapeMapHTML(battery)}
            </span>

            <span>
              ${escapeMapHTML(relativeTime(device?.lastSeen))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   32. RENDER ALL LISTS
   ============================================================ */

function renderOperationalLists() {
  renderIncidentList();
  renderSOSList();
  renderMissionList();
  renderTeamList();
  renderResourceList();
  renderFieldDeviceList();
}

/* ============================================================
   33. STATUS WIDGETS
   ============================================================ */

function updateStatusWidgetGroup(group, breakdown) {
  if (!breakdown) {
    return;
  }

  Object.entries(breakdown).forEach(([status, count]) => {
    const normalized = normalizeStatus(status);

    const selectors = [
      `#${group}-${normalized}`,
      `#${group}${normalized}`,
      `[data-status="${normalized}"][data-group="${group}"]`,
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);

        if (element) {
          element.textContent = count;
          break;
        }
      } catch (error) {
        console.warn("[COMMAND CENTER] Invalid status selector:", selector);
      }
    }
  });
}

function updateStatusWidgets() {
  updateStatusWidgetGroup("incident", getIncidentStatusBreakdown());

  updateStatusWidgetGroup("sos", getSOSStatusBreakdown());

  updateStatusWidgetGroup("mission", getMissionStatusBreakdown());

  updateStatusWidgetGroup("team", getTeamStatusBreakdown());

  updateStatusWidgetGroup("resource", getResourceStatusBreakdown());
}

/* ============================================================
   34. COMPLETE DASHBOARD UPDATE
   ============================================================ */

function updateCommandCenterDashboard() {
  ensureDashboardState();

  buildCommandCenterActivity();

  updateDashboardStatistics();

  renderOperationalLists();

  renderCommandCenterActivity();

  updateStatusWidgets();
}

/* ============================================================
   35. LOAD INCIDENTS
   ============================================================ */

async function loadDashboardIncidents() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.incidents);

    const incidents = extractArray(response);

    state.dashboard.incidents = incidents;

    state.incidents = incidents;

    return incidents;
  } catch (error) {
    console.error("[DASHBOARD] Incidents load failed:", error);

    return [];
  }
}

/* ============================================================
   36. LOAD SOS
   ============================================================ */

async function loadDashboardSOS() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.sos);

    const sos = extractArray(response);

    state.dashboard.sos = sos;

    state.sos = sos;

    return sos;
  } catch (error) {
    console.error("[DASHBOARD] SOS load failed:", error);

    return [];
  }
}

/* ============================================================
   37. LOAD MISSIONS
   ============================================================ */

async function loadDashboardMissions() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.missions);

    const missions = extractArray(response);

    state.dashboard.missions = missions;

    state.missions = missions;

    return missions;
  } catch (error) {
    console.error("[DASHBOARD] Missions load failed:", error);

    return [];
  }
}

/* ============================================================
   38. LOAD TEAMS
   ============================================================ */

async function loadDashboardTeams() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.teams);

    const teams = extractArray(response);

    state.dashboard.teams = teams;

    state.teams = teams;

    return teams;
  } catch (error) {
    console.error("[DASHBOARD] Teams load failed:", error);

    return [];
  }
}

/* ============================================================
   39. LOAD RESOURCES
   ============================================================ */

async function loadDashboardResources() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.resources);

    const resources = extractArray(response);

    state.dashboard.resources = resources;

    state.resources = resources;

    return resources;
  } catch (error) {
    console.error("[DASHBOARD] Resources load failed:", error);

    return [];
  }
}

/* ============================================================
   40. LOAD FIELD DEVICES
   ============================================================ */

async function loadDashboardFieldDevices() {
  const state = ensureCommandCenterRoot();

  try {
    const response = await apiGet(COMMAND_CENTER_ENDPOINTS.field);

    const devices = extractArray(response);

    state.dashboard.fieldDevices = devices;

    state.fieldData = devices;

    return devices;
  } catch (error) {
    console.error("[DASHBOARD] Field devices load failed:", error);

    return [];
  }
}

/* ============================================================
   41. LOAD EVERYTHING
   ============================================================ */

async function loadCompleteCommandCenterData() {
  console.log("[DASHBOARD] Loading operational data...");

  const state = ensureCommandCenterRoot();

  const results = await Promise.allSettled([
    loadDashboardIncidents(),
    loadDashboardSOS(),
    loadDashboardMissions(),
    loadDashboardTeams(),
    loadDashboardResources(),
    loadDashboardFieldDevices(),
  ]);

  state.dashboard.lastRefresh = new Date();

  buildCommandCenterActivity();

  updateCommandCenterDashboard();

  /*
   * Map integration.
   *
   * We do NOT create a Leaflet map here.
   * Your map system remains responsible
   * for the actual map instance.
   */

  if (typeof renderCommandCenterMapData === "function") {
    try {
      renderCommandCenterMapData();
    } catch (error) {
      console.error("[COMMAND CENTER] Map data render failed:", error);
    }
  }

  console.log("[DASHBOARD] Operational data loaded.");

  return results;
}

/* ============================================================
   42. REFRESH SYSTEM
   ============================================================ */

function startCommandCenterRefresh(interval = 30000) {
  stopCommandCenterRefresh();

  window.commandCenterRefreshTimer = setInterval(async () => {
    try {
      await loadCompleteCommandCenterData();
    } catch (error) {
      console.error("[DASHBOARD] Automatic refresh failed:", error);
    }
  }, interval);

  console.log(`[COMMAND CENTER] Auto refresh started: ${interval}ms`);
}

function stopCommandCenterRefresh() {
  if (window.commandCenterRefreshTimer) {
    clearInterval(window.commandCenterRefreshTimer);

    window.commandCenterRefreshTimer = null;

    console.log("[COMMAND CENTER] Auto refresh stopped.");
  }
}

/* ============================================================
   43. MANUAL REFRESH
   ============================================================ */

async function refreshCommandCenter() {
  const selectors = ["#refreshBtn", "#refreshDashboard", ".refresh-dashboard"];

  const buttons = [];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (!buttons.includes(button)) {
        buttons.push(button);
      }
    });
  });

  buttons.forEach((button) => {
    button.classList.add("loading");
    button.disabled = true;
  });

  try {
    await loadCompleteCommandCenterData();
  } catch (error) {
    console.error("[DASHBOARD] Manual refresh failed:", error);

    if (typeof showNotification === "function") {
      showNotification("Dashboard refresh failed.", "error");
    }
  } finally {
    buttons.forEach((button) => {
      button.classList.remove("loading");
      button.disabled = false;
    });
  }
}

/* ============================================================
   44. REFRESH BUTTON BINDING
   ============================================================ */

function bindDashboardRefreshButtons() {
  const selectors = ["#refreshBtn", "#refreshDashboard", ".refresh-dashboard"];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (button.dataset.ccRefreshBound === "true") {
        return;
      }

      button.dataset.ccRefreshBound = "true";

      button.addEventListener("click", refreshCommandCenter);
    });
  });
}

/* ============================================================
   45. OPERATIONAL EVENT SYSTEM
   ============================================================ */

function triggerCommandCenterUpdate(type, data) {
  document.dispatchEvent(
    new CustomEvent("commandcenter:update", {
      detail: {
        type,
        data,
      },
    }),
  );
}

/* ============================================================
   46. EVENT → STATE SYNCHRONIZATION
   ============================================================ */

function synchronizeOperationalUpdate(type, data) {
  const dashboard = ensureDashboardState();

  if (!type) {
    return;
  }

  const parts = String(type).split("_");

  const entityType = parts[0];

  const action = parts.slice(1).join("_");

  const collectionMap = {
    incident: "incidents",

    sos: "sos",

    mission: "missions",

    team: "teams",

    resource: "resources",
  };

  const collectionName = collectionMap[entityType];

  /*
   * FIELD DEVICES
   */

  if (type === "field_devices_refreshed") {
    if (Array.isArray(data)) {
      dashboard.fieldDevices = data;
    } else if (Array.isArray(data?.devices)) {
      dashboard.fieldDevices = data.devices;
    }

    return;
  }

  if (!collectionName) {
    return;
  }

  const collection = dashboard[collectionName];

  if (!Array.isArray(collection)) {
    return;
  }

  /*
   * CREATE / UPDATE
   */

  if (action === "created" || action === "updated") {
    if (data) {
      upsertByID(collection, data);
    }

    return;
  }

  /*
   * DELETE
   */

  if (action === "deleted") {
    const id = getEntityID(data) || data?.id || data?._id;

    dashboard[collectionName] = removeByID(collection, id);
  }
}

/* ============================================================
   47. OPERATIONAL UPDATE LISTENER
   ============================================================ */

document.addEventListener("commandcenter:update", (event) => {
  const detail = event?.detail;

  if (!detail?.type) {
    return;
  }

  const supportedTypes = [
    "incident_created",
    "incident_updated",
    "incident_deleted",

    "sos_created",
    "sos_updated",
    "sos_deleted",

    "mission_created",
    "mission_updated",
    "mission_deleted",

    "team_created",
    "team_updated",
    "team_deleted",

    "resource_created",
    "resource_updated",
    "resource_deleted",

    "field_devices_refreshed",
  ];

  if (!supportedTypes.includes(detail.type)) {
    return;
  }

  console.log("[COMMAND CENTER] Operational update:", detail.type, detail.data);

  synchronizeOperationalUpdate(detail.type, detail.data);

  updateCommandCenterDashboard();
});

/* ============================================================
   48. INITIALIZATION
   ============================================================ */

let commandCenterDashboardInitialized = false;

async function initializeCommandCenterDashboard() {
  if (commandCenterDashboardInitialized) {
    console.warn("[COMMAND CENTER] Dashboard already initialized.");

    return;
  }

  commandCenterDashboardInitialized = true;

  console.log("[COMMAND CENTER] Initializing operational dashboard...");

  ensureCommandCenterRoot();

  bindDashboardRefreshButtons();

  /*
   * Initial data load.
   */

  try {
    await loadCompleteCommandCenterData();
  } catch (error) {
    console.error("[COMMAND CENTER] Initial dashboard load failed:", error);

    /*
     * Still render whatever data
     * already exists in memory.
     */

    updateCommandCenterDashboard();
  }

  /*
   * Automatic refresh.
   */

  startCommandCenterRefresh(30000);

  console.log("[COMMAND CENTER] Operational dashboard ready.");
}

/* ============================================================
   49. PUBLIC API
   ============================================================ */

window.CommandCenter = ensureCommandCenterRoot();

window.CommandCenterDashboard = {
  initialize: initializeCommandCenterDashboard,

  refresh: refreshCommandCenter,

  startRefresh: startCommandCenterRefresh,

  stopRefresh: stopCommandCenterRefresh,

  update: updateCommandCenterDashboard,

  load: loadCompleteCommandCenterData,

  activity: buildCommandCenterActivity,

  getState: ensureDashboardState,
};

/*
 * Keep the old global function names
 * available because other parts of
 * command-center.js may already call them.
 */

window.refreshCommandCenter = refreshCommandCenter;

window.startCommandCenterRefresh = startCommandCenterRefresh;

window.stopCommandCenterRefresh = stopCommandCenterRefresh;

window.updateCommandCenterDashboard = updateCommandCenterDashboard;

window.buildCommandCenterActivity = buildCommandCenterActivity;

window.loadCompleteCommandCenterData = loadCompleteCommandCenterData;

window.getActiveIncidentCount = getActiveIncidentCount;

window.getActiveSOSCount = getActiveSOSCount;

window.getActiveMissionCount = getActiveMissionCount;

window.getAvailableTeamCount = getAvailableTeamCount;

window.getResourceCount = getResourceCount;

window.getActiveFieldDeviceCount = getActiveFieldDeviceCount;

window.getOnlineFieldDeviceCount = getOnlineFieldDeviceCount;

window.getTotalPeopleAffected = getTotalPeopleAffected;

window.getTotalSOSPeople = getTotalSOSPeople;

/* ============================================================
   50. DOM START
   ============================================================ */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      initializeCommandCenterDashboard();
    },
    {
      once: true,
    },
  );
} else {
  initializeCommandCenterDashboard();
}

/* ============================================================
   COMMAND CENTER DASHBOARD
   PART 6 — COUNTERS, ACTIVITY, LISTS, SOCKET UPDATES
   ============================================================ */

/* ============================================================
   156. ACTIVE INCIDENT COUNT
   ============================================================ */

function getActiveIncidentCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.incidents.filter((incident) => {
    const status = normalizeStatus(incident?.status);

    return !["RESOLVED", "CLOSED", "COMPLETED", "CANCELLED"].includes(status);
  }).length;
}

/* ============================================================
   157. ACTIVE SOS COUNT
   ============================================================ */

function getActiveSOSCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.sos.filter((request) => {
    const status = normalizeStatus(request?.status);

    return !["RESOLVED", "CLOSED", "COMPLETED", "CANCELLED"].includes(status);
  }).length;
}

/* ============================================================
   158. ACTIVE MISSION COUNT
   ============================================================ */

function getActiveMissionCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.missions.filter((mission) => {
    const status = normalizeStatus(mission?.status);

    return !["COMPLETED", "CLOSED", "CANCELLED"].includes(status);
  }).length;
}

/* ============================================================
   159. AVAILABLE TEAM COUNT
   ============================================================ */

function getAvailableTeamCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.teams.filter((team) => {
    return ["AVAILABLE", "READY", "IDLE"].includes(
      normalizeStatus(team?.status),
    );
  }).length;
}

/* ============================================================
   160. ACTIVE FIELD DEVICE COUNT
   ============================================================ */

function getActiveFieldDeviceCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.fieldDevices.filter((device) => {
    return ["ACTIVE", "ONLINE", "CONNECTED"].includes(
      normalizeStatus(device?.status),
    );
  }).length;
}

/* ============================================================
   161. ONLINE FIELD DEVICE COUNT
   ============================================================ */

function getOnlineFieldDeviceCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.fieldDevices.filter((device) => {
    const networkStatus = normalizeStatus(device?.networkStatus);
    const deviceStatus = normalizeStatus(device?.status);

    return (
      networkStatus === "ONLINE" ||
      networkStatus === "CONNECTED" ||
      deviceStatus === "ONLINE" ||
      deviceStatus === "CONNECTED"
    );
  }).length;
}

/* ============================================================
   162. RESOURCE COUNT
   ============================================================ */

function getResourceCount() {
  ensureDashboardState();

  return CommandCenter.dashboard.resources.length;
}

/* ============================================================
   163. TOTAL PEOPLE AFFECTED
   ============================================================ */

function getTotalPeopleAffected() {
  ensureDashboardState();

  return CommandCenter.dashboard.incidents.reduce((total, incident) => {
    const count =
      incident?.peopleAffected ??
      incident?.affectedPeople ??
      incident?.peopleCount ??
      0;

    return total + (Number(count) || 0);
  }, 0);
}

/* ============================================================
   164. TOTAL PEOPLE IN SOS
   ============================================================ */

function getTotalSOSPeople() {
  ensureDashboardState();

  return CommandCenter.dashboard.sos.reduce((total, request) => {
    return total + (Number(request?.peopleCount) || 0);
  }, 0);
}

/* ============================================================
   165. UPDATE ELEMENT TEXT
   ============================================================ */

function updateElementText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = safeValue(value, "0");
}

/* ============================================================
   166. UPDATE ELEMENT HTML
   ============================================================ */

function updateElementHTML(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.innerHTML = value ?? "";
}

/* ============================================================
   167. UPDATE DASHBOARD STATISTICS
   ============================================================ */

function updateDashboardStatistics() {
  ensureDashboardState();

  const dashboard = CommandCenter.dashboard;

  const incidents = dashboard.incidents.length;
  const activeIncidents = getActiveIncidentCount();

  const sos = dashboard.sos.length;
  const activeSOS = getActiveSOSCount();

  const missions = dashboard.missions.length;
  const activeMissions = getActiveMissionCount();

  const teams = dashboard.teams.length;
  const availableTeams = getAvailableTeamCount();

  const resources = dashboard.resources.length;

  const devices = dashboard.fieldDevices.length;
  const activeDevices = getActiveFieldDeviceCount();
  const onlineDevices = getOnlineFieldDeviceCount();

  const affected = getTotalPeopleAffected();
  const sosPeople = getTotalSOSPeople();

  const values = {
    "#incidentCount": incidents,
    "#incidentsCount": incidents,
    "#totalIncidents": incidents,

    "#activeIncidentCount": activeIncidents,
    "#activeIncidents": activeIncidents,

    "#sosCount": sos,
    "#sosRequestCount": sos,

    "#activeSOSCount": activeSOS,

    "#missionCount": missions,
    "#missionsCount": missions,

    "#activeMissionCount": activeMissions,

    "#teamCount": teams,
    "#teamsCount": teams,

    "#availableTeamCount": availableTeams,

    "#resourceCount": resources,
    "#resourcesCount": resources,

    "#fieldDeviceCount": devices,
    "#deviceCount": devices,

    "#activeDeviceCount": activeDevices,

    "#onlineDeviceCount": onlineDevices,

    "#peopleAffected": affected,
    "#affectedCount": affected,

    "#sosPeopleCount": sosPeople,
  };

  Object.entries(values).forEach(([selector, value]) => {
    updateElementText(selector, value);
  });
}

/* ============================================================
   168. GENERIC STATUS BREAKDOWN
   ============================================================ */

function buildStatusBreakdown(items) {
  if (!Array.isArray(items)) {
    return {};
  }

  const breakdown = {};

  items.forEach((item) => {
    const status = normalizeStatus(item?.status);

    breakdown[status] = (breakdown[status] || 0) + 1;
  });

  return breakdown;
}

/* ============================================================
   169. INCIDENT STATUS BREAKDOWN
   ============================================================ */

function getIncidentStatusBreakdown() {
  ensureDashboardState();

  return buildStatusBreakdown(CommandCenter.dashboard.incidents);
}

/* ============================================================
   170. SOS STATUS BREAKDOWN
   ============================================================ */

function getSOSStatusBreakdown() {
  ensureDashboardState();

  return buildStatusBreakdown(CommandCenter.dashboard.sos);
}

/* ============================================================
   171. MISSION STATUS BREAKDOWN
   ============================================================ */

function getMissionStatusBreakdown() {
  ensureDashboardState();

  return buildStatusBreakdown(CommandCenter.dashboard.missions);
}

/* ============================================================
   172. TEAM STATUS BREAKDOWN
   ============================================================ */

function getTeamStatusBreakdown() {
  ensureDashboardState();

  return buildStatusBreakdown(CommandCenter.dashboard.teams);
}

/* ============================================================
   173. RESOURCE STATUS BREAKDOWN
   ============================================================ */

function getResourceStatusBreakdown() {
  ensureDashboardState();

  return buildStatusBreakdown(CommandCenter.dashboard.resources);
}

/* ============================================================
   174. CREATE ACTIVITY ITEM
   ============================================================ */

function createActivityItem(type, entity, title, description, timestamp) {
  const entityId = getEntityID(entity);

  return {
    id:
      `${type}-` +
      `${entityId || "unknown"}-` +
      `${Date.now()}-` +
      `${Math.random().toString(36).slice(2, 7)}`,

    type,

    entityId,

    title: safeValue(title, "Activity"),

    description: safeValue(description, "No details available."),

    timestamp:
      timestamp ||
      entity?.updatedAt ||
      entity?.createdAt ||
      new Date().toISOString(),

    entity,
  };
}

/* ============================================================
   175. BUILD ACTIVITY FEED
   ============================================================ */

function buildCommandCenterActivity() {
  ensureDashboardState();

  const dashboard = CommandCenter.dashboard;

  const activity = [];

  /* ---------------- INCIDENTS ---------------- */

  dashboard.incidents.forEach((incident) => {
    activity.push(
      createActivityItem(
        "incident",
        incident,
        `Incident: ${safeValue(incident?.type, "Unknown")}`,
        safeValue(
          incident?.description,
          `Status: ${safeValue(incident?.status, "Unknown")}`,
        ),
        incident?.updatedAt || incident?.createdAt,
      ),
    );
  });

  /* ---------------- SOS ---------------- */

  dashboard.sos.forEach((sos) => {
    activity.push(
      createActivityItem(
        "sos",
        sos,
        `SOS: ${safeValue(sos?.type, "Emergency")}`,
        `Severity: ${safeValue(
          sos?.severity,
          "Unknown",
        )} | Status: ${safeValue(sos?.status, "Unknown")}`,
        sos?.updatedAt || sos?.createdAt,
      ),
    );
  });

  /* ---------------- MISSIONS ---------------- */

  dashboard.missions.forEach((mission) => {
    activity.push(
      createActivityItem(
        "mission",
        mission,
        `Mission: ${safeValue(mission?.title, "Mission")}`,
        `Priority: ${safeValue(
          mission?.priority,
          "Unknown",
        )} | Status: ${safeValue(mission?.status, "Unknown")}`,
        mission?.updatedAt || mission?.createdAt,
      ),
    );
  });

  /* ---------------- TEAMS ---------------- */

  dashboard.teams.forEach((team) => {
    activity.push(
      createActivityItem(
        "team",
        team,
        `Team: ${safeValue(team?.name, "Team")}`,
        `Status: ${safeValue(team?.status, "Unknown")}`,
        team?.updatedAt || team?.createdAt,
      ),
    );
  });

  /* ---------------- RESOURCES ---------------- */

  dashboard.resources.forEach((resource) => {
    activity.push(
      createActivityItem(
        "resource",
        resource,
        `Resource: ${safeValue(resource?.name, resource?.type || "Resource")}`,
        `Status: ${safeValue(resource?.status, "Unknown")}`,
        resource?.updatedAt || resource?.createdAt,
      ),
    );
  });

  /* ---------------- FIELD DEVICES ---------------- */

  dashboard.fieldDevices.forEach((device) => {
    activity.push(
      createActivityItem(
        "field",
        device,
        `Field Device: ${safeValue(device?.deviceId, "Unknown Device")}`,
        `Status: ${safeValue(device?.status, "Unknown")} | Network: ${safeValue(
          device?.networkStatus,
          "Unknown",
        )}`,
        device?.updatedAt || device?.lastSeen || device?.createdAt,
      ),
    );
  });

  /* ---------------- SORT ---------------- */

  activity.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();

    const safeA = Number.isFinite(timeA) ? timeA : 0;
    const safeB = Number.isFinite(timeB) ? timeB : 0;

    return safeB - safeA;
  });

  dashboard.activity = activity;

  return activity;
}



/* ============================================================
   176. ACTIVITY ICON
   ============================================================ */

// function getActivityIcon(type) {
//   const icons = {
//     incident: "⚠️",
//     sos: "🆘",
//     mission: "🎯",
//     team: "👥",
//     resource: "📦",
//     field: "📡",
//   };

//   return icons[type] || "•";
// }

/* ============================================================
   177. ACTIVITY ITEM HTML
   ============================================================ */

function activityItemHTML(item) {
  const type = safeValue(item?.type, "unknown");

  return `
    <div
      class="cc-activity-item"
      data-type="${escapeMapHTML(type)}"
    >

      <div class="cc-activity-icon">
        ${getActivityIcon(type)}
      </div>

      <div class="cc-activity-content">

        <div class="cc-activity-title">
          ${escapeMapHTML(safeValue(item?.title, "Activity"))}
        </div>

        <div class="cc-activity-description">
          ${escapeMapHTML(safeValue(item?.description, ""))}
        </div>

        <div class="cc-activity-time">
          ${escapeMapHTML(relativeTime(item?.timestamp))}
        </div>

      </div>

    </div>
  `;
}

/* ============================================================
   178. RENDER ACTIVITY
   ============================================================ */

function renderCommandCenterActivity() {
  ensureDashboardState();

  const activity = CommandCenter.dashboard.activity || [];

  const selectors = [
    "#activityFeed",
    "#commandActivity",
    "#activityList",
    ".activity-list",
    ".activity-feed",
  ];

  let container = null;

  for (const selector of selectors) {
    container = document.querySelector(selector);

    if (container) {
      break;
    }
  }

  if (!container) {
    return;
  }

  if (!activity.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No operational activity.
      </div>
    `;

    return;
  }

  container.innerHTML = activity.slice(0, 20).map(activityItemHTML).join("");
}

/* ============================================================
   179. INCIDENT LIST
   ============================================================ */

function renderIncidentList() {
  ensureDashboardState();

  const container =
    document.querySelector("#incidentList") ||
    document.querySelector("#incidentsList") ||
    document.querySelector(".incident-list") ||
    document.querySelector(".incidents-list");

  if (!container) {
    return;
  }

  const incidents = CommandCenter.dashboard.incidents;

  if (!incidents.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No incidents found.
      </div>
    `;

    return;
  }

  container.innerHTML = incidents
    .slice(0, 20)
    .map((incident) => {
      const id = getEntityID(incident);

      return `
        <div
          class="cc-incident-row"
          data-id="${escapeMapHTML(safeValue(id, ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(incident?.type, "Incident"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(incident?.incidentId, id))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(incident?.severity))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(incident?.status))}
            </span>

            <span>
              ${escapeMapHTML(
                relativeTime(incident?.updatedAt || incident?.createdAt),
              )}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   180. SOS LIST
   ============================================================ */

function renderSOSList() {
  ensureDashboardState();

  const container =
    document.querySelector("#sosList") || document.querySelector(".sos-list");

  if (!container) {
    return;
  }

  const requests = CommandCenter.dashboard.sos;

  if (!requests.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No SOS requests.
      </div>
    `;

    return;
  }

  container.innerHTML = requests
    .slice(0, 20)
    .map((sos) => {
      const peopleCount = Number(sos?.peopleCount) || 1;

      return `
        <div
          class="cc-sos-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(sos), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              🆘
              ${escapeMapHTML(safeValue(sos?.type, "Emergency"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(sos?.description, "No description"))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(sos?.severity))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(sos?.status))}
            </span>

            <span>
              ${peopleCount} people
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   181. MISSION LIST
   ============================================================ */

function renderMissionList() {
  ensureDashboardState();

  const container =
    document.querySelector("#missionList") ||
    document.querySelector(".mission-list");

  if (!container) {
    return;
  }

  const missions = CommandCenter.dashboard.missions;

  if (!missions.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No missions found.
      </div>
    `;

    return;
  }

  container.innerHTML = missions
    .slice(0, 20)
    .map((mission) => {
      let assignedTeam = "Unassigned";

      if (mission?.assignedTeam && typeof mission.assignedTeam === "object") {
        assignedTeam =
          mission.assignedTeam?.name ||
          mission.assignedTeam?.teamId ||
          "Unassigned";
      } else if (mission?.assignedTeam) {
        assignedTeam = mission.assignedTeam;
      }

      return `
        <div
          class="cc-mission-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(mission), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(mission?.title, "Mission"))}
            </strong>

            <span>
              ${escapeMapHTML(
                safeValue(mission?.description, "No description"),
              )}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              Priority:
              ${escapeMapHTML(safeValue(mission?.priority))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(mission?.status))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(assignedTeam))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   182. TEAM LIST
   ============================================================ */

function renderTeamList() {
  ensureDashboardState();

  const container =
    document.querySelector("#teamList") || document.querySelector(".team-list");

  if (!container) {
    return;
  }

  const teams = CommandCenter.dashboard.teams;

  if (!teams.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No teams found.
      </div>
    `;

    return;
  }

  container.innerHTML = teams
    .slice(0, 20)
    .map((team) => {
      const members = Array.isArray(team?.members) ? team.members.length : 0;

      return `
        <div
          class="cc-team-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(team), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(safeValue(team?.name, "Team"))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(team?.teamId, getEntityID(team)))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(team?.type))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(team?.status))}
            </span>

            <span>
              ${members} members
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   183. RESOURCE LIST
   ============================================================ */

function renderResourceList() {
  ensureDashboardState();

  const container =
    document.querySelector("#resourceList") ||
    document.querySelector("#resourcesList") ||
    document.querySelector(".resource-list") ||
    document.querySelector(".resources-list");

  if (!container) {
    return;
  }

  const resources = CommandCenter.dashboard.resources;

  if (!resources.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No resources found.
      </div>
    `;

    return;
  }

  container.innerHTML = resources
    .slice(0, 20)
    .map((resource) => {
      let assignedTeam = resource?.assignedTeam;

      if (assignedTeam && typeof assignedTeam === "object") {
        assignedTeam =
          assignedTeam?.name || assignedTeam?.teamId || "Unassigned";
      }

      assignedTeam = assignedTeam || "Unassigned";

      return `
        <div
          class="cc-resource-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(resource), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              ${escapeMapHTML(
                safeValue(resource?.name, resource?.type || "Resource"),
              )}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(resource?.type, "Resource"))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              ${escapeMapHTML(safeValue(resource?.status))}
            </span>

            <span>
              ${escapeMapHTML(safeValue(assignedTeam))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   184. FIELD DEVICE LIST
   ============================================================ */

function renderFieldDeviceList() {
  ensureDashboardState();

  const container =
    document.querySelector("#fieldDeviceList") ||
    document.querySelector(".field-device-list");

  if (!container) {
    return;
  }

  const devices = CommandCenter.dashboard.fieldDevices;

  if (!devices.length) {
    container.innerHTML = `
      <div class="cc-empty-state">
        No field devices found.
      </div>
    `;

    return;
  }

  container.innerHTML = devices
    .slice(0, 20)
    .map((device) => {
      const battery =
        device?.battery !== null && device?.battery !== undefined
          ? `${device.battery}%`
          : "N/A";

      return `
        <div
          class="cc-field-device-row"
          data-id="${escapeMapHTML(safeValue(getEntityID(device), ""))}"
        >

          <div class="cc-row-main">

            <strong>
              📡
              ${escapeMapHTML(safeValue(device?.deviceId, getEntityID(device)))}
            </strong>

            <span>
              ${escapeMapHTML(safeValue(device?.status))}
            </span>

          </div>

          <div class="cc-row-meta">

            <span>
              Network:
              ${escapeMapHTML(safeValue(device?.networkStatus))}
            </span>

            <span>
              Battery:
              ${escapeMapHTML(battery)}
            </span>

            <span>
              ${escapeMapHTML(relativeTime(device?.lastSeen))}
            </span>

          </div>

        </div>
      `;
    })
    .join("");
}

/* ============================================================
   185. RENDER ALL OPERATIONAL LISTS
   ============================================================ */

function renderOperationalLists() {
  renderIncidentList();
  renderSOSList();
  renderMissionList();
  renderTeamList();
  renderResourceList();
  renderFieldDeviceList();
}

/* ============================================================
   186. UPDATE DASHBOARD
   ============================================================ */

function updateCommandCenterDashboard() {
  ensureDashboardState();

  /*
   * Always rebuild activity before rendering.
   */

  buildCommandCenterActivity();

  updateDashboardStatistics();

  renderOperationalLists();

  renderCommandCenterActivity();

  updateStatusWidgets();
}

/* ============================================================
   187. UPDATE STATUS WIDGETS
   ============================================================ */

function updateStatusWidgets() {
  updateStatusWidgetGroup("incident", getIncidentStatusBreakdown());

  updateStatusWidgetGroup("sos", getSOSStatusBreakdown());

  updateStatusWidgetGroup("mission", getMissionStatusBreakdown());

  updateStatusWidgetGroup("team", getTeamStatusBreakdown());

  updateStatusWidgetGroup("resource", getResourceStatusBreakdown());
}

/* ============================================================
   188. STATUS WIDGET GROUP
   ============================================================ */

function updateStatusWidgetGroup(group, breakdown) {
  if (!breakdown) {
    return;
  }

  Object.entries(breakdown).forEach(([status, count]) => {
    const normalized = normalizeStatus(status).toLowerCase();

    const selectors = [
      `#${group}-${normalized}`,
      `#${group}${normalized}`,
      `#${group}${status}`,
      `[data-status="${normalized}"][data-group="${group}"]`,
      `[data-status="${status}"][data-group="${group}"]`,
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);

        if (element) {
          element.textContent = count;
        }
      } catch (error) {
        console.warn("[COMMAND CENTER] Invalid status selector:", selector);
      }
    }
  });
}

/* ============================================================
   189. START AUTO REFRESH
   ============================================================ */

function startCommandCenterRefresh(interval = 30000) {
  /*
   * Store timer on window so there is never
   * a ReferenceError if the variable was not
   * declared somewhere else.
   */

  if (window.commandCenterRefreshTimer) {
    clearInterval(window.commandCenterRefreshTimer);
  }

  window.commandCenterRefreshTimer = setInterval(async () => {
    try {
      await loadCompleteCommandCenterData();
    } catch (error) {
      console.error("[COMMAND CENTER] Automatic refresh failed:", error);
    }
  }, interval);

  console.log(`[COMMAND CENTER] Auto refresh started: ${interval}ms`);

  return window.commandCenterRefreshTimer;
}

/* ============================================================
   190. STOP AUTO REFRESH
   ============================================================ */

function stopCommandCenterRefresh() {
  if (window.commandCenterRefreshTimer) {
    clearInterval(window.commandCenterRefreshTimer);

    window.commandCenterRefreshTimer = null;

    console.log("[COMMAND CENTER] Auto refresh stopped.");
  }
}

/* ============================================================
   191. MANUAL REFRESH
   ============================================================ */

async function refreshCommandCenter() {
  const selectors = ["#refreshBtn", "#refreshDashboard", ".refresh-dashboard"];

  const buttons = [];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (!buttons.includes(button)) {
        buttons.push(button);
      }
    });
  });

  buttons.forEach((button) => {
    button.classList.add("loading");
    button.disabled = true;
  });

  try {
    await loadCompleteCommandCenterData();

    console.log("[COMMAND CENTER] Manual refresh completed.");
  } catch (error) {
    console.error("[COMMAND CENTER] Manual refresh failed:", error);

    if (typeof showNotification === "function") {
      showNotification("Dashboard refresh failed.", "error");
    }
  } finally {
    buttons.forEach((button) => {
      button.classList.remove("loading");
      button.disabled = false;
    });
  }
}

/* ============================================================
   192. REFRESH BUTTONS
   ============================================================ */

function bindDashboardRefreshButtons() {
  const selectors = ["#refreshBtn", "#refreshDashboard", ".refresh-dashboard"];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (button.dataset.ccRefreshBound === "true") {
        return;
      }

      button.dataset.ccRefreshBound = "true";

      button.addEventListener("click", refreshCommandCenter);
    });
  });
}

/* ============================================================
   193. COMMAND CENTER UPDATE EVENT
   ============================================================ */

function triggerCommandCenterUpdate(type, data) {
  document.dispatchEvent(
    new CustomEvent("commandcenter:update", {
      detail: {
        type,
        data,
      },
    }),
  );
}

/* ============================================================
   194. SYNCHRONIZE SOCKET DATA
   ============================================================ */

function synchronizeCommandCenterEntity(type, data) {
  ensureDashboardState();

  const dashboard = CommandCenter.dashboard;

  /*
   * INCIDENT
   */

  if (type.startsWith("incident_")) {
    if (type === "incident_created" || type === "incident_updated") {
      if (data) {
        upsertByID(dashboard.incidents, data);
      }
    }

    if (type === "incident_deleted") {
      const id = getEntityID(data) || data?.id || data?._id || data?.incidentId;

      dashboard.incidents = removeByID(dashboard.incidents, id);
    }

    CommandCenter.incidents = dashboard.incidents;

    return;
  }

  /*
   * SOS
   */

  if (type.startsWith("sos_")) {
    if (type === "sos_created" || type === "sos_updated") {
      if (data) {
        upsertByID(dashboard.sos, data);
      }
    }

    if (type === "sos_deleted") {
      const id = getEntityID(data) || data?.id || data?._id;

      dashboard.sos = removeByID(dashboard.sos, id);
    }

    CommandCenter.sos = dashboard.sos;

    return;
  }

  /*
   * MISSION
   */

  if (type.startsWith("mission_")) {
    if (type === "mission_created" || type === "mission_updated") {
      if (data) {
        upsertByID(dashboard.missions, data);
      }
    }

    if (type === "mission_deleted") {
      const id = getEntityID(data) || data?.id || data?._id;

      dashboard.missions = removeByID(dashboard.missions, id);
    }

    CommandCenter.missions = dashboard.missions;

    return;
  }

  /*
   * TEAM
   */

  if (type.startsWith("team_")) {
    if (type === "team_created" || type === "team_updated") {
      if (data) {
        upsertByID(dashboard.teams, data);
      }
    }

    if (type === "team_deleted") {
      const id = getEntityID(data) || data?.id || data?._id || data?.teamId;

      dashboard.teams = removeByID(dashboard.teams, id);
    }

    CommandCenter.teams = dashboard.teams;

    return;
  }

  /*
   * RESOURCE
   */

  if (type.startsWith("resource_")) {
    if (type === "resource_created" || type === "resource_updated") {
      if (data) {
        upsertByID(dashboard.resources, data);
      }
    }

    if (type === "resource_deleted") {
      const id = getEntityID(data) || data?.id || data?._id;

      dashboard.resources = removeByID(dashboard.resources, id);
    }

    CommandCenter.resources = dashboard.resources;

    return;
  }

  /*
   * FIELD DEVICES
   */

  if (type === "field_devices_refreshed") {
    if (Array.isArray(data)) {
      dashboard.fieldDevices = data;
    } else if (Array.isArray(data?.devices)) {
      dashboard.fieldDevices = data.devices;
    } else if (data && typeof data === "object") {
      /*
       * Single device update.
       */

      upsertByID(dashboard.fieldDevices, data);
    }

    CommandCenter.fieldData = dashboard.fieldDevices;
  }
}

/* ============================================================
   195. OPERATIONAL SOCKET EVENT
   ============================================================ */

if (!window.__commandCenterOperationalListener) {
  window.__commandCenterOperationalListener = true;

  document.addEventListener("commandcenter:update", (event) => {
    const detail = event?.detail;

    if (!detail?.type) {
      return;
    }

    const supportedTypes = [
      "incident_created",
      "incident_updated",
      "incident_deleted",

      "sos_created",
      "sos_updated",
      "sos_deleted",

      "mission_created",
      "mission_updated",
      "mission_deleted",

      "team_created",
      "team_updated",
      "team_deleted",

      "resource_created",
      "resource_updated",
      "resource_deleted",

      "field_devices_refreshed",
    ];

    if (!supportedTypes.includes(detail.type)) {
      return;
    }

    console.log(
      "[COMMAND CENTER] Live operational update:",
      detail.type,
      detail.data,
    );

    /*
     * Synchronize incoming socket data.
     */

    synchronizeCommandCenterEntity(detail.type, detail.data);

    /*
     * Rebuild UI immediately.
     */

    updateCommandCenterDashboard();

    /*
     * Update map if the map module
     * exposes the renderer.
     */

    if (typeof renderCommandCenterMapData === "function") {
      try {
        renderCommandCenterMapData();
      } catch (error) {
        console.warn("[COMMAND CENTER] Map update failed:", error);
      }
    }
  });
}

/* ============================================================
   196. DASHBOARD INITIALIZATION
   ============================================================ */

let commandCenterDashboardInitialized = false;

async function initializeCommandCenterDashboard() {
  /*
   * Prevent duplicate initialization.
   */

  if (commandCenterDashboardInitialized) {
    console.log("[COMMAND CENTER] Dashboard already initialized.");

    return;
  }

  commandCenterDashboardInitialized = true;

  console.log("[COMMAND CENTER] Initializing operational dashboard...");

  ensureDashboardState();

  bindDashboardRefreshButtons();

  /*
   * Render existing state first.
   * This makes the dashboard appear even
   * before the API request finishes.
   */

  updateCommandCenterDashboard();

  /*
   * Load complete backend data.
   */

  try {
    await loadCompleteCommandCenterData();
  } catch (error) {
    console.error("[COMMAND CENTER] Initial data load failed:", error);

    /*
     * Keep whatever data is already available.
     */

    updateCommandCenterDashboard();
  }

  /*
   * Start polling.
   */

  startCommandCenterRefresh(30000);

  console.log("[COMMAND CENTER] Operational dashboard ready.");
}

/* ============================================================
   197. PUBLIC DASHBOARD API
   ============================================================ */

window.loadCompleteCommandCenterData = loadCompleteCommandCenterData;

window.refreshCommandCenter = refreshCommandCenter;

window.startCommandCenterRefresh = startCommandCenterRefresh;

window.stopCommandCenterRefresh = stopCommandCenterRefresh;

window.updateCommandCenterDashboard = updateCommandCenterDashboard;

window.buildCommandCenterActivity = buildCommandCenterActivity;

window.triggerCommandCenterUpdate = triggerCommandCenterUpdate;

window.getActiveIncidentCount = getActiveIncidentCount;

window.getActiveSOSCount = getActiveSOSCount;

window.getActiveMissionCount = getActiveMissionCount;

window.getAvailableTeamCount = getAvailableTeamCount;

window.getActiveFieldDeviceCount = getActiveFieldDeviceCount;

window.getOnlineFieldDeviceCount = getOnlineFieldDeviceCount;

window.getResourceCount = getResourceCount;

window.getTotalPeopleAffected = getTotalPeopleAffected;

window.getTotalSOSPeople = getTotalSOSPeople;

/* ============================================================
   198. INITIALIZATION
   ============================================================ */

function bootCommandCenterDashboard() {
  if (typeof initializeCommandCenterDashboard !== "function") {
    console.error("[COMMAND CENTER] Initialization function unavailable.");

    return;
  }

  initializeCommandCenterDashboard();
}

/* ============================================================
   199. DOM READY
   ============================================================ */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootCommandCenterDashboard, {
    once: true,
  });
} else {
  bootCommandCenterDashboard();
}

/* ============================================================
   200. DEBUG ACCESS
   ============================================================ */

window.CommandCenterDashboard = {
  getState: () => {
    ensureDashboardState();

    return CommandCenter.dashboard;
  },

  refresh: refreshCommandCenter,

  update: updateCommandCenterDashboard,

  startRefresh: startCommandCenterRefresh,

  stopRefresh: stopCommandCenterRefresh,

  activity: buildCommandCenterActivity,

  getStats: () => {
    ensureDashboardState();

    return {
      incidents: CommandCenter.dashboard.incidents.length,

      activeIncidents: getActiveIncidentCount(),

      sos: CommandCenter.dashboard.sos.length,

      activeSOS: getActiveSOSCount(),

      missions: CommandCenter.dashboard.missions.length,

      activeMissions: getActiveMissionCount(),

      teams: CommandCenter.dashboard.teams.length,

      availableTeams: getAvailableTeamCount(),

      resources: CommandCenter.dashboard.resources.length,

      fieldDevices: CommandCenter.dashboard.fieldDevices.length,

      onlineDevices: getOnlineFieldDeviceCount(),

      peopleAffected: getTotalPeopleAffected(),

      sosPeople: getTotalSOSPeople(),
    };
  },
};

/* ============================================================
   201. END COMMAND CENTER DASHBOARD
   ============================================================ */

console.log("[COMMAND CENTER] Dashboard module loaded.");
