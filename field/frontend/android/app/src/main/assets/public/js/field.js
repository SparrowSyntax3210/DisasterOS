// ==========================================================
// DISASTEROS FIELD APP
// STANDALONE VERSION
// ==========================================================

const API_BASE = "http://localhost:4000";

// ==========================================================
// GLOBAL STATE
// ==========================================================

let fieldMap = null;

let currentLocation = {
  latitude: 28.6139,
  longitude: 77.209,
};

let currentLocationMarker = null;
let currentAccuracyCircle = null;

// ==========================================================
// OPERATIONAL DATA
// ==========================================================

const operationalData = {
  incidents: [],
  missions: [],
  teams: [],
  sos: [],
  resources: [],
  fieldDevices: [],
};

// ==========================================================
// FIELD MAP LAYERS
// ==========================================================

const fieldMapLayers = {
  incidents: L.layerGroup(),
  missions: L.layerGroup(),
  teams: L.layerGroup(),
  sos: L.layerGroup(),

  hospitals: L.layerGroup(),
  shelters: L.layerGroup(),
  policeStations: L.layerGroup(),
  fireStations: L.layerGroup(),
  pharmacies: L.layerGroup(),
  schools: L.layerGroup(),

  fieldResources: L.layerGroup(),

  riskZones: L.layerGroup(),
};

// ==========================================================
// INIT
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DisasterOS Field App starting...");

  try {
    // -------------------------------
    // INITIALIZE MAP
    // -------------------------------

    initializeMap();

    // -------------------------------
    // INITIALIZE UI
    // -------------------------------

    initializeUI();

    initializeLayerControls();

    // -------------------------------
    // LOCATION
    // -------------------------------

    await getCurrentLocation();

    // -------------------------------
    // OPERATIONAL DATA
    // -------------------------------

    await loadOperationalData();

    // -------------------------------
    // NEARBY RESOURCES
    // -------------------------------

    await loadMapResources();

    // -------------------------------
    // AI PREDICTION
    // -------------------------------

    await loadPrediction();

    // -------------------------------
    // DASHBOARD
    // -------------------------------

    updateDashboard();

    console.log("✅ All Field App systems initialized");
  } catch (error) {
    console.error("❌ Field App initialization error:", error);
  } finally {
    // =================================================
    // ALWAYS REMOVE LOADING SCREEN
    // =================================================

    const loader = document.getElementById("fieldLoader");

    if (loader) {
      loader.classList.add("loaded");

      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
      loader.style.pointerEvents = "none";
      loader.style.display = "none";
    }

    // =================================================
    // FORCE LEAFLET RESIZE
    // =================================================

    if (fieldMap) {
      setTimeout(() => {
        fieldMap.invalidateSize(true);
      }, 100);

      setTimeout(() => {
        fieldMap.invalidateSize(true);
      }, 500);

      setTimeout(() => {
        fieldMap.invalidateSize(true);
      }, 1000);
    }

    console.log("✅ Field loader removed");
  }
});

// ==========================================================
// MAP
// ==========================================================

function initializeMap() {
  const mapElement = document.getElementById("fieldMap");

  if (!mapElement) {
    console.error("❌ #fieldMap not found");
    return false;
  }

  console.log("🗺 Initializing Field Map...");

  fieldMap = L.map("fieldMap", {
    center: [currentLocation.latitude, currentLocation.longitude],

    zoom: 13,

    zoomControl: false,

    attributionControl: true,
  });

  // ======================================================
  // DARK CARTO MAP
  // ======================================================

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    minZoom: 2,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(fieldMap);

  // ======================================================
  // ADD ALL FIELD LAYERS
  // ======================================================

  Object.values(fieldMapLayers).forEach((layer) => {
    layer.addTo(fieldMap);
  });

  // ======================================================
  // ZOOM CONTROL
  // ======================================================

  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(fieldMap);

  // ======================================================
  // RESIZE
  // ======================================================

  setTimeout(() => {
    fieldMap?.invalidateSize(true);
  }, 300);

  setTimeout(() => {
    fieldMap?.invalidateSize(true);
  }, 1000);

  console.log("✅ Field Map initialized");

  return true;
}

