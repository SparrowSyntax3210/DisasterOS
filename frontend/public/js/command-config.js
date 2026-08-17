"use strict";

/* ==========================================================
   DISASTEROS COMMAND CENTER
   CONFIGURATION + GLOBAL STATE
   ========================================================== */

console.log("Command Config Loaded");

/* ==========================================================
   API CONFIG
   ========================================================== */

const COMMAND_API_BASE = window.COMMAND_API_BASE || "http://localhost:4000/api";

/* ==========================================================
   SOCKET CONFIG
   ========================================================== */

const COMMAND_SOCKET_URL = window.COMMAND_SOCKET_URL || "http://localhost:4000";

/* ==========================================================
   MAP CONFIG
   ========================================================== */

const COMMAND_MAP_CONFIG = {
  defaultZoom: 12,
  minZoom: 5,
  maxZoom: 19,

  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

  tileOptions: {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  },
};

/* ==========================================================
   OPERATIONAL LOCATION
   ========================================================== */

const CommandCenterLocation = {
  latitude: null,
  longitude: null,
  name: "",
  address: "",
  selected: false,
};

/* ==========================================================
   GLOBAL COMMAND CENTER STATE
   ========================================================== */

const CommandCenter = {
  /* ------------------------------------------------------
       Authentication
       ------------------------------------------------------ */

  user: null,
  authenticated: false,

  /* ------------------------------------------------------
       Location
       ------------------------------------------------------ */

  location: CommandCenterLocation,

  /* ------------------------------------------------------
       Map
       ------------------------------------------------------ */

  map: null,

  mapInitialized: false,

  mapLayers: {
    incidents: null,
    sos: null,
    missions: null,
    teams: null,
    resources: null,
    zones: null,
  },

  markerLayers: {
    incidents: [],
    sos: [],
    missions: [],
    teams: [],
    resources: [],
    zones: [],
  },

  /* ------------------------------------------------------
       Operational Data
       ------------------------------------------------------ */

  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  fieldDevices: [],
  predictions: [],

  /* ------------------------------------------------------
       Statistics
       ------------------------------------------------------ */

  statistics: {
    incidents: 0,
    sos: 0,
    missions: 0,
    teams: 0,

    ambulance: 0,
    boats: 0,
    supplies: 0,
  },

  /* ------------------------------------------------------
       Selected Operation
       ------------------------------------------------------ */

  selectedOperation: null,

  /* ------------------------------------------------------
       Loading
       ------------------------------------------------------ */

  loading: false,

  initialized: false,

  /* ------------------------------------------------------
       Realtime
       ------------------------------------------------------ */

  socket: null,
  socketConnected: false,

  /* ------------------------------------------------------
       Refresh
       ------------------------------------------------------ */

  refreshTimer: null,

  refreshInterval: 30000,

  /* ------------------------------------------------------
       UI
       ------------------------------------------------------ */

  layerVisibility: {
    incidents: true,
    sos: true,
    missions: true,
    teams: true,
    resources: true,
    zones: true,
  },
};

/* ==========================================================
   DOM REFERENCES
   ========================================================== */

const commandLocationGate = document.getElementById("commandLocationGate");

const commandCenterElement = document.getElementById("commandCenter");

const commandMapElement = document.getElementById("commandMap");

/* ==========================================================
   LOCATION DOM
   ========================================================== */

const commandLocationInput = document.getElementById("commandLocationInput");

const commandLocationSearchBtn = document.getElementById(
  "commandLocationSearchBtn",
);

const commandLiveLocationBtn = document.getElementById(
  "commandLiveLocationBtn",
);

const commandLocationStatus = document.getElementById("commandLocationStatus");

/* ==========================================================
   TOP BAR
   ========================================================== */

const currentTime = document.getElementById("currentTime");

const refreshBtn = document.getElementById("refreshBtn");

const authUser = document.getElementById("authUser");

/* ==========================================================
   SITUATION OVERVIEW
   ========================================================== */

const incidentCount = document.getElementById("incidentCount");

const sosCount = document.getElementById("sosCount");

const missionCount = document.getElementById("missionCount");

const teamCount = document.getElementById("teamCount");

/* ==========================================================
   AI / INTELLIGENCE
   ========================================================== */

const riskLevel = document.getElementById("riskLevel");

const riskScore = document.getElementById("riskScore");

const situationSummary = document.getElementById("situationSummary");

/* ==========================================================
   ALERTS
   ========================================================== */

const alertCount = document.getElementById("alertCount");

const alertsList = document.getElementById("alertsList");

/* ==========================================================
   RESOURCE STATISTICS
   ========================================================== */

const resourceTeams = document.getElementById("resourceTeams");

const resourceAmbulance = document.getElementById("resourceAmbulance");

const resourceBoats = document.getElementById("resourceBoats");

const resourceSupplies = document.getElementById("resourceSupplies");

/* ==========================================================
   SELECTED OPERATION PANEL
   ========================================================== */

const selectedPanel = document.getElementById("selectedPanel");

const closeSelected = document.getElementById("closeSelected");

const selectedTitle = document.getElementById("selectedTitle");

const selectedStatus = document.getElementById("selectedStatus");

const selectedSeverity = document.getElementById("selectedSeverity");

const selectedDescription = document.getElementById("selectedDescription");

const selectedLocation = document.getElementById("selectedLocation");

const createMissionBtn = document.getElementById("createMissionBtn");

/* ==========================================================
   MAP COORDINATES
   ========================================================== */

const mapLat = document.getElementById("mapLat");

const mapLng = document.getElementById("mapLng");

/* ==========================================================
   INITIALIZATION FLAGS
   ========================================================== */

window.CommandCenter = CommandCenter;

window.CommandCenterLocation = CommandCenterLocation;

window.COMMAND_API_BASE = COMMAND_API_BASE;

window.COMMAND_SOCKET_URL = COMMAND_SOCKET_URL;

window.COMMAND_MAP_CONFIG = COMMAND_MAP_CONFIG;

console.log("✅ Command Center configuration initialized");
