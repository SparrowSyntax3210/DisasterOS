"use strict";

/* =========================================================
   DISASTEROS COMMAND CENTER
========================================================= */

console.log("🚀 Command Center Initializing");

/* =========================================================
   STATE
========================================================= */

const commandState = {
  location: {
    lat: null,
    lng: null,
  },

  incidents: [],
  missions: [],
  resources: [],
  teams: [],

  map: null,

  layers: {
    incidents: null,
    hospitals: null,
    fire: null,
    shelters: null,
    pharmacies: null,
    police: null,
  },

  markers: [],

  prediction: null,
};

/* =========================================================
   DOM
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🧠 Command Center DOM Ready");

  initializeNavigation();

  initializeModals();

  initializeActions();

  initializeMap();

  await initializeLocation();

  await loadCommandData();

  addActivity(
    "Command Center initialized",
    "Operational intelligence loaded successfully.",
  );
});

/* =========================================================
   LOCATION
========================================================= */

async function initializeLocation() {
  try {
    const location = window.CommandCenterLocation?.getLocation?.();

    if (
      location &&
      Number.isFinite(Number(location.lat ?? location.latitude))
    ) {
      commandState.location.lat = Number(location.lat ?? location.latitude);

      commandState.location.lng = Number(location.lng ?? location.longitude);
    }
  } catch (error) {
    console.warn("⚠️ CommandCenterLocation unavailable:", error);
  }

  if (
    !Number.isFinite(commandState.location.lat) ||
    !Number.isFinite(commandState.location.lng)
  ) {
    if (navigator.geolocation) {
      try {
        const position = await getBrowserLocation();

        commandState.location.lat = position.coords.latitude;

        commandState.location.lng = position.coords.longitude;
      } catch (error) {
        console.warn("⚠️ Browser location unavailable:", error);
      }
    }
  }

  updateLocationDisplay();

  updateCommandLocationAdapter();
}

/* =========================================================
   BROWSER LOCATION
========================================================= */

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

/* =========================================================
   LOCATION ADAPTER
========================================================= */

function updateCommandLocationAdapter() {
  /*
   * Your command-api.js reads:
   *
   * window.CommandCenterLocation.getLocation()
   *
   * So we provide it if another page/module hasn't already.
   */

  if (!window.CommandCenterLocation) {
    window.CommandCenterLocation = {
      getLocation() {
        return {
          lat: commandState.location.lat,
          lng: commandState.location.lng,
        };
      },
    };
  }
}

/* =========================================================
   LOCATION DISPLAY
========================================================= */

function updateLocationDisplay() {
  const element = $("#topLocation");

  if (!element) return;

  if (
    Number.isFinite(commandState.location.lat) &&
    Number.isFinite(commandState.location.lng)
  ) {
    element.textContent =
      `${commandState.location.lat.toFixed(4)}, ` +
      `${commandState.location.lng.toFixed(4)}`;
  } else {
    element.textContent = "Location unavailable";
  }
}

/* =========================================================
   LOAD EVERYTHING
========================================================= */

async function loadCommandData() {
  setRefreshState(true);

  await Promise.allSettled([
    loadIncidents(),
    loadMissions(),
    loadResources(),
    loadTeams(),
    loadMapResources(),
    loadPredictionHistory(),
  ]);

  setRefreshState(false);
}

/* =========================================================
   INCIDENTS
========================================================= */

async function loadIncidents() {
  try {
    const response = await commandApi.getIncidents();

    commandState.incidents = commandArray(response, [
      "incidents",
      "data",
      "items",
    ]);

    renderIncidents();

    updateIncidentKPIs();

    addActivity(
      "Incident intelligence updated",
      `${commandState.incidents.length} incidents received.`,
    );
  } catch (error) {
    console.error("❌ Failed to load incidents:", error);

    renderLoadError("#incidentList", "Unable to load incidents.");
  }
}

/* =========================================================
   INCIDENT RENDER
========================================================= */