// ==========================================================
// CURRENT LOCATION
// ==========================================================

async function getCurrentLocation() {
  if (!navigator.geolocation) {
    console.warn("Geolocation unavailable. Using Delhi fallback.");

    setCurrentLocation(currentLocation.latitude, currentLocation.longitude, 50);

    return;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        currentLocation = {
          latitude,
          longitude,
        };

        setCurrentLocation(latitude, longitude, accuracy);

        fieldMap?.setView([latitude, longitude], 14);

        resolve();
      },

      (error) => {
        console.warn("GPS failed:", error.message);

        setCurrentLocation(
          currentLocation.latitude,
          currentLocation.longitude,
          50,
        );

        resolve();
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  });
}

// ==========================================================
// SET LOCATION
// ==========================================================

function setCurrentLocation(latitude, longitude, accuracy = 50) {
  currentLocation = {
    latitude,
    longitude,
  };

  const latElement = document.getElementById("currentLatitude");
  const lngElement = document.getElementById("currentLongitude");
  const accuracyElement = document.getElementById("locationAccuracy");

  if (latElement) {
    latElement.textContent = latitude.toFixed(5);
  }

  if (lngElement) {
    lngElement.textContent = longitude.toFixed(5);
  }

  if (accuracyElement) {
    accuracyElement.textContent = Number.isFinite(Number(accuracy))
      ? `±${Math.round(accuracy)}m`
      : "GPS";
  }

  if (!fieldMap) return;

  if (currentLocationMarker) {
    fieldMap.removeLayer(currentLocationMarker);
  }

  if (currentAccuracyCircle) {
    fieldMap.removeLayer(currentAccuracyCircle);
  }

  currentLocationMarker = L.marker([latitude, longitude], {
    icon: L.divIcon({
      className: "",
      html: `<div class="current-location-marker"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
    zIndexOffset: 1000,
  });

  currentLocationMarker.bindPopup(`
    <div class="map-popup">
      <strong>Current Location</strong>
      <p>
        ${latitude.toFixed(5)},
        ${longitude.toFixed(5)}
      </p>
    </div>
  `);

  currentLocationMarker.addTo(fieldMap);

  currentAccuracyCircle = L.circle([latitude, longitude], {
    radius: Number(accuracy) || 50,
    stroke: false,
    fillOpacity: 0.08,
  }).addTo(fieldMap);
}

// ==========================================================
// API
// ==========================================================

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(options.headers || {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Invalid JSON response from ${endpoint}`);
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

// ==========================================================
// LOAD OPERATIONAL DATA
// ==========================================================

async function loadOperationalData() {
  console.log("📡 Loading Field operational data...");

  const results = await Promise.allSettled([
    apiFetch("/api/incidents"),

    apiFetch("/api/missions"),

    apiFetch("/api/teams"),

    apiFetch("/api/sos"),

    apiFetch("/api/resources"),

    apiFetch("/api/field"),
  ]);

  operationalData.incidents = extractArray(results[0], "incidents");

  operationalData.missions = extractArray(results[1], "missions");

  operationalData.teams = extractArray(results[2], "teams");

  operationalData.sos = extractArray(results[3], "sos");

  operationalData.resources = extractArray(results[4], "resources");

  operationalData.fieldDevices = extractArray(results[5], "fieldDevices");

  console.log("📊 Field operational data:", operationalData);

  renderOperationalMarkers();
}

// ==========================================================
// EXTRACT ARRAY
// ==========================================================

function extractArray(result, key) {
  if (!result || result.status !== "fulfilled") {
    return [];
  }

  const data = result.value;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.[key])) {
    return data.data[key];
  }

  return [];
}

// ==========================================================
// COORDINATES
// ==========================================================

function getCoordinates(item) {
  if (!item) return null;

  const latitude = Number(
    item.latitude ??
      item.lat ??
      item.location?.latitude ??
      item.location?.lat ??
      item.coordinates?.latitude ??
      item.coordinates?.lat,
  );

  const longitude = Number(
    item.longitude ??
      item.lng ??
      item.lon ??
      item.location?.longitude ??
      item.location?.lng ??
      item.location?.lon ??
      item.coordinates?.longitude ??
      item.coordinates?.lng,
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

// ==========================================================
// MARKER ICON
// ==========================================================

function createMarkerIcon(type) {
  return L.divIcon({
    className: "",

    html: `<div class="operational-marker ${type}"></div>`,

    iconSize: [18, 18],

    iconAnchor: [9, 9],

    popupAnchor: [0, -10],
  });
}

// ==========================================================
// OPERATIONAL MARKERS
// ==========================================================

function renderOperationalMarkers() {
  fieldMapLayers.incidents.clearLayers();
  fieldMapLayers.missions.clearLayers();
  fieldMapLayers.teams.clearLayers();
  fieldMapLayers.sos.clearLayers();

  renderIncidents();
  renderMissions();
  renderTeams();
  renderSOS();
  renderResources();
}

// ==========================================================
// INCIDENTS
// ==========================================================

function renderIncidents() {
  operationalData.incidents.forEach((incident) => {
    const coords = getCoordinates(incident);

    if (!coords) return;

    const severity = String(
      incident.severity || incident.priority || "MEDIUM",
    ).toLowerCase();

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createMarkerIcon(`marker-${severity}`),
    });

    marker.bindPopup(`
                <div class="map-popup">

                    <strong>
                        ${escapeHTML(
                          incident.title || incident.type || "Incident",
                        )}
                    </strong>

                    <p>
                        Severity:
                        ${escapeHTML(severity)}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(incident.status || "REPORTED")}
                    </p>

                </div>
            `);

    fieldMapLayers.incidents.addLayer(marker);
  });
}

// ==========================================================
// MISSIONS
// ==========================================================

function renderMissions() {
  operationalData.missions.forEach((mission) => {
    const coords = getCoordinates(
      mission.destination || mission.location || mission,
    );

    if (!coords) return;

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createMarkerIcon("marker-mission"),
    });

    marker.bindPopup(`
                <div class="map-popup">

                    <strong>
                        ${escapeHTML(
                          mission.title || mission.name || "Mission",
                        )}
                    </strong>

                    <p>
                        Priority:
                        ${escapeHTML(mission.priority || "NORMAL")}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(mission.status || "PENDING")}
                    </p>

                </div>
            `);

    fieldMapLayers.missions.addLayer(marker);
  });
}

