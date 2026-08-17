"use strict";

/* ==========================================================
   DISASTEROS COMMAND CENTER
   MAP ENGINE
   ========================================================== */

console.log("Command Map Loaded");

/* ==========================================================
   MAP INITIALIZATION
   ========================================================== */

function initializeCommandMap() {
  if (!window.L) {
    console.error("Leaflet is not loaded.");
    return null;
  }

  if (!commandMapElement) {
    console.error("#commandMap element not found.");
    return null;
  }

  /*
   * Remove previous map instance.
   */

  if (CommandCenter.map) {
    try {
      CommandCenter.map.remove();
    } catch (error) {
      console.warn("Previous map removal failed:", error);
    }

    CommandCenter.map = null;
  }

  /*
   * Make sure the map container is visible.
   */

  commandMapElement.style.display = "block";

  /*
   * Create map.
   */

  const map = L.map("commandMap", {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
    minZoom: COMMAND_MAP_CONFIG.minZoom,
    maxZoom: COMMAND_MAP_CONFIG.maxZoom,
  });

  /*
   * Save globally.
   */

  CommandCenter.map = map;

  CommandCenter.mapInitialized = true;

  /*
   * Add zoom control.
   */

  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(map);

  /*
   * Add OpenStreetMap tiles.
   */

  L.tileLayer(COMMAND_MAP_CONFIG.tileUrl, COMMAND_MAP_CONFIG.tileOptions).addTo(
    map,
  );

  /*
   * Create layer groups.
   */

  CommandCenter.mapLayers.incidents = L.layerGroup().addTo(map);

  CommandCenter.mapLayers.sos = L.layerGroup().addTo(map);

  CommandCenter.mapLayers.missions = L.layerGroup().addTo(map);

  CommandCenter.mapLayers.teams = L.layerGroup().addTo(map);

  CommandCenter.mapLayers.resources = L.layerGroup().addTo(map);

  CommandCenter.mapLayers.zones = L.layerGroup().addTo(map);

  /*
   * Set initial position.
   */

  const latitude = CommandCenterLocation.latitude;

  const longitude = CommandCenterLocation.longitude;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    map.setView([latitude, longitude], COMMAND_MAP_CONFIG.defaultZoom);
  } else {
    /*
     * Fallback.
     */

    map.setView([28.6139, 77.209], 10);
  }

  /*
   * Map click.
   */

  map.on("click", (event) => {
    updateCommandMapCoordinates(event.latlng.lat, event.latlng.lng);
  });

  /*
   * Location marker.
   */

  addCommandLocationMarker();

  /*
   * Initial coordinate display.
   */

  updateCommandMapCoordinates(latitude, longitude);

  /*
   * Give Leaflet time to calculate
   * dimensions.
   */

  setTimeout(() => {
    map.invalidateSize(true);
  }, 200);

  console.log("✅ Command map initialized");

  return map;
}

/* ==========================================================
   MAP COORDINATES
   ========================================================== */

function updateCommandMapCoordinates(latitude, longitude) {
  const lat = Number(latitude);

  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  if (mapLat) {
    mapLat.textContent = lat.toFixed(6);
  }

  if (mapLng) {
    mapLng.textContent = lng.toFixed(6);
  }
}

/* ==========================================================
   LOCATION MARKER
   ========================================================== */

function addCommandLocationMarker() {
  const map = CommandCenter.map;

  if (!map) {
    return null;
  }

  const latitude = CommandCenterLocation.latitude;

  const longitude = CommandCenterLocation.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  /*
   * Remove previous operational marker.
   */

  if (
    CommandCenter.locationMarker &&
    map.hasLayer(CommandCenter.locationMarker)
  ) {
    map.removeLayer(CommandCenter.locationMarker);
  }

  /*
   * Tactical location icon.
   */

  const locationIcon = L.divIcon({
    className: "command-location-marker",

    html: `
                <div class="command-location-pulse">
                    <div class="command-location-core"></div>
                </div>
            `,

    iconSize: [34, 34],

    iconAnchor: [17, 17],
  });

  const marker = L.marker([latitude, longitude], {
    icon: locationIcon,

    zIndexOffset: 10000,
  });

  const locationName = escapeCommandHtml(
    CommandCenterLocation.name || "Operational Location",
  );

  marker.bindPopup(`
        <div class="command-popup">
            <strong>
                📍 ${locationName}
            </strong>

            <br>

            <small>
                Operational Center
            </small>
        </div>
    `);

  marker.addTo(map);

  CommandCenter.locationMarker = marker;

  return marker;
}