function renderIncidents() {
  const container = $("#incidentList");

  if (!container) return;

  if (!commandState.incidents.length) {
    container.innerHTML = `
      <div class="loading-state">
        No active incidents detected.
      </div>
    `;

    return;
  }

  const active = commandState.incidents
    .filter((item) => commandIsActive(item))
    .slice(0, 8);

  if (!active.length) {
    container.innerHTML = `
      <div class="loading-state">
        No active incidents.
      </div>
    `;

    return;
  }

  container.innerHTML = active.map(renderIncidentItem).join("");
}

function renderIncidentItem(item) {
  const type = commandItemType(item, "incident");

  const severity = String(
    item?.severity || item?.priority || item?.status || "active",
  ).toLowerCase();

  const title =
    item?.title || item?.name || item?.incidentType || type || "Incident";

  const description =
    item?.description ||
    item?.message ||
    "Operational incident reported in monitored area.";

  return `

    <div class="incident-item">

      <div class="item-icon">
        ⚠
      </div>

      <div class="item-main">

        <strong>
          ${escapeCommandHTML(title)}
        </strong>

        <span>
          ${escapeCommandHTML(description)}
        </span>

      </div>

      <span class="item-status ${getSeverityClass(severity)}">
        ${escapeCommandHTML(severity)}
      </span>

    </div>

  `;
}

/* =========================================================
   INCIDENT KPI
========================================================= */

function updateIncidentKPIs() {
  const active = commandState.incidents.filter(commandIsActive);

  const critical = active.filter((item) => {
    const severity = String(
      item?.severity || item?.priority || "",
    ).toLowerCase();

    return severity === "critical";
  });

  setText("#activeIncidents", active.length);

  setText("#criticalIncidents", `${critical.length} critical`);

  setText("#incidentNavCount", active.length);

  setText("#alertNavCount", critical.length);
}

/* =========================================================
   MISSIONS
========================================================= */

async function loadMissions() {
  try {
    const response = await commandApi.getMissions();

    commandState.missions = commandArray(response, [
      "missions",
      "data",
      "items",
    ]);

    renderMissions();

    updateMissionKPIs();
  } catch (error) {
    console.error("❌ Failed to load missions:", error);

    renderLoadError("#missionList", "Unable to load missions.");
  }
}

/* =========================================================
   MISSION RENDER
========================================================= */

function renderMissions() {
  const container = $("#missionList");

  if (!container) return;

  if (!commandState.missions.length) {
    container.innerHTML = `
      <div class="loading-state">
        No missions currently deployed.
      </div>
    `;

    return;
  }

  container.innerHTML = commandState.missions
    .slice(0, 8)
    .map(renderMissionItem)
    .join("");
}

function renderMissionItem(item) {
  const name =
    item?.name || item?.title || item?.missionName || "Response Mission";

  const status = String(item?.status || "active").toLowerCase();

  const objective =
    item?.objective || item?.description || "Response operation";

  return `

    <div class="mission-item">

      <div class="item-icon"
           style="
             color: var(--blue);
             background: rgba(38,159,225,.08);
           ">
        ➜
      </div>

      <div class="item-main">

        <strong>
          ${escapeCommandHTML(name)}
        </strong>

        <span>
          ${escapeCommandHTML(objective)}
        </span>

      </div>

      <span class="item-status ${getSeverityClass(status)}">
        ${escapeCommandHTML(status)}
      </span>

    </div>

  `;
}

/* =========================================================
   MISSION KPI
========================================================= */

function updateMissionKPIs() {
  const active = commandState.missions.filter(commandIsActive);

  setText("#activeMissions", active.length);

  setText("#missionNavCount", active.length);
}

/* =========================================================
   RESOURCES
========================================================= */

async function loadResources() {
  try {
    const response = await commandApi.getResources();

    commandState.resources = commandArray(response, [
      "resources",
      "data",
      "items",
    ]);

    setText("#resourceCount", commandState.resources.length);
  } catch (error) {
    console.error("❌ Failed to load resources:", error);

    setText("#resourceCount", "--");
  }
}

/* =========================================================
   TEAMS
========================================================= */

async function loadTeams() {
  try {
    const response = await commandApi.getTeams();

    commandState.teams = commandArray(response, ["teams", "data", "items"]);

    setText("#teamCount", commandState.teams.length);
  } catch (error) {
    console.error("❌ Failed to load teams:", error);

    setText("#teamCount", "--");
  }
}