// ==========================================================
// TEAMS
// ==========================================================

function renderTeams() {
  operationalData.teams.forEach((team) => {
    const coords = getCoordinates(team);

    if (!coords) return;

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createMarkerIcon("marker-team"),
    });

    marker.bindPopup(`
                <div class="map-popup">

                    <strong>
                        ${escapeHTML(team.name || team.teamId || "Responder")}
                    </strong>

                    <p>
                        Status:
                        ${escapeHTML(team.status || "UNKNOWN")}
                    </p>

                </div>
            `);

    fieldMapLayers.teams.addLayer(marker);
  });
}

// ==========================================================
// SOS
// ==========================================================

function renderSOS() {
  operationalData.sos.forEach((sos) => {
    const coords = getCoordinates(sos);

    if (!coords) return;

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createMarkerIcon("marker-sos"),
    });

    marker.bindPopup(`
                <div class="map-popup">

                    <strong>
                        🚨 SOS REQUEST
                    </strong>

                    <p>
                        Type:
                        ${escapeHTML(sos.type || "Emergency")}
                    </p>

                    <p>
                        Severity:
                        ${escapeHTML(sos.severity || "HIGH")}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(sos.status || "WAITING")}
                    </p>

                </div>
            `);

    fieldMapLayers.sos.addLayer(marker);
  });
}

