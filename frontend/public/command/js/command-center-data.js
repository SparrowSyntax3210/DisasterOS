"use strict";

console.log("📦 Command Center Data Store Loaded");

/* ==========================================================
   COMMAND CENTER CENTRAL DATA STORE

   This file is the SINGLE source of truth for the
   Command Center.

   Flow:

   API
     ↓
   CommandCenterData
     ↓
   Map / Layers / UI / Dashboard / Realtime
========================================================== */

const CommandCenterData = (() => {
  /* ========================================================
     DEFAULT MAP RESOURCES
  ======================================================== */

  const emptyMapResources = () => ({
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    schools: [],
    shelters: [],
  });

  /* ========================================================
     CENTRAL STATE
  ======================================================== */

  const state = {
    loading: false,

    /* ------------------------------------------------------
       OPERATIONAL LOCATION
    ------------------------------------------------------ */

    location: {
      lat: null,
      lng: null,
      name: null,
      source: null,
    },

    /* ------------------------------------------------------
       OPERATIONAL DATA
    ------------------------------------------------------ */

    incidents: [],

    missions: [],

    resources: [],

    sos: [],

    /* ------------------------------------------------------
       GIS RESOURCES
    ------------------------------------------------------ */

    mapResources: emptyMapResources(),

    /* ------------------------------------------------------
       CALCULATED STATISTICS
    ------------------------------------------------------ */

    stats: {
      incidents: 0,
      activeIncidents: 0,
      criticalIncidents: 0,

      missions: 0,
      activeMissions: 0,

      resources: 0,

      sos: 0,
      pendingSOS: 0,
      criticalSOS: 0,

      responders: 0,

      alerts: 0,
    },

    /* ------------------------------------------------------
       LAST UPDATE
    ------------------------------------------------------ */

    lastUpdated: null,
  };

  /* ========================================================
     SUBSCRIBERS
  ======================================================== */

  const listeners = new Set();

  function subscribe(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /* ========================================================
     NOTIFY
  ======================================================== */

  function notify(type = "state") {
    state.lastUpdated = new Date();

    listeners.forEach((callback) => {
      try {
        callback(state, type);
      } catch (error) {
        console.error("❌ Command Data Listener Error:", error);
      }
    });
  }

  /* ========================================================
     GET STATE
  ======================================================== */

  function getState() {
    return state;
  }

  /* ========================================================
     ARRAY NORMALIZER
  ======================================================== */

  function normalizeArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    return [];
  }

  /* ========================================================
     RESPONSE ARRAY EXTRACTOR

     Useful when APIs return:

     []
     { data: [] }
     { results: [] }
     { items: [] }
     { incidents: [] }
  ======================================================== */

  function extractArray(response, keys = []) {
    if (Array.isArray(response)) {
      return response;
    }

    if (!response) {
      return [];
    }

    for (const key of keys) {
      if (Array.isArray(response[key])) {
        return response[key];
      }
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }

    if (Array.isArray(response.results)) {
      return response.results;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    return [];
  }

  /* ========================================================
     ID NORMALIZER
  ======================================================== */

  function getItemId(item) {
    if (!item) {
      return null;
    }

    const id =
      item._id ??
      item.id ??
      item.incidentId ??
      item.sosId ??
      item.missionId ??
      item.resourceId ??
      item.teamId ??
      item.userId;

    return id != null ? String(id) : null;
  }

  /* ========================================================
     ACTIVE STATUS
  ======================================================== */

  function isActive(item) {
    const status = String(item?.status || "")
      .trim()
      .toUpperCase();

    return ![
      "RESOLVED",
      "CLOSED",
      "COMPLETED",
      "CANCELLED",
      "CANCELED",
      "REJECTED",
    ].includes(status);
  }

  /* ========================================================
     CRITICAL SEVERITY
  ======================================================== */

  function isCritical(item) {
    const severity = String(
      item?.severity ?? item?.priority ?? item?.riskLevel ?? "",
    )
      .trim()
      .toUpperCase();

    return ["CRITICAL", "EXTREME"].includes(severity);
  }

  /* ========================================================
     CALCULATE STATISTICS
  ======================================================== */

  function calculateStats() {
    /* ------------------------------------------------------
       INCIDENTS
    ------------------------------------------------------ */

    state.stats.incidents = state.incidents.length;

    state.stats.activeIncidents = state.incidents.filter((incident) =>
      isActive(incident),
    ).length;

    state.stats.criticalIncidents = state.incidents.filter((incident) =>
      isCritical(incident),
    ).length;

    /* ------------------------------------------------------
       MISSIONS
    ------------------------------------------------------ */

    state.stats.missions = state.missions.length;

    state.stats.activeMissions = state.missions.filter((mission) =>
      isActive(mission),
    ).length;

    /* ------------------------------------------------------
       RESOURCES
    ------------------------------------------------------ */

    state.stats.resources = state.resources.length;

    /* ------------------------------------------------------
       SOS
    ------------------------------------------------------ */

    state.stats.sos = state.sos.length;

    state.stats.pendingSOS = state.sos.filter((sos) => {
      const status = String(sos?.status || "")
        .trim()
        .toUpperCase();

      return ["PENDING", "NEW", "ACTIVE", "OPEN"].includes(status);
    }).length;

    state.stats.criticalSOS = state.sos.filter((sos) => isCritical(sos)).length;

    /* ------------------------------------------------------
       RESPONDERS

       Some deployments may later provide teams through
       resources or another store. We keep this ready.
    ------------------------------------------------------ */

    if (Array.isArray(state.teams)) {
      state.stats.responders = state.teams.filter((team) =>
        isActive(team),
      ).length;
    }

    /* ------------------------------------------------------
       ALERTS

       Can be populated later by alert module.
    ------------------------------------------------------ */

    if (Array.isArray(state.alerts)) {
      state.stats.alerts = state.alerts.length;
    }
  }

  /* ========================================================
     LOCATION
  ======================================================== */

  function setLocation(location) {
    if (!location) {
      return;
    }

    const lat = Number(location.lat ?? location.latitude);

    const lng = Number(location.lng ?? location.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error("❌ Invalid command location:", location);

      return;
    }

    state.location = {
      lat,

      lng,

      name: location.name || null,

      source: location.source || null,
    };

    console.log("📍 Command Center location updated:", state.location);

    notify("location");
  }

  /* ========================================================
     GET LOCATION
  ======================================================== */

  function getLocation() {
    return {
      ...state.location,
    };
  }

  /* ========================================================
     LOCATION VALIDATION
  ======================================================== */

  function hasLocation() {
    return Boolean(
      Number.isFinite(state.location.lat) &&
      Number.isFinite(state.location.lng),
    );
  }

  /* ========================================================
     INCIDENTS
  ======================================================== */

  function setIncidents(items) {
    state.incidents = normalizeArray(items);

    calculateStats();

    notify("incidents");
  }

  /* ========================================================
     MISSIONS
  ======================================================== */

  function setMissions(items) {
    state.missions = normalizeArray(items);

    calculateStats();

    notify("missions");
  }

  /* ========================================================
     RESOURCES
  ======================================================== */

  function setResources(items) {
    state.resources = normalizeArray(items);

    calculateStats();

    notify("resources");
  }

  /* ========================================================
     SOS
  ======================================================== */

  function setSOS(items) {
    state.sos = normalizeArray(items);

    calculateStats();

    notify("sos");
  }

  /* ========================================================
     TEAMS / RESPONDERS
  ======================================================== */

  function setTeams(items) {
    state.teams = normalizeArray(items);

    state.stats.responders = state.teams.filter((team) =>
      isActive(team),
    ).length;

    notify("teams");
  }

  /* ========================================================
     ALERTS
  ======================================================== */

  function setAlerts(items) {
    state.alerts = normalizeArray(items);

    state.stats.alerts = state.alerts.length;

    notify("alerts");
  }

  /* ========================================================
     MAP RESOURCES
  ======================================================== */

  function setMapResources(data) {
    data = data || {};

    state.mapResources = {
      hospitals: normalizeArray(data.hospitals),

      policeStations: normalizeArray(data.policeStations),

      fireStations: normalizeArray(data.fireStations),

      pharmacies: normalizeArray(data.pharmacies),

      schools: normalizeArray(data.schools),

      shelters: normalizeArray(data.shelters),
    };

    notify("map-resources");
  }

  /* ========================================================
     GENERIC SETTER
  ======================================================== */

  function set(key, value) {
    if (!key) {
      return;
    }

    state[key] = value;

    calculateStats();

    notify(`${key}:updated`);
  }

  /* ========================================================
     REALTIME UPSERT
  ======================================================== */

  function upsert(listName, item) {
    if (!item) {
      return;
    }

    const list = state[listName];

    if (!Array.isArray(list)) {
      console.warn(
        `⚠️ Cannot upsert into "${listName}" because it is not an array.`,
      );

      return;
    }

    const id = getItemId(item);

    /* ------------------------------------------------------
       If there is no ID, add as a new item.
    ------------------------------------------------------ */

    if (!id) {
      list.unshift(item);

      calculateStats();

      notify(`${listName}:created`);

      return;
    }

    /* ------------------------------------------------------
       Find existing item
    ------------------------------------------------------ */

    const index = list.findIndex((existing) => {
      const existingId = getItemId(existing);

      return existingId && String(existingId) === String(id);
    });

    /* ------------------------------------------------------
       CREATE
    ------------------------------------------------------ */

    if (index === -1) {
      list.unshift(item);

      notify(`${listName}:created`);
    } else {
      /* ------------------------------------------------------
       UPDATE
    ------------------------------------------------------ */
      list[index] = {
        ...list[index],
        ...item,
      };

      notify(`${listName}:updated`);
    }

    calculateStats();
  }

  /* ========================================================
     REMOVE
  ======================================================== */

  function remove(listName, id) {
    const list = state[listName];

    if (!Array.isArray(list)) {
      return;
    }

    const originalLength = list.length;

    state[listName] = list.filter(
      (item) => String(getItemId(item)) !== String(id),
    );

    if (state[listName].length !== originalLength) {
      calculateStats();

      notify(`${listName}:deleted`);
    }
  }

  /* ========================================================
     CLEAR COLLECTION
  ======================================================== */

  function clear(listName) {
    if (!Array.isArray(state[listName])) {
      return;
    }

    state[listName] = [];

    calculateStats();

    notify(`${listName}:cleared`);
  }

  /* ========================================================
     LOADING STATE
  ======================================================== */

  function setLoading(value) {
    state.loading = Boolean(value);

    notify("loading");
  }

  /* ========================================================
     RESET OPERATIONAL DATA
     
     Used when the user changes location.
  ======================================================== */

  function resetOperationalData() {
    state.incidents = [];

    state.missions = [];

    state.resources = [];

    state.sos = [];

    state.mapResources = emptyMapResources();

    state.stats = {
      incidents: 0,
      activeIncidents: 0,
      criticalIncidents: 0,

      missions: 0,
      activeMissions: 0,

      resources: 0,

      sos: 0,
      pendingSOS: 0,
      criticalSOS: 0,

      responders: 0,

      alerts: 0,
    };

    calculateStats();

    notify("operational-reset");
  }

  /* ========================================================
     FULL RESET
  ======================================================== */

  function reset() {
    resetOperationalData();

    state.location = {
      lat: null,
      lng: null,
      name: null,
      source: null,
    };

    state.loading = false;

    state.lastUpdated = null;

    notify("reset");
  }

  /* ========================================================
     PUBLIC API
  ======================================================== */

  return {
    /* State */

    state,

    getState,

    /* Subscription */

    subscribe,

    /* Location */

    setLocation,
    getLocation,
    hasLocation,

    /* Operational data */

    setIncidents,
    setMissions,
    setResources,
    setSOS,
    setTeams,
    setAlerts,
    setMapResources,

    /* Generic */

    set,

    /* Realtime */

    upsert,
    remove,

    /* Utilities */

    extractArray,
    calculateStats,

    /* Loading */

    setLoading,

    /* Reset */

    clear,
    resetOperationalData,
    reset,
  };
})();

/* ==========================================================
   GLOBAL EXPORT
========================================================== */

window.CommandCenterData = CommandCenterData;

console.log("✅ Single Command Data Store Ready");