/* ==========================================================
   FLY TO LOCATION
   ========================================================== */

function flyCommandMapToLocation(latitude, longitude, zoom = 13) {
  const map = CommandCenter.map;

  if (!map) {
    return;
  }

  const lat = Number(latitude);

  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  map.flyTo([lat, lng], zoom, {
    animate: true,
    duration: 1.2,
  });

  updateCommandMapCoordinates(lat, lng);
}

/* ==========================================================
   CENTER OPERATIONAL LOCATION
   ========================================================== */

function centerCommandMap() {
  if (
    CommandCenterLocation.latitude === null ||
    CommandCenterLocation.longitude === null
  ) {
    return;
  }

  flyCommandMapToLocation(
    CommandCenterLocation.latitude,
    CommandCenterLocation.longitude,
    13,
  );
}

/* ==========================================================
   CLEAR MAP LAYER
   ========================================================== */

function clearCommandMapLayer(layerName) {
  const layer = CommandCenter.mapLayers[layerName];

  if (!layer) {
    return;
  }

  layer.clearLayers();
}

/* ==========================================================
   CLEAR ALL OPERATIONAL LAYERS
   ========================================================== */

function clearAllCommandMapLayers() {
  const layers = CommandCenter.mapLayers;

  Object.values(layers).forEach((layer) => {
    if (layer && typeof layer.clearLayers === "function") {
      layer.clearLayers();
    }
  });

  /*
   * Reset marker arrays.
   */

  CommandCenter.markerLayers = {
    incidents: [],
    sos: [],
    missions: [],
    teams: [],
    resources: [],
    zones: [],
  };
}

/* ==========================================================
   MARKER COLOR
   ========================================================== */

function getCommandMarkerColor(type, severity) {
  const normalizedType = String(type || "").toLowerCase();

  const normalizedSeverity = normalizeCommandSeverity(severity);

  /*
   * Severity gets priority.
   */

  if (normalizedSeverity === "CRITICAL") {
    return "#ff2525";
  }

  if (normalizedSeverity === "HIGH") {
    return "#ff6b35";
  }

  if (normalizedSeverity === "MEDIUM") {
    return "#ffb000";
  }

  /*
   * Type fallback.
   */

  const colors = {
    incident: "#ff3535",

    incidents: "#ff3535",

    sos: "#ff1493",

    mission: "#a855f7",

    missions: "#a855f7",

    team: "#00d26a",

    teams: "#00d26a",

    responder: "#00d26a",

    resource: "#38bdf8",

    resources: "#38bdf8",
  };

  return colors[normalizedType] || "#38bdf8";
}

/* ==========================================================
   MARKER EMOJI
   ========================================================== */

function getCommandMarkerEmoji(type) {
  const normalized = String(type || "").toLowerCase();

  const emojis = {
    incident: "!",

    incidents: "!",

    sos: "SOS",

    mission: "◆",

    missions: "◆",

    team: "●",

    teams: "●",

    responder: "●",

    resource: "◈",

    resources: "◈",
  };

  return emojis[normalized] || "●";
}

/* ==========================================================
   CREATE OPERATION ICON
   ========================================================== */