// ==========================================================
// FIELD RESOURCES
// ==========================================================

function renderResources() {
  operationalData.resources.forEach((resource) => {
    const coords = getCoordinates(resource);

    if (!coords) return;

    const marker = L.marker([coords.latitude, coords.longitude], {
      icon: createMarkerIcon("marker-resource"),
      zIndexOffset: 500,
    });

    marker.bindPopup(`
      <div class="map-popup">

        <strong>
          📦 ${escapeHTML(resource.name || resource.type || "Resource")}
        </strong>

        <p>
          Status:
          ${escapeHTML(resource.status || "AVAILABLE")}
        </p>

      </div>
    `);

    // If your backend resource has a type, try to put it
    // into the appropriate resource layer.
    const type = String(resource.type || "").toLowerCase();

    if (type.includes("hospital")) {
      fieldMapLayers.hospitals.addLayer(marker);
    } else if (type.includes("shelter")) {
      fieldMapLayers.shelters.addLayer(marker);
    } else if (type.includes("police")) {
      fieldMapLayers.policeStations.addLayer(marker);
    } else if (type.includes("fire")) {
      fieldMapLayers.fireStations.addLayer(marker);
    } else if (type.includes("pharmacy")) {
      fieldMapLayers.pharmacies.addLayer(marker);
    } else if (type.includes("school")) {
      fieldMapLayers.schools.addLayer(marker);
    }
  });
}

async function loadMapResources() {
  const { latitude, longitude } = currentLocation;

  console.log("🏥 Fetching nearby map resources:", latitude, longitude);

  try {
    const response = await apiFetch(
      `/api/map/resources?lat=${encodeURIComponent(
        latitude,
      )}&lng=${encodeURIComponent(longitude)}`,
    );

    console.log("🗺 Resource API response:", response);

    const resources =
      response.resources ||
      response.data?.resources ||
      response.data ||
      response;

    renderNearbyResources(resources);
  } catch (error) {
    console.error("❌ Resource loading failed:", error);
  }
}

// ==========================================================
// RENDER NEARBY RESOURCES
// ==========================================================

function renderNearbyResources(resourceData) {
  if (!fieldMap) {
    console.error("❌ Field map is not initialized");
    return;
  }

  const resources = resourceData?.resources || resourceData || {};

  console.log("📍 Rendering resources:", resources);

  // --------------------------------------------------
  // CLEAR PREVIOUS RESOURCE MARKERS
  // --------------------------------------------------

  [
    fieldMapLayers.hospitals,
    fieldMapLayers.shelters,
    fieldMapLayers.policeStations,
    fieldMapLayers.fireStations,
    fieldMapLayers.pharmacies,
    fieldMapLayers.schools,
  ].forEach((layer) => {
    layer.clearLayers();
  });

  const resourceTypes = {
    hospitals: {
      layer: "hospitals",
      icon: "🏥",
      label: "Hospital",
    },

    shelters: {
      layer: "shelters",
      icon: "🏠",
      label: "Shelter",
    },

    policeStations: {
      layer: "policeStations",
      icon: "🚓",
      label: "Police Station",
    },

    fireStations: {
      layer: "fireStations",
      icon: "🚒",
      label: "Fire Station",
    },

    pharmacies: {
      layer: "pharmacies",
      icon: "💊",
      label: "Pharmacy",
    },

    schools: {
      layer: "schools",
      icon: "🏫",
      label: "School",
    },
  };

  let totalMarkers = 0;

  // --------------------------------------------------
  // CREATE RESOURCE MARKERS
  // --------------------------------------------------

  Object.entries(resourceTypes).forEach(([apiKey, config]) => {
    const items = resources[apiKey] || [];

    console.log(`📍 ${apiKey}: ${items.length}`);

    items.forEach((item) => {
      const coordinates = getCoordinates(item);

      if (!coordinates) {
        console.warn(`⚠️ ${config.label} has invalid coordinates:`, item);

        return;
      }

      const marker = L.marker([coordinates.latitude, coordinates.longitude], {
        icon: createResourceIcon(config.icon),
        zIndexOffset: 500,
      });

      marker.bindPopup(`
        <div class="field-resource-popup">

          <strong>
            ${config.icon}
            ${escapeHTML(item.name || config.label)}
          </strong>

          <div>
            <b>Type:</b>
            ${config.label}
          </div>

          ${
            item.address
              ? `
                <div>
                  <b>Address:</b>
                  ${escapeHTML(item.address)}
                </div>
              `
              : ""
          }

          <div>
            <b>Coordinates:</b><br>
            ${coordinates.latitude.toFixed(5)},
            ${coordinates.longitude.toFixed(5)}
          </div>

        </div>
      `);

      fieldMapLayers[config.layer].addLayer(marker);

      totalMarkers++;
    });
  });

  // --------------------------------------------------
  // ENSURE ALL RESOURCE LAYERS ARE ON MAP
  // --------------------------------------------------

  Object.values(fieldMapLayers).forEach((layer) => {
    if (!fieldMap.hasLayer(layer)) {
      layer.addTo(fieldMap);
    }
  });

  console.log(`✅ Rendered ${totalMarkers} resource markers`);
}