/* =========================================================
   MAP
========================================================= */

function initializeMap() {
  const mapElement = document.getElementById("commandMap");

  if (!mapElement) return;

  commandState.map = L.map("commandMap", {
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(commandState.map);

  commandState.map.setView([28.6139, 77.209], 10);

  commandState.layers.incidents = L.layerGroup().addTo(commandState.map);

  commandState.layers.hospitals = L.layerGroup().addTo(commandState.map);

  commandState.layers.fire = L.layerGroup().addTo(commandState.map);

  commandState.layers.shelters = L.layerGroup().addTo(commandState.map);

  commandState.layers.pharmacies = L.layerGroup().addTo(commandState.map);

  commandState.layers.police = L.layerGroup().addTo(commandState.map);
}

/* =========================================================
   MAP RESOURCES
========================================================= */

async function loadMapResources() {
  if (
    !Number.isFinite(commandState.location.lat) ||
    !Number.isFinite(commandState.location.lng)
  ) {
    console.warn("⚠️ No valid location for map resources.");

    return;
  }

  try {
    const response = await commandApi.getMapResources();

    console.log("🗺️ Map resources:", response);

    renderMapResources(response);
  } catch (error) {
    console.error("❌ Failed to load map resources:", error);
  }
}

/* =========================================================
   MAP RESOURCE RENDER
========================================================= */

function renderMapResources(response) {
  if (!commandState.map) return;

  clearMapLayers();

  /*
   * The backend may return:
   *
   * {
   *   hospitals: [],
   *   police: [],
   *   fireStations: [],
   *   pharmacies: [],
   *   shelters: []
   * }
   *
   * commandArray handles alternate wrappers.
   */

  const hospitals = commandArray(response?.hospitals, ["hospitals"]);

  const fireStations = commandArray(
    response?.fireStations || response?.fire_stations,
    ["fireStations"],
  );

  const shelters = commandArray(response?.shelters, ["shelters"]);

  const pharmacies = commandArray(response?.pharmacies, ["pharmacies"]);

  const police = commandArray(response?.police, ["police"]);

  renderResourceLayer(
    hospitals,
    "hospitals",
    commandState.layers.hospitals,
    "🏥",
    "Hospital",
  );

  renderResourceLayer(
    fireStations,
    "fire",
    commandState.layers.fire,
    "🔥",
    "Fire Station",
  );

  renderResourceLayer(
    shelters,
    "shelters",
    commandState.layers.shelters,
    "⌂",
    "Shelter",
  );

  renderResourceLayer(
    pharmacies,
    "pharmacies",
    commandState.layers.pharmacies,
    "💊",
    "Pharmacy",
  );

  renderResourceLayer(
    police,
    "police",
    commandState.layers.police,
    "🚓",
    "Police Station",
  );

  setText("#hospitalCount", hospitals.length);

  setText("#fireCount", fireStations.length);

  setText("#shelterCount", shelters.length);

  setText("#pharmacyCount", pharmacies.length);

  setText("#policeCount", police.length);

  /*
   * Schools aren't necessarily returned by the
   * combined endpoint, so don't invent a value.
   */

  setText("#schoolCount", "—");
}

/* =========================================================
   RESOURCE LAYER
========================================================= */

function renderResourceLayer(items, type, layer, icon, label) {
  if (!layer) return;

  items.forEach((item) => {
    const coords = commandCoordinates(item);

    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      return;
    }

    const marker = L.marker([coords.lat, coords.lng]);

    marker.bindPopup(`
      <strong>${escapeCommandHTML(label)}</strong>
      <br>
      ${escapeCommandHTML(
        item?.name || item?.title || item?.display_name || "Emergency resource",
      )}
    `);

    marker.addTo(layer);
  });
}

/* =========================================================
   CLEAR MAP
========================================================= */

function clearMapLayers() {
  Object.values(commandState.layers).forEach((layer) => {
    if (layer) {
      layer.clearLayers();
    }
  });
}

/* =========================================================
   MAP CENTER
========================================================= */

function centerMapOnLocation() {
  if (!commandState.map) return;

  if (
    !Number.isFinite(commandState.location.lat) ||
    !Number.isFinite(commandState.location.lng)
  ) {
    showToast("Current location unavailable.");

    return;
  }

  commandState.map.setView(
    [commandState.location.lat, commandState.location.lng],
    13,
    {
      animate: true,
    },
  );
}

/* =========================================================
   PREDICTION HISTORY
========================================================= */

async function loadPredictionHistory() {
  try {
    const response = await commandApi.getPredictionHistory();

    const predictions = commandArray(response, [
      "predictions",
      "history",
      "data",
      "items",
    ]);

    if (!predictions.length) {
      await loadLiveWeather();

      return;
    }

    const latest = predictions[0];

    commandState.prediction = latest;

    renderPrediction(latest);
  } catch (error) {
    console.warn("⚠️ Prediction history unavailable:", error);

    await loadLiveWeather();
  }
}

/* =========================================================
   RUN PREDICTION
========================================================= */

async function runPrediction() {
  const button = $("#runPredictionBtn");

  if (!button) return;

  button.disabled = true;

  button.innerHTML = "◌ Running AI Prediction...";

  try {
    const response = await commandApi.createPrediction();

    commandState.prediction =
      response?.prediction || response?.data || response;

    renderPrediction(commandState.prediction);

    addActivity(
      "AI prediction completed",
      "Current disaster risk analysis has been updated.",
    );

    showToast("AI prediction completed.");
  } catch (error) {
    console.error("❌ Prediction failed:", error);

    showToast(error.message || "Prediction failed.");
  } finally {
    button.disabled = false;

    button.innerHTML = "<span>◈</span> Run AI Prediction";
  }
}

/* =========================================================
   LIVE WEATHER
========================================================= */

async function loadLiveWeather() {
  try {
    const weather = await commandApi.getLiveWeather();

    console.log("🌤️ Live weather:", weather);
  } catch (error) {
    console.warn("⚠️ Live weather unavailable:", error);
  }
}

/* =========================================================
   PREDICTION RENDER
========================================================= */

function renderPrediction(prediction) {
  if (!prediction) return;

  const probability = Number(
    prediction?.probability ??
      prediction?.riskProbability ??
      prediction?.risk_percentage ??
      prediction?.riskScore ??
      prediction?.score ??
      0,
  );

  const safeProbability = Math.max(
    0,
    Math.min(100, Number.isFinite(probability) ? probability : 0),
  );

  const risk = String(
    prediction?.riskLevel ??
      prediction?.risk ??
      prediction?.level ??
      getRiskLevel(safeProbability),
  ).toUpperCase();

  const type =
    prediction?.disasterType ??
    prediction?.predictionType ??
    prediction?.type ??
    "Flood Risk";

  const confidence =
    prediction?.confidence ?? prediction?.modelConfidence ?? "—";

  setText("#riskProbability", `${Math.round(safeProbability)}%`);

  setText("#riskLevel", risk);

  setText("#predictionType", type);

  setText("#predictionConfidence", formatConfidence(confidence));

  setText(
    "#predictionUpdated",
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const description = getRiskDescription(risk, safeProbability);

  setText("#riskDescription", description);

  updateRiskColor(risk);
}

/* =========================================================
   RISK HELPERS
========================================================= */

function getRiskLevel(probability) {
  if (probability >= 75) {
    return "CRITICAL";
  }

  if (probability >= 50) {
    return "HIGH";
  }

  if (probability >= 25) {
    return "MEDIUM";
  }

  return "LOW";
}

function getRiskDescription(level, probability) {
  if (level.includes("CRITICAL")) {
    return `Critical risk detected with ${Math.round(
      probability,
    )}% estimated probability. Immediate operational review recommended.`;
  }

  if (level.includes("HIGH")) {
    return `Elevated disaster probability detected. Response teams should remain ready.`;
  }

  if (level.includes("MEDIUM")) {
    return `Moderate risk detected. Continue monitoring environmental and incident signals.`;
  }

  return `Current monitored conditions indicate relatively low immediate disaster risk.`;
}

function updateRiskColor(level) {
  const element = $("#riskLevel");

  if (!element) return;

  if (level.includes("CRITICAL")) {
    element.style.color = "var(--red)";
  } else if (level.includes("HIGH")) {
    element.style.color = "var(--yellow)";
  } else if (level.includes("MEDIUM")) {
    element.style.color = "var(--blue)";
  } else {
    element.style.color = "var(--green)";
  }
}

function formatConfidence(value) {
  const number = Number(value);

  if (Number.isFinite(number)) {
    if (number <= 1) {
      return `${Math.round(number * 100)}%`;
    }

    return `${Math.round(number)}%`;
  }

  return String(value);
}

/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {
  $$(".nav-item[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.remove("active"));

      button.classList.add("active");

      const section = button.dataset.section;

      handleSectionNavigation(section);
    });
  });

  $$("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => {
      handleSectionNavigation(button.dataset.sectionTarget);
    });
  });
}

