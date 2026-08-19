console.log("📦 Command Center Data Store Loaded");

const CommandCenterData = (() => {

  const state = {
    loading: false,

    location: {
      lat: null,
      lng: null,
      name: null,
    },

    incidents: [],
    missions: [],
    resources: [],
    sos: [],

    mapResources: {
      hospitals: [],
      policeStations: [],
      fireStations: [],
      pharmacies: [],
      schools: [],
      shelters: [],
    },

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
    },

    lastUpdated: null,
  };

  const listeners = new Set();

  function subscribe(callback) {
    if (typeof callback !== "function") return;

    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  function notify(type = "state") {
    state.lastUpdated = new Date();

    listeners.forEach((callback) => {
      try {
        callback(state, type);
      } catch (error) {
        console.error(
          "Command Data Listener Error:",
          error
        );
      }
    });
  }

  function getState() {
    return state;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function calculateStats() {

    state.stats.incidents =
      state.incidents.length;

    state.stats.activeIncidents =
      state.incidents.filter((incident) => {
        const status =
          String(incident.status || "")
            .toUpperCase();

        return ![
          "RESOLVED",
          "CLOSED",
          "COMPLETED",
        ].includes(status);
      }).length;

    state.stats.criticalIncidents =
      state.incidents.filter((incident) => {

        const severity =
          String(
            incident.severity ||
            incident.priority ||
            ""
          ).toUpperCase();

        return [
          "CRITICAL",
          "EXTREME",
        ].includes(severity);

      }).length;

    state.stats.missions =
      state.missions.length;

    state.stats.activeMissions =
      state.missions.filter((mission) => {

        const status =
          String(mission.status || "")
            .toUpperCase();

        return ![
          "COMPLETED",
          "CANCELLED",
          "CLOSED",
        ].includes(status);

      }).length;

    state.stats.resources =
      state.resources.length;

    state.stats.sos =
      state.sos.length;

    state.stats.pendingSOS =
      state.sos.filter((item) => {

        return String(
          item.status || ""
        ).toUpperCase() === "PENDING";

      }).length;

    state.stats.criticalSOS =
      state.sos.filter((item) => {

        return String(
          item.priority || ""
        ).toUpperCase() === "CRITICAL";

      }).length;
  }

  function setLocation(location) {
  if (!location) return;

  const lat = Number(
    location.lat ??
    location.latitude
  );

  const lng = Number(
    location.lng ??
    location.longitude
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    console.error(
      "❌ Invalid command location:",
      location
    );

    return;
  }

  const changed =
    state.location.lat !== lat ||
    state.location.lng !== lng;

  state.location = {
    lat,
    lng,
    name:
      location.name || null,
  };

  if (changed) {
    // Clear location-dependent map resources.
    state.mapResources = {
      hospitals: [],
      policeStations: [],
      fireStations: [],
      pharmacies: [],
      schools: [],
      shelters: [],
    };

    // Clear previous location data.
    state.incidents = [];
    state.missions = [];
    state.resources = [];
    state.sos = [];

    calculateStats();
  }

  notify("location");
}

  function setIncidents(items) {

    state.incidents =
      normalizeArray(items);

    calculateStats();

    notify("incidents");
  }

  function setMissions(items) {

    state.missions =
      normalizeArray(items);

    calculateStats();

    notify("missions");
  }

  function setResources(items) {

    state.resources =
      normalizeArray(items);

    calculateStats();

    notify("resources");
  }

  function setSOS(items) {

    state.sos =
      normalizeArray(items);

    calculateStats();

    notify("sos");
  }

  function setMapResources(data) {

    const resources = data || {};

    state.mapResources = {
      hospitals:
        normalizeArray(resources.hospitals),

      policeStations:
        normalizeArray(
          resources.policeStations
        ),

      fireStations:
        normalizeArray(
          resources.fireStations
        ),

      pharmacies:
        normalizeArray(resources.pharmacies),

      schools:
        normalizeArray(resources.schools),

      shelters:
        normalizeArray(resources.shelters),
    };

    notify("map-resources");
  }

  function upsert(listName, item) {

    if (!item) return;

    const list =
      state[listName];

    if (!Array.isArray(list)) return;

    const id =
      item._id ||
      item.id ||
      item.incidentId ||
      item.sosId ||
      item.missionId;

    const index =
      list.findIndex((existing) => {

        const existingId =
          existing._id ||
          existing.id ||
          existing.incidentId ||
          existing.sosId ||
          existing.missionId;

        return String(existingId) ===
          String(id);
      });

    if (index === -1) {
      list.unshift(item);
    } else {
      list[index] = item;
    }

    calculateStats();

    notify(`${listName}:updated`);
  }

  function remove(listName, id) {

    const list =
      state[listName];

    if (!Array.isArray(list)) return;

    state[listName] =
      list.filter((item) => {

        const itemId =
          item._id ||
          item.id ||
          item.incidentId ||
          item.sosId ||
          item.missionId;

        return String(itemId) !==
          String(id);
      });

    calculateStats();

    notify(`${listName}:deleted`);
  }

  function setLoading(value) {

    state.loading = Boolean(value);

    notify("loading");
  }

  return {
    state,
    subscribe,
    getState,

    setLocation,
    setIncidents,
    setMissions,
    setResources,
    setSOS,
    setMapResources,

    upsert,
    remove,

    calculateStats,
    setLoading,
  };

})();

window.CommandCenterData =
  CommandCenterData;

console.log(
  "✅ Single Command Data Store Ready"
);