// ==========================================================
// AI PREDICTION
// ==========================================================

async function loadPrediction() {
  const { latitude, longitude } = currentLocation;

  console.log("🤖 Fetching AI prediction:", latitude, longitude);

  try {
    const response = await apiFetch(`/api/predictions/predict`, {
      method: "POST",

      body: JSON.stringify({
        latitude: Number(latitude),

        longitude: Number(longitude),
      }),
    });

    console.log("✅ Prediction response:", response);

    const predictionData = response.data || response;

    const zones =
      predictionData.zones ||
      predictionData.riskZones ||
      response.zones ||
      response.riskZones ||
      [];

    if (Array.isArray(zones)) {
      renderRiskZones(zones);
    } else {
      console.warn("⚠️ Prediction has no zones");
    }

    updateRiskInformation(predictionData);
  } catch (error) {
    console.error("❌ Prediction failed:", error);
  }
}

// ==========================================================
// RISK ZONES
// ==========================================================

function renderRiskZones(zones) {
  fieldMapLayers.riskZones.clearLayers();

  if (!Array.isArray(zones)) {
    return;
  }

  zones.forEach((zone) => {
    const latitude = Number(
      zone.latitude ??
        zone.lat ??
        zone.location?.latitude ??
        zone.location?.lat,
    );

    const longitude = Number(
      zone.longitude ??
        zone.lng ??
        zone.lon ??
        zone.location?.longitude ??
        zone.location?.lng,
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn("Invalid risk zone:", zone);

      return;
    }

    const radius = Number(zone.radius) || 500;

    const risk = String(
      zone.risk ?? zone.riskLevel ?? zone.level ?? "MEDIUM",
    ).toUpperCase();

    let fillColor = "#ffd23f";

    if (risk === "CRITICAL" || risk === "EXTREME") {
      fillColor = "#ff1744";
    } else if (risk === "HIGH") {
      fillColor = "#ff7518";
    } else if (risk === "LOW") {
      fillColor = "#27e08b";
    }

    const circle = L.circle([latitude, longitude], {
      radius,

      color: fillColor,

      fillColor: fillColor,

      fillOpacity: 0.18,

      opacity: 0.8,

      weight: 2,
    });

    circle.bindPopup(`
                <div class="risk-popup">

                    <strong>
                        ⚠️ AI FLOOD RISK ZONE
                    </strong>

                    <p>
                        Risk:
                        <b>
                            ${escapeHTML(risk)}
                        </b>
                    </p>

                    <p>
                        Probability:
                        ${escapeHTML(String(zone.probability ?? "--"))}%
                    </p>

                    <p>
                        Radius:
                        ${radius}m
                    </p>

                </div>
            `);

    fieldMapLayers.riskZones.addLayer(circle);
  });

  console.log(
    `✅ Rendered ${fieldMapLayers.riskZones.getLayers().length} AI risk zones`,
  );
}