function handleSectionNavigation(section) {
  const positions = {
    overview: 0,
    prediction: 210,
    incidents: 850,
    missions: 850,
    resources: 1100,
    teams: 1100,
    map: 330,
    alerts: 1300,
    activity: 1300,
  };

  if (section === "incidents") {
    document.querySelector("#incidentList")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return;
  }

  if (section === "missions") {
    document.querySelector("#missionList")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return;
  }

  if (section === "map") {
    document.querySelector("#commandMap")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return;
  }

  window.scrollTo({
    top: positions[section] || 0,
    behavior: "smooth",
  });
}

/* =========================================================
   MODALS
========================================================= */

function initializeModals() {
  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      closeAllModals();
    });
  });

  $("#createMissionBtn")?.addEventListener("click", () => {
    openModal("#missionModal");
  });

  $("#incidentForm")?.addEventListener("submit", handleCreateIncident);

  $("#missionForm")?.addEventListener("submit", handleCreateMission);

  $$(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeAllModals();
      }
    });
  });
}

function openModal(selector) {
  $(selector)?.classList.add("open");
}

function closeAllModals() {
  $$(".modal-overlay").forEach((modal) => modal.classList.remove("open"));
}

/* =========================================================
   CREATE INCIDENT
========================================================= */

async function handleCreateIncident(event) {
  event.preventDefault();

  const type = $("#incidentType").value;

  const severity = $("#incidentSeverity").value;

  const description = $("#incidentDescription").value.trim();

  if (!type || !description) {
    showToast("Please complete the incident form.");

    return;
  }

  try {
    /*
     * We only send fields that the UI knows about.
     * Your backend may have additional optional fields.
     */

    const payload = {
      type,

      severity,

      description,

      ...(Number.isFinite(commandState.location.lat)
        ? {
            latitude: commandState.location.lat,

            longitude: commandState.location.lng,
          }
        : {}),
    };

    await commandApi.createIncident(payload);

    closeAllModals();

    $("#incidentForm").reset();

    addActivity(
      "Incident created",
      `${type} incident submitted to command network.`,
    );

    showToast("Incident created successfully.");

    await loadIncidents();
  } catch (error) {
    console.error("❌ Incident creation failed:", error);

    showToast(error.message || "Unable to create incident.");
  }
}