function createCommandMarkerIcon(type, severity) {
  const color = getCommandMarkerColor(type, severity);

  const emoji = getCommandMarkerEmoji(type);

  return L.divIcon({
    className: "command-operation-marker",

    html: `
            <div
                class="command-marker-inner"
                style="
                    background:${color};
                    box-shadow:
                        0 0 12px ${color},
                        0 0 24px ${color};
                "
            >
                ${escapeCommandHtml(emoji)}
            </div>
        `,

    iconSize: [30, 30],

    iconAnchor: [15, 15],

    popupAnchor: [0, -15],
  });
}

/* ==========================================================
   CREATE RESOURCE ICON
   ========================================================== */

function createCommandResourceIcon(resource) {
  const type = String(
    resource?.type || resource?.category || "resource",
  ).toLowerCase();

  const icons = {
    hospital: "🏥",

    hospitals: "🏥",

    shelter: "🏠",

    shelters: "🏠",

    police: "🚓",

    police_station: "🚓",

    fire: "🚒",

    fire_station: "🚒",

    pharmacy: "💊",

    school: "🏫",

    ambulance: "🚑",

    boat: "🚤",

    supplies: "📦",

    resource: "◈",
  };

  const colors = {
    hospital: "#ff3b30",

    hospitals: "#ff3b30",

    shelter: "#4ea8ff",

    shelters: "#4ea8ff",

    police: "#00d26a",

    police_station: "#00d26a",

    fire: "#ff9800",

    fire_station: "#ff9800",

    pharmacy: "#ff4f9a",

    school: "#ffd54f",

    ambulance: "#ef4444",

    boat: "#38bdf8",

    supplies: "#a855f7",

    resource: "#38bdf8",
  };

  const emoji = icons[type] || icons.resource;

  const color = colors[type] || colors.resource;

  return L.divIcon({
    className: "command-resource-marker",

    html: `
            <div
                class="command-resource-inner"
                style="
                    background:${color};
                    box-shadow:
                        0 0 12px ${color};
                "
            >
                ${emoji}
            </div>
        `,

    iconSize: [26, 26],

    iconAnchor: [13, 13],
  });
}

/* ==========================================================
   GENERIC OPERATION MARKER
   ========================================================== */

function createCommandOperationMarker(item, type) {
  const map = CommandCenter.map;

  if (!map) {
    return null;
  }

  const latitude = getCommandLatitude(item);

  const longitude = getCommandLongitude(item);

  if (latitude === null || longitude === null) {
    return null;
  }

  const severity = item.severity ?? item.priority ?? item.risk ?? "LOW";

  const marker = L.marker([latitude, longitude], {
    icon: createCommandMarkerIcon(type, severity),
  });

  const title =
    item.title || item.name || item.subject || item.type || type.toUpperCase();

  const status = item.status || "UNKNOWN";

  const description =
    item.description ||
    item.message ||
    item.details ||
    "No additional information.";

  marker.bindPopup(`
        <div class="command-popup">

            <strong>
                ${escapeCommandHtml(title)}
            </strong>

            <div>
                <small>
                    TYPE:
                    ${escapeCommandHtml(type.toUpperCase())}
                </small>
            </div>

            <div>
                <small>
                    STATUS:
                    ${escapeCommandHtml(status)}
                </small>
            </div>

            <div>
                <small>
                    SEVERITY:
                    ${escapeCommandHtml(severity)}
                </small>
            </div>

            <p>
                ${escapeCommandHtml(description)}
            </p>

        </div>
    `);

  marker.on("click", () => {
    if (typeof window.showCommandSelectedOperation === "function") {
      window.showCommandSelectedOperation(item, type);
    }
  });

  marker.addTo(CommandCenter.mapLayers[type]);

  CommandCenter.markerLayers[type].push(marker);

  return marker;
}

/* ==========================================================
   RENDER INCIDENT MARKERS
   ========================================================== */

function renderCommandIncidentMarkers() {
  clearCommandMapLayer("incidents");

  CommandCenter.markerLayers.incidents = [];

  const incidents = ensureCommandArray(CommandCenter.incidents);

  incidents.forEach((incident) => {
    createCommandOperationMarker(incident, "incidents");
  });
}