// ==========================================================
// RISK INFORMATION
// ==========================================================

function updateRiskInformation(data) {
  const risk = String(
    data?.risk ?? data?.riskLevel ?? data?.level ?? "STABLE",
  ).toUpperCase();

  const riskElement = document.getElementById("riskStatus");

  // This Field App HTML currently does not have
  // a riskStatus element. That's okay.
  if (!riskElement) {
    console.log("ℹ️ Risk status UI not present. Risk:", risk);
    return;
  }

  riskElement.textContent = risk;
}

// ==========================================================
// DASHBOARD
// ==========================================================

function updateDashboard() {
  // ======================================================
  // INCIDENT COUNT
  // ======================================================

  const incidentCount = document.getElementById("incidentCount");

  if (incidentCount) {
    incidentCount.textContent = operationalData.incidents.length;
  }

  // ======================================================
  // SOS COUNT
  // ======================================================

  const sosCount = document.getElementById("sosCount");

  if (sosCount) {
    sosCount.textContent = operationalData.sos.length;
  }

  // ======================================================
  // MISSION COUNT
  // ======================================================

  const missionCount = document.getElementById("missionCount");

  if (missionCount) {
    missionCount.textContent = operationalData.missions.length;
  }

  // ======================================================
  // RESOURCE COUNT
  // ======================================================

  const resourceCount = document.getElementById("resourceCount");

  if (resourceCount) {
    let total = 0;

    [
      "hospitals",
      "shelters",
      "policeStations",
      "fireStations",
      "pharmacies",
      "schools",
      "resources",
    ].forEach((layerName) => {
      const layer = fieldMapLayers[layerName];

      if (layer) {
        total += layer.getLayers().length;
      }
    });

    resourceCount.textContent = total;
  }

  console.log("📊 Dashboard updated");
}

// ==========================================================
// LAYER CONTROLS
// ==========================================================

function initializeLayerControls() {
  document
    .querySelectorAll("#layerPanel input[data-layer]")
    .forEach((input) => {
      input.addEventListener("change", () => {
        const layerName = input.dataset.layer;

        const layer = fieldMapLayers[layerName];

        if (!layer) {
          console.warn("Unknown layer:", layerName);

          return;
        }

        if (input.checked) {
          layer.addTo(fieldMap);

          console.log(`👁️ ${layerName} layer enabled`);
        } else {
          fieldMap.removeLayer(layer);

          console.log(`🚫 ${layerName} layer disabled`);
        }
      });
    });
}

// ==========================================================
// UI
// ==========================================================