/* =========================================================
   CREATE MISSION
========================================================= */

async function handleCreateMission(event) {
  event.preventDefault();

  const name = $("#missionName").value.trim();

  const priority = $("#missionPriority").value;

  const objective = $("#missionObjective").value.trim();

  if (!name || !objective) {
    showToast("Please complete the mission form.");

    return;
  }

  try {
    const payload = {
      name,

      priority,

      objective,

      ...(Number.isFinite(commandState.location.lat)
        ? {
            latitude: commandState.location.lat,

            longitude: commandState.location.lng,
          }
        : {}),
    };

    await commandApi.createMission(payload);

    closeAllModals();

    $("#missionForm").reset();

    addActivity(
      "Mission deployed",
      `${name} has been submitted to Mission Control.`,
    );

    showToast("Mission deployed successfully.");

    await loadMissions();
  } catch (error) {
    console.error("❌ Mission creation failed:", error);

    showToast(error.message || "Unable to create mission.");
  }
}

/* =========================================================
   ACTIONS
========================================================= */

function initializeActions() {
  $("#runPredictionBtn")?.addEventListener("click", runPrediction);

  $("#refreshAllBtn")?.addEventListener("click", async () => {
    addActivity(
      "Intelligence refresh",
      "Refreshing incidents, missions, resources and prediction data.",
    );

    await loadCommandData();

    showToast("Command intelligence refreshed.");
  });

  $("#centerMapBtn")?.addEventListener("click", centerMapOnLocation);

  $("#predictionDetailsBtn")?.addEventListener("click", () => {
    document.querySelector(".prediction-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  $("#clearActivityBtn")?.addEventListener("click", () => {
    const feed = $("#activityFeed");

    if (!feed) return;

    feed.innerHTML = `
          <div class="loading-state">
            Activity feed cleared.
          </div>
        `;
  });

  initializeMapFilters();
}

/* =========================================================
   MAP FILTERS
========================================================= */

function initializeMapFilters() {
  $$(".map-filter").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".map-filter").forEach((item) => item.classList.remove("active"));

      button.classList.add("active");

      const layer = button.dataset.layer;

      setMapLayerVisibility(layer);
    });
  });
}