/* ==========================================================
   RENDER SOS MARKERS
   ========================================================== */

function renderCommandSOSMarkers() {
  clearCommandMapLayer("sos");

  CommandCenter.markerLayers.sos = [];

  const sos = ensureCommandArray(CommandCenter.sos);

  sos.forEach((item) => {
    createCommandOperationMarker(item, "sos");
  });
}

/* ==========================================================
   RENDER MISSION MARKERS
   ========================================================== */

function renderCommandMissionMarkers() {
  clearCommandMapLayer("missions");

  CommandCenter.markerLayers.missions = [];

  const missions = ensureCommandArray(CommandCenter.missions);

  missions.forEach((mission) => {
    createCommandOperationMarker(mission, "missions");
  });
}

/* ==========================================================
   RENDER TEAM MARKERS
   ========================================================== */

function renderCommandTeamMarkers() {
  clearCommandMapLayer("teams");

  CommandCenter.markerLayers.teams = [];

  const teams = ensureCommandArray(CommandCenter.teams);

  teams.forEach((team) => {
    createCommandOperationMarker(team, "teams");
  });
}

/* ==========================================================
   RENDER RESOURCE MARKERS
   ========================================================== */

function renderCommandResourceMarkers() {
  clearCommandMapLayer("resources");

  CommandCenter.markerLayers.resources = [];

  const resources = ensureCommandArray(CommandCenter.resources);

  resources.forEach((resource) => {
    const latitude = getCommandLatitude(resource);

    const longitude = getCommandLongitude(resource);

    if (latitude === null || longitude === null) {
      return;
    }

    const marker = L.marker([latitude, longitude], {
      icon: createCommandResourceIcon(resource),
    });

    const name = resource.name || resource.title || resource.type || "Resource";

    const type = resource.type || resource.category || "RESOURCE";

    marker.bindPopup(`
                <div class="command-popup">

                    <strong>
                        ${escapeCommandHtml(name)}
                    </strong>

                    <br>

                    <small>
                        ${escapeCommandHtml(String(type).toUpperCase())}
                    </small>

                </div>
            `);

    marker.addTo(CommandCenter.mapLayers.resources);

    CommandCenter.markerLayers.resources.push(marker);
  });
}

/* ==========================================================
   RISK ZONE COLOR
   ========================================================== */

function getCommandRiskZoneColor(risk) {
  const normalized = normalizeCommandSeverity(risk);

  if (normalized === "CRITICAL") {
    return {
      stroke: "#ff2525",
      fill: "#ff2020",
    };
  }

  if (normalized === "HIGH") {
    return {
      stroke: "#ff3535",
      fill: "#ff2525",
    };
  }

  if (normalized === "MEDIUM") {
    return {
      stroke: "#ff9d00",
      fill: "#ff9d00",
    };
  }

  return {
    stroke: "#00a957",
    fill: "#00b957",
  };
}

/* ==========================================================
   GENERATE RISK ZONE
   ========================================================== */

function generateCommandRiskPolygon(latitude, longitude, radius, seed = 1) {
  const latRadius = radius / 111320;

  const lngRadius = radius / (111320 * Math.cos((latitude * Math.PI) / 180));

  const shape = [
    [0.0, 1.0],

    [0.42, 0.82],

    [0.9, 0.55],

    [1.05, 0.05],

    [0.7, -0.65],

    [0.25, -1.05],

    [-0.55, -0.92],

    [-0.95, -0.35],

    [-0.85, 0.42],

    [-0.3, 0.95],
  ];

  return shape.map(([x, y], index) => {
    const variation = 0.86 + Math.sin(index * 17 + seed * 9) * 0.08;

    return [
      latitude + y * latRadius * variation,

      longitude + x * lngRadius * variation,
    ];
  });
}

/* ==========================================================
   RENDER RISK ZONES
   ========================================================== */