function initializeUI() {
  // ======================================================
  // MENU BUTTON
  // ======================================================

  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");
  const closeMenuBtn = document.getElementById("closeMenuBtn");

  menuBtn?.addEventListener("click", () => {
    menuPanel?.classList.toggle("hidden");
  });

  closeMenuBtn?.addEventListener("click", () => {
    menuPanel?.classList.add("hidden");
  });

  // ======================================================
  // LAYERS BUTTON
  // ======================================================

  const layersBtn = document.getElementById("layersBtn");
  const layerPanel = document.getElementById("layerPanel");

  layersBtn?.addEventListener("click", () => {
    layerPanel?.classList.toggle("hidden");
  });

  // ======================================================
  // MY LOCATION
  // ======================================================

  const myLocationBtn = document.getElementById("myLocationBtn");

  myLocationBtn?.addEventListener("click", async () => {
    try {
      await getCurrentLocation();

      fieldMap?.setView(
        [currentLocation.latitude, currentLocation.longitude],
        15,
        {
          animate: true,
        },
      );

      currentLocationMarker?.openPopup();
    } catch (error) {
      console.error("Location error:", error);
    }
  });

  // ======================================================
  // FILTER BUTTON
  // ======================================================

  const filterBtn = document.getElementById("filterBtn");

  filterBtn?.addEventListener("click", () => {
    layerPanel?.classList.toggle("hidden");
  });

  // ======================================================
  // SOS
  // ======================================================

  const sosButton = document.getElementById("sosButton");

  sosButton?.addEventListener("click", () => {
    openModal("sosModal");
  });

  // ======================================================
  // CLOSE MODALS
  // ======================================================

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  // ======================================================
  // MENU ACTIONS
  // ======================================================

  document.querySelectorAll(".menu-action").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      // Close menu after selection
      menuPanel?.classList.add("hidden");

      switch (action) {
        case "missions":
          openMissionPanel();
          break;

        case "sightings":
          openModal("sightingModal");
          break;

        case "chat":
          openModal("chatModal");
          break;

        case "updates":
          openUpdatesPanel();
          break;

        case "resources":
          focusNearbyResources();
          break;

        default:
          console.warn("Unknown menu action:", action);
      }
    });
  });

  // ======================================================
  // CLOSE UPDATES
  // ======================================================

  document.getElementById("closeUpdatesBtn")?.addEventListener("click", () => {
    document.getElementById("updatesPanel")?.classList.add("hidden");
  });

  // ======================================================
  // SEARCH
  // ======================================================

  const searchBtn = document.getElementById("searchBtn");
  const locationSearch = document.getElementById("locationSearch");

  searchBtn?.addEventListener("click", () => {
    searchLocation();
  });

  locationSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchLocation();
    }
  });

  // ======================================================
  // NOTIFICATIONS
  // ======================================================

  document.getElementById("notificationBtn")?.addEventListener("click", () => {
    openUpdatesPanel();
  });

  // ======================================================
  // SOS MODAL BUTTONS
  // ======================================================

  document.getElementById("cancelSOS")?.addEventListener("click", () => {
    closeModal("sosModal");
  });

  document.getElementById("confirmSOS")?.addEventListener("click", () => {
    sendFieldSOS();
  });

  // ======================================================
  // SIGHTING
  // ======================================================

  document
    .getElementById("submitSightingBtn")
    ?.addEventListener("click", () => {
      submitSighting();
    });

  // ======================================================
  // CHAT
  // ======================================================

  document.getElementById("sendChatBtn")?.addEventListener("click", () => {
    sendChatMessage();
  });

  document.getElementById("chatInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendChatMessage();
    }
  });
}

function openMissionPanel() {
  const missions = operationalData.missions || [];

  const title = document.getElementById("missionTitle");
  const description = document.getElementById("missionDescription");
  const location = document.getElementById("missionLocation");

  const mission = missions[0];

  if (!mission) {
    if (title) {
      title.textContent = "No Active Mission";
    }

    if (description) {
      description.textContent =
        "There are currently no missions assigned to this field unit.";
    }

    if (location) {
      location.textContent = "--";
    }
  } else {
    if (title) {
      title.textContent = mission.title || mission.name || "Field Mission";
    }

    if (description) {
      description.textContent =
        mission.description || "Mission details received from Command Center.";
    }

    const coords = getCoordinates(
      mission.destination || mission.location || mission,
    );

    if (location) {
      location.textContent = coords
        ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        : "Location unavailable";
    }
  }

  openModal("missionModal");
}

function openUpdatesPanel() {
  const panel = document.getElementById("updatesPanel");

  if (!panel) return;

  panel.classList.remove("hidden");

  renderUpdates();
}