function setMapLayerVisibility(selected) {
  if (!commandState.map) return;

  const allLayers = {
    incidents: commandState.layers.incidents,

    hospitals: commandState.layers.hospitals,

    fire: commandState.layers.fire,

    shelters: commandState.layers.shelters,

    pharmacies: commandState.layers.pharmacies,

    police: commandState.layers.police,
  };

  Object.entries(allLayers).forEach(([name, layer]) => {
    if (!layer) return;

    if (selected === "all" || selected === name) {
      layer.addTo(commandState.map);
    } else {
      commandState.map.removeLayer(layer);
    }
  });
}

/* =========================================================
   ACTIVITY
========================================================= */

function addActivity(title, description) {
  const feed = $("#activityFeed");

  if (!feed) return;

  const item = document.createElement("div");

  item.className = "activity-item";

  item.innerHTML = `

    <div class="activity-dot"></div>

    <div>
      <strong>
        ${escapeCommandHTML(title)}
      </strong>

      <span>
        ${escapeCommandHTML(description)}
      </span>
    </div>

    <small>
      Now
    </small>

  `;

  feed.prepend(item);

  /*
   * Keep feed small.
   */

  while (feed.children.length > 8) {
    feed.removeChild(feed.lastElementChild);
  }
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {
  let toast = document.querySelector(".command-toast");

  if (!toast) {
    toast = document.createElement("div");

    toast.className = "command-toast";

    Object.assign(toast.style, {
      position: "fixed",
      right: "25px",
      bottom: "25px",
      zIndex: "99999",
      padding: "12px 16px",
      border: "1px solid rgba(24,201,237,.3)",
      borderRadius: "8px",
      background: "#0b222b",
      color: "#dff7fc",
      fontSize: "10px",
      boxShadow: "0 15px 50px rgba(0,0,0,.4)",
      transition: "opacity .2s, transform .2s",
    });

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.opacity = "1";

  toast.style.transform = "translateY(0)";

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";

    toast.style.transform = "translateY(10px)";
  }, 3000);
}

/* =========================================================
   HELPERS
========================================================= */

function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value ?? "—";
  }
}

function renderLoadError(selector, message) {
  const element = $(selector);

  if (!element) return;

  element.innerHTML = `

    <div class="loading-state">
      ${escapeCommandHTML(message)}
    </div>

  `;
}

function getSeverityClass(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("critical")) {
    return "critical";
  }

  if (normalized.includes("high")) {
    return "high";
  }

  if (normalized.includes("active") || normalized.includes("progress")) {
    return "active";
  }

  return "normal";
}

function setRefreshState(refreshing) {
  const button = $("#refreshAllBtn");

  if (!button) return;

  if (refreshing) {
    button.disabled = true;

    button.textContent = "↻ Refreshing...";
  } else {
    button.disabled = false;

    button.textContent = "↻ Refresh Intelligence";
  }
}

console.log("✅ Command Center Ready");