function renderCommandRiskZones() {
  clearCommandMapLayer("zones");

  CommandCenter.markerLayers.zones = [];

  /*
   * Risk zones can come from prediction
   * data or directly from operational data.
   */

  const zones = ensureCommandArray(CommandCenter.predictions);

  zones.forEach((zone, index) => {
    const latitude = getCommandLatitude(zone) ?? CommandCenterLocation.latitude;

    const longitude =
      getCommandLongitude(zone) ?? CommandCenterLocation.longitude;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const risk = String(
      zone.risk || zone.severity || zone.level || "LOW",
    ).toUpperCase();

    let radius = Number(zone.radius);

    if (!Number.isFinite(radius)) {
      if (risk === "CRITICAL" || risk === "EXTREME") {
        radius = 4000;
      } else if (risk === "HIGH") {
        radius = 3500;
      } else if (risk === "MEDIUM") {
        radius = 4500;
      } else {
        radius = 5500;
      }
    }

    const colors = getCommandRiskZoneColor(risk);

    const points = generateCommandRiskPolygon(
      latitude,
      longitude,
      radius,
      index + 10,
    );

    const polygon = L.polygon(points, {
      color: colors.stroke,

      weight: risk === "CRITICAL" ? 4 : risk === "HIGH" ? 3 : 2,

      opacity: 0.9,

      fillColor: colors.fill,

      fillOpacity:
        risk === "CRITICAL"
          ? 0.55
          : risk === "HIGH"
            ? 0.42
            : risk === "MEDIUM"
              ? 0.28
              : 0.15,
    });

    const zoneName = zone.name || zone.area || "Affected Area";

    polygon.bindPopup(`
                <div class="command-popup">

                    <strong
                        style="
                            color:${colors.stroke};
                        "
                    >
                        ${escapeCommandHtml(risk)}
                        RISK ZONE
                    </strong>

                    <div>
                        Area:
                        ${escapeCommandHtml(zoneName)}
                    </div>

                    <div>
                        Probability:
                        ${escapeCommandHtml(zone.probability ?? "--")}%
                    </div>

                    <div>
                        Radius:
                        ${(radius / 1000).toFixed(1)} km
                    </div>

                </div>
            `);

    polygon.on("mouseover", function () {
      this.setStyle({
        fillOpacity: 0.45,

        weight: 3,
      });
    });

    polygon.on("mouseout", function () {
      this.setStyle({
        fillOpacity:
          risk === "CRITICAL"
            ? 0.55
            : risk === "HIGH"
              ? 0.42
              : risk === "MEDIUM"
                ? 0.28
                : 0.15,

        weight: risk === "CRITICAL" ? 4 : risk === "HIGH" ? 3 : 2,
      });
    });

    polygon.addTo(CommandCenter.mapLayers.zones);

    CommandCenter.markerLayers.zones.push(polygon);
  });
}

/* ==========================================================
   RENDER ALL MAP DATA
   ========================================================== */

function renderCommandMapData() {
  if (!CommandCenter.map) {
    return;
  }

  renderCommandRiskZones();

  renderCommandIncidentMarkers();

  renderCommandSOSMarkers();

  renderCommandMissionMarkers();

  renderCommandTeamMarkers();

  renderCommandResourceMarkers();

  applyCommandLayerVisibility();

  console.log("🗺️ Command map data rendered");
}

/* ==========================================================
   FIT MAP TO DATA
   ========================================================== */

function fitCommandMapToData() {
  const map = CommandCenter.map;

  if (!map) {
    return;
  }

  const bounds = L.latLngBounds([]);

  /*
   * Operational location.
   */

  if (
    Number.isFinite(CommandCenterLocation.latitude) &&
    Number.isFinite(CommandCenterLocation.longitude)
  ) {
    bounds.extend([
      CommandCenterLocation.latitude,
      CommandCenterLocation.longitude,
    ]);
  }

  /*
   * Add markers.
   */

  Object.values(CommandCenter.markerLayers).forEach((markers) => {
    if (!Array.isArray(markers)) {
      return;
    }

    markers.forEach((marker) => {
      if (marker && typeof marker.getLatLng === "function") {
        bounds.extend(marker.getLatLng());
      } else if (marker && typeof marker.getBounds === "function") {
        bounds.extend(marker.getBounds());
      }
    });
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [100, 100],

      maxZoom: 13,

      animate: true,
    });
  } else {
    centerCommandMap();
  }
}