function renderUpdates() {
  const container = document.getElementById("updatesList");

  if (!container) return;

  const missions = operationalData.missions || [];
  const sos = operationalData.sos || [];
  const incidents = operationalData.incidents || [];

  const updates = [];

  missions.slice(0, 3).forEach((mission) => {
    updates.push({
      icon: "◆",
      title: mission.title || mission.name || "Mission Update",
      message: `Status: ${mission.status || "PENDING"}`,
    });
  });

  sos.slice(0, 3).forEach((item) => {
    updates.push({
      icon: "!",
      title: "SOS Alert",
      message: `Status: ${item.status || "WAITING"}`,
    });
  });

  incidents.slice(0, 3).forEach((incident) => {
    updates.push({
      icon: "⚠",
      title: incident.title || incident.type || "Incident",
      message: `Severity: ${incident.severity || "MEDIUM"}`,
    });
  });

  if (!updates.length) {
    container.innerHTML = `
      <div class="empty-message">
        No new field updates.
      </div>
    `;

    return;
  }

  container.innerHTML = updates
    .map(
      (update) => `
      <div class="update-item">

        <span class="update-icon">
          ${update.icon}
        </span>

        <div>
          <strong>
            ${escapeHTML(update.title)}
          </strong>

          <small>
            ${escapeHTML(update.message)}
          </small>
        </div>

      </div>
    `,
    )
    .join("");
}

function focusNearbyResources() {
  const resourceLayers = [
    fieldMapLayers.hospitals,
    fieldMapLayers.shelters,
    fieldMapLayers.policeStations,
    fieldMapLayers.fireStations,
    fieldMapLayers.pharmacies,
    fieldMapLayers.schools,
  ];

  resourceLayers.forEach((layer) => {
    if (layer && !fieldMap.hasLayer(layer)) {
      layer.addTo(fieldMap);
    }
  });

  fieldMap?.setView([currentLocation.latitude, currentLocation.longitude], 14, {
    animate: true,
  });
}

function searchLocation() {
  const input = document.getElementById("locationSearch");

  if (!input) return;

  const query = input.value.trim();

  if (!query) return;

  /*
   * For now, support direct coordinates:
   *
   * 28.6139, 77.2090
   */

  const parts = query.split(",");

  if (parts.length === 2) {
    const latitude = Number(parts[0].trim());
    const longitude = Number(parts[1].trim());

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      currentLocation = {
        latitude,
        longitude,
      };

      setCurrentLocation(latitude, longitude, 50);

      fieldMap?.setView([latitude, longitude], 15, {
        animate: true,
      });

      return;
    }
  }

  console.log("Location search requires coordinates:", query);
}

function showToast(title, message) {
  const toast = document.getElementById("toast");

  const toastTitle = document.getElementById("toastTitle");

  const toastMessage = document.getElementById("toastMessage");

  if (!toast) return;

  if (toastTitle) {
    toastTitle.textContent = title;
  }

  if (toastMessage) {
    toastMessage.textContent = message;
  }

  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 4000);
}

// ==========================================================
// MISSION LIST
// ==========================================================

function renderMissionList() {
  const container = document.getElementById("missionList");

  if (!operationalData.missions.length) {
    container.innerHTML = `
            <div class="empty-message">
                No active missions.
            </div>
        `;

    return;
  }

  container.innerHTML = operationalData.missions
    .map(
      (mission) => `
                    <div class="update-item">

                        <span class="update-icon">
                            ◆
                        </span>

                        <div>

                            <strong>
                                ${escapeHTML(
                                  mission.title || mission.name || "Mission",
                                )}
                            </strong>

                            <small>
                                Status:
                                ${escapeHTML(mission.status || "PENDING")}
                            </small>

                        </div>

                    </div>
                `,
    )
    .join("");
}

// ==========================================================
// MODALS
// ==========================================================

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}

// ==========================================================
// HTML ESCAPE
// ==========================================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}

function createResourceIcon(emoji) {
  return L.divIcon({
    className: "field-resource-marker",

    html: `
      <div class="resource-marker-inner">
        ${emoji}
      </div>
    `,

    iconSize: [42, 42],

    iconAnchor: [21, 21],

    popupAnchor: [0, -21],
  });
}

// ==========================================================
// DEBUG
// ==========================================================

window.disasterOSField = {
  get map() {
    return fieldMap;
  },

  operationalData,

  fieldMapLayers,

  reloadOperationalData: loadOperationalData,

  reloadResources: loadMapResources,

  reloadPrediction: loadPrediction,
};

document.getElementById("missionsBtn")?.addEventListener("click", () => {

    window.location.href = "./mission-show.html";

});