/* ==========================================================
   LAYER VISIBILITY
   ========================================================== */

function applyCommandLayerVisibility() {
  const map = CommandCenter.map;

  if (!map) {
    return;
  }

  Object.entries(CommandCenter.layerVisibility).forEach(
    ([layerName, visible]) => {
      const layer = CommandCenter.mapLayers[layerName];

      if (!layer) {
        return;
      }

      if (visible) {
        if (!map.hasLayer(layer)) {
          layer.addTo(map);
        }
      } else {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      }
    },
  );
}

/* ==========================================================
   SET LAYER VISIBILITY
   ========================================================== */

function setCommandLayerVisibility(layerName, visible) {
  if (
    !Object.prototype.hasOwnProperty.call(
      CommandCenter.layerVisibility,
      layerName,
    )
  ) {
    return;
  }

  CommandCenter.layerVisibility[layerName] = Boolean(visible);

  applyCommandLayerVisibility();
}

/* ==========================================================
   LAYER CHECKBOX EVENTS
   ========================================================== */

function initializeCommandLayerControls() {
  const controls = document.querySelectorAll(".layer-option input[data-layer]");

  controls.forEach((checkbox) => {
    const layerName = checkbox.dataset.layer;

    if (!layerName) {
      return;
    }

    /*
     * Sync initial state.
     */

    if (
      Object.prototype.hasOwnProperty.call(
        CommandCenter.layerVisibility,
        layerName,
      )
    ) {
      CommandCenter.layerVisibility[layerName] = checkbox.checked;
    }

    checkbox.addEventListener("change", () => {
      setCommandLayerVisibility(layerName, checkbox.checked);
    });
  });
}

/* ==========================================================
   MAP RESIZE
   ========================================================== */

function refreshCommandMapSize() {
  if (
    CommandCenter.map &&
    typeof CommandCenter.map.invalidateSize === "function"
  ) {
    setTimeout(() => {
      CommandCenter.map.invalidateSize(true);
    }, 100);
  }
}

/* ==========================================================
   MAP RESIZE ON WINDOW
   ========================================================== */

window.addEventListener("resize", () => {
  refreshCommandMapSize();
});

/* ==========================================================
   INITIALIZE LAYER CONTROLS
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeCommandLayerControls();
});

/* ==========================================================
   EXPORTS
   ========================================================== */

window.initializeCommandMap = initializeCommandMap;

window.updateCommandMapCoordinates = updateCommandMapCoordinates;

window.addCommandLocationMarker = addCommandLocationMarker;

window.flyCommandMapToLocation = flyCommandMapToLocation;

window.centerCommandMap = centerCommandMap;

window.clearCommandMapLayer = clearCommandMapLayer;

window.clearAllCommandMapLayers = clearAllCommandMapLayers;

window.createCommandMarkerIcon = createCommandMarkerIcon;

window.createCommandResourceIcon = createCommandResourceIcon;

window.renderCommandIncidentMarkers = renderCommandIncidentMarkers;

window.renderCommandSOSMarkers = renderCommandSOSMarkers;

window.renderCommandMissionMarkers = renderCommandMissionMarkers;

window.renderCommandTeamMarkers = renderCommandTeamMarkers;

window.renderCommandResourceMarkers = renderCommandResourceMarkers;

window.renderCommandRiskZones = renderCommandRiskZones;

window.renderCommandMapData = renderCommandMapData;

window.fitCommandMapToData = fitCommandMapToData;

window.applyCommandLayerVisibility = applyCommandLayerVisibility;

window.setCommandLayerVisibility = setCommandLayerVisibility;

window.refreshCommandMapSize = refreshCommandMapSize;

console.log("✅ Command Center map module initialized");
