// ==========================================================
// DISASTEROS COMMAND CENTER
// MAP ENGINE
// ==========================================================
//
// RESPONSIBILITY:
// 1. Initialize Leaflet map
// 2. Center map on selected operational location
// 3. Create map layers
// 4. Render incidents
// 5. Render SOS
// 6. Render missions
// 7. Render responders
// 8. Render resources
// 9. Render risk zones
// 10. Handle map layer visibility
// 11. Handle marker selection
// 12. Update coordinates
//
// ==========================================================

console.log("Command Center Map JS Loaded");

// ==========================================================
// MAP STATE
// ==========================================================

let commandMap = null;

let commandMapLayers = {
  incidents: L.layerGroup(),
  sos: L.layerGroup(),
  missions: L.layerGroup(),
  teams: L.layerGroup(),
  resources: L.layerGroup(),
  zones: L.layerGroup(),
};

let commandMarkers = {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  zones: [],
};

// ==========================================================
// MAP CONFIG
// ==========================================================

const COMMAND_MAP_DEFAULT_ZOOM = 12;

const COMMAND_MAP_MAX_ZOOM = 19;

// ==========================================================
// MAP ICON CONFIG
// ==========================================================

const COMMAND_MAP_ICON_CONFIG = {
  incident: {
    color: "#ff3030",
    emoji: "!",
  },

  sos: {
    color: "#ff0055",
    emoji: "SOS",
  },

  mission: {
    color: "#00c8ff",
    emoji: "◆",
  },

  team: {
    color: "#00e676",
    emoji: "●",
  },

  resource: {
    color: "#ffc107",
    emoji: "◆",
  },
};

// ==========================================================
// SAFE NUMBER
// ==========================================================

function commandMapNumber(value, fallback = null) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

// ==========================================================
// GET LATITUDE
// ==========================================================

function getCommandLatitude(item) {
  if (!item) {
    return null;
  }

  return commandMapNumber(
    item.latitude ??
      item.lat ??
      item.location?.latitude ??
      item.location?.lat ??
      item.coordinates?.latitude ??
      item.coordinates?.lat,
  );
}

// ==========================================================
// GET LONGITUDE
// ==========================================================

function getCommandLongitude(item) {
  if (!item) {
    return null;
  }

  return commandMapNumber(
    item.longitude ??
      item.lng ??
      item.lon ??
      item.location?.longitude ??
      item.location?.lng ??
      item.location?.lon ??
      item.coordinates?.longitude ??
      item.coordinates?.lng,
  );
}

// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeCommandMapHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================
// CREATE CUSTOM ICON
// ==========================================================

function createCommandMarkerIcon(type) {
  const config =
    COMMAND_MAP_ICON_CONFIG[type] || COMMAND_MAP_ICON_CONFIG.resource;

  return L.divIcon({
    className: "command-map-marker-wrapper",

    html: `
      <div
        class="command-map-marker"
        style="
          --marker-color:${config.color};
        "
      >
        <span>
          ${escapeCommandMapHTML(config.emoji)}
        </span>
      </div>
    `,

    iconSize: [34, 34],

    iconAnchor: [17, 17],

    popupAnchor: [0, -18],
  });
}

// ==========================================================
// INITIALIZE MAP
// ==========================================================

function initializeCommandMap(lat, lng) {
  lat = commandMapNumber(lat);

  lng = commandMapNumber(lng);

  if (lat === null || lng === null) {
    console.error("Cannot initialize map: invalid coordinates.");

    return null;
  }

  // --------------------------------------------------------
  // Remove old map
  // --------------------------------------------------------

  if (commandMap) {
    try {
      commandMap.remove();
    } catch (error) {
      console.warn("Previous map cleanup failed:", error);
    }

    commandMap = null;
  }

  // --------------------------------------------------------
  // Create map
  // --------------------------------------------------------

  commandMap = L.map("commandMap", {
    zoomControl: false,

    attributionControl: true,

    preferCanvas: true,
  }).setView([lat, lng], COMMAND_MAP_DEFAULT_ZOOM);

  // --------------------------------------------------------
  // Zoom controls
  // --------------------------------------------------------

  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(commandMap);

  // --------------------------------------------------------
  // OpenStreetMap
  // --------------------------------------------------------

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: COMMAND_MAP_MAX_ZOOM,

    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(commandMap);

  // --------------------------------------------------------
  // Add layer groups
  // --------------------------------------------------------

  Object.values(commandMapLayers).forEach((layer) => {
    layer.addTo(commandMap);
  });

  // --------------------------------------------------------
  // Selected operational location
  // --------------------------------------------------------

  addCommandLocationMarker(lat, lng);

  // --------------------------------------------------------
  // Map movement
  // --------------------------------------------------------

  commandMap.on("move", updateCommandMapCoordinates);

  commandMap.on("moveend", updateCommandMapCoordinates);

  updateCommandMapCoordinates();

  // --------------------------------------------------------
  // Fix rendering after display:none
  // --------------------------------------------------------

  setTimeout(() => {
    if (!commandMap) {
      return;
    }

    commandMap.invalidateSize(true);
  }, 300);

  console.log("Command Center map initialized:", lat, lng);

  return commandMap;
}

// ==========================================================
// SELECTED LOCATION MARKER
// ==========================================================

function addCommandLocationMarker(lat, lng) {
  if (!commandMap) {
    return;
  }

  const locationIcon = L.divIcon({
    className: "command-location-marker-wrapper",

    html: `
        <div class="command-location-pulse">
          <div class="command-location-core">
          </div>
        </div>
      `,

    iconSize: [40, 40],

    iconAnchor: [20, 20],
  });

  const marker = L.marker([lat, lng], {
    icon: locationIcon,

    zIndexOffset: 5000,
  });

  marker.bindPopup(`
      <div class="command-popup">
        <strong>
          📍 Operational Location
        </strong>

        <br>

        <span>
          ${escapeCommandMapHTML(
            window.commandLocation?.name || "Selected Area",
          )}
        </span>
      </div>
    `);

  marker.addTo(commandMap);
}

// ==========================================================
// UPDATE MAP COORDINATES
// ==========================================================

function updateCommandMapCoordinates() {
  if (!commandMap) {
    return;
  }

  const center = commandMap.getCenter();

  const lat = center.lat.toFixed(5);

  const lng = center.lng.toFixed(5);

  const latElement = document.getElementById("mapLat");

  const lngElement = document.getElementById("mapLng");

  if (latElement) {
    latElement.textContent = lat;
  }

  if (lngElement) {
    lngElement.textContent = lng;
  }
}

// ==========================================================
// FLY TO LOCATION
// ==========================================================

function flyCommandMapToLocation(lat, lng, zoom = COMMAND_MAP_DEFAULT_ZOOM) {
  if (!commandMap) {
    console.warn("Command map is not initialized.");

    return;
  }

  lat = commandMapNumber(lat);

  lng = commandMapNumber(lng);

  if (lat === null || lng === null) {
    return;
  }

  commandMap.flyTo([lat, lng], zoom, {
    animate: true,

    duration: 1.2,
  });
}

// ==========================================================
// CLEAR MAP LAYER
// ==========================================================

function clearCommandMapLayer(type) {
  const layer = commandMapLayers[type];

  if (!layer) {
    return;
  }

  layer.clearLayers();

  commandMarkers[type] = [];
}

// ==========================================================
// CLEAR ALL DATA MARKERS
// ==========================================================

function clearCommandMapData() {
  Object.keys(commandMapLayers).forEach((type) => {
    clearCommandMapLayer(type);
  });
}

// ==========================================================
// GENERIC POPUP
// ==========================================================

function createCommandPopup(item, type) {
  const title =
    item?.title || item?.name || item?.subject || type.toUpperCase();

  const status = item?.status || "ACTIVE";

  const severity = item?.severity || item?.priority || "MEDIUM";

  const description =
    item?.description ||
    item?.message ||
    "No additional information available.";

  const location =
    item?.location?.name ||
    item?.locationName ||
    item?.address ||
    item?.area ||
    "Operational Area";

  return `
    <div class="command-popup">

      <div class="command-popup-type">
        ${escapeCommandMapHTML(type.toUpperCase())}
      </div>

      <h3>
        ${escapeCommandMapHTML(title)}
      </h3>

      <div class="command-popup-row">
        <span>STATUS</span>
        <strong>
          ${escapeCommandMapHTML(status)}
        </strong>
      </div>

      <div class="command-popup-row">
        <span>SEVERITY</span>
        <strong>
          ${escapeCommandMapHTML(severity)}
        </strong>
      </div>

      <div class="command-popup-row">
        <span>LOCATION</span>
        <strong>
          ${escapeCommandMapHTML(location)}
        </strong>
      </div>

      <p>
        ${escapeCommandMapHTML(description)}
      </p>

    </div>
  `;
}

// ==========================================================
// ADD GENERIC MARKER
// ==========================================================

function addCommandMarker(item, type) {
  if (!commandMap) {
    return null;
  }

  const lat = getCommandLatitude(item);

  const lng = getCommandLongitude(item);

  if (lat === null || lng === null) {
    return null;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandMarkerIcon(type),
  });

  marker.bindPopup(createCommandPopup(item, type));

  marker.on("click", () => {
    if (typeof window.selectCommandOperation === "function") {
      window.selectCommandOperation(item, type);
    }
  });

  marker.addTo(commandMapLayers[type]);

  commandMarkers[type].push(marker);

  return marker;
}

// ==========================================================
// RENDER INCIDENTS
// ==========================================================

function renderCommandIncidents(incidents) {
  clearCommandMapLayer("incidents");

  if (!Array.isArray(incidents)) {
    return;
  }

  incidents.forEach((incident) => {
    addCommandMarker(incident, "incident");
  });
}

// ==========================================================
// RENDER SOS
// ==========================================================

function renderCommandSOS(sosList) {
  clearCommandMapLayer("sos");

  if (!Array.isArray(sosList)) {
    return;
  }

  sosList.forEach((sos) => {
    addCommandMarker(sos, "sos");
  });
}

// ==========================================================
// RENDER MISSIONS
// ==========================================================

function renderCommandMissions(missions) {
  clearCommandMapLayer("missions");

  if (!Array.isArray(missions)) {
    return;
  }

  missions.forEach((mission) => {
    addCommandMarker(mission, "mission");
  });
}

// ==========================================================
// RENDER RESPONDERS
// ==========================================================

function renderCommandTeams(teams) {
  clearCommandMapLayer("teams");

  if (!Array.isArray(teams)) {
    return;
  }

  teams.forEach((team) => {
    addCommandMarker(team, "team");
  });
}

// ==========================================================
// RESOURCE ICON
// ==========================================================

function createCommandResourceIcon(resourceType) {
  const type = String(resourceType || "resource").toLowerCase();

  const icons = {
    hospital: "🏥",
    shelter: "🏠",
    police: "🚓",
    fire: "🚒",
    pharmacy: "💊",
    school: "🏫",
    ambulance: "🚑",
    boat: "🚤",
    supplies: "📦",
    resource: "◆",
  };

  const colors = {
    hospital: "#ff3030",
    shelter: "#4ea8ff",
    police: "#00d26a",
    fire: "#ff9800",
    pharmacy: "#ff4f9a",
    school: "#ffd54f",
    ambulance: "#ffffff",
    boat: "#00bcd4",
    supplies: "#c084fc",
    resource: "#ffc107",
  };

  const icon = icons[type] || icons.resource;

  const color = colors[type] || colors.resource;

  return L.divIcon({
    className: "command-resource-marker-wrapper",

    html: `
      <div
        class="command-resource-marker"
        style="
          background:${color};
          box-shadow:0 0 14px ${color};
        "
      >
        ${icon}
      </div>
    `,

    iconSize: [28, 28],

    iconAnchor: [14, 14],
  });
}

// ==========================================================
// ADD RESOURCE MARKER
// ==========================================================

function addCommandResourceMarker(resource) {
  if (!commandMap) {
    return null;
  }

  const lat = getCommandLatitude(resource);

  const lng = getCommandLongitude(resource);

  if (lat === null || lng === null) {
    return null;
  }

  const type =
    resource.type || resource.category || resource.resourceType || "resource";

  const marker = L.marker([lat, lng], {
    icon: createCommandResourceIcon(type),
  });

  marker.bindPopup(`
    <div class="command-popup">

      <div class="command-popup-type">
        RESOURCE
      </div>

      <h3>
        ${escapeCommandMapHTML(resource.name || "Emergency Resource")}
      </h3>

      <div class="command-popup-row">
        <span>TYPE</span>

        <strong>
          ${escapeCommandMapHTML(type)}
        </strong>
      </div>

      <div class="command-popup-row">
        <span>LOCATION</span>

        <strong>
          ${escapeCommandMapHTML(
            resource.address || resource.location || "Operational Area",
          )}
        </strong>
      </div>

    </div>
  `);

  marker.addTo(commandMapLayers.resources);

  commandMarkers.resources.push(marker);

  return marker;
}

// ==========================================================
// RENDER RESOURCES
// ==========================================================

function renderCommandResources(resources) {
  clearCommandMapLayer("resources");

  if (!resources) {
    return;
  }

  // --------------------------------------------------------
  // If resources is already an array
  // --------------------------------------------------------

  if (Array.isArray(resources)) {
    resources.forEach(addCommandResourceMarker);

    return;
  }

  // --------------------------------------------------------
  // If resources is grouped by type
  // --------------------------------------------------------

  Object.entries(resources).forEach(([type, list]) => {
    if (!Array.isArray(list)) {
      return;
    }

    list.forEach((resource) => {
      addCommandResourceMarker({
        ...resource,
        type: resource.type || type,
      });
    });
  });
}

// ==========================================================
// RISK ZONE COLOR
// ==========================================================

function getCommandRiskColor(risk) {
  const value = String(risk || "LOW").toUpperCase();

  if (value === "CRITICAL" || value === "EXTREME") {
    return {
      stroke: "#ff2020",
      fill: "#ff2020",
      opacity: 0.55,
    };
  }

  if (value === "HIGH") {
    return {
      stroke: "#ff3535",
      fill: "#ff2525",
      opacity: 0.42,
    };
  }

  if (value === "MEDIUM") {
    return {
      stroke: "#ff9d00",
      fill: "#ff9d00",
      opacity: 0.28,
    };
  }

  return {
    stroke: "#00b957",
    fill: "#00b957",
    opacity: 0.18,
  };
}

// ==========================================================
// CREATE IRREGULAR ZONE
// ==========================================================

function createCommandRiskPolygon(lat, lng, radius, seed = 1) {
  const latRadius = radius / 111320;

  const lngRadius = radius / (111320 * Math.cos((lat * Math.PI) / 180));

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

    return [lat + y * latRadius * variation, lng + x * lngRadius * variation];
  });
}

// ==========================================================
// RENDER RISK ZONES
// ==========================================================

function renderCommandRiskZones(zones) {
  clearCommandMapLayer("zones");

  if (!Array.isArray(zones)) {
    return;
  }

  zones.forEach((zone, index) => {
    const lat =
      getCommandLatitude(zone) ?? commandMapNumber(window.commandLocation?.lat);

    const lng =
      getCommandLongitude(zone) ??
      commandMapNumber(window.commandLocation?.lng);

    if (lat === null || lng === null) {
      return;
    }

    const risk = String(zone.risk || "LOW").toUpperCase();

    let radius = commandMapNumber(zone.radius);

    if (radius === null) {
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

    const colors = getCommandRiskColor(risk);

    const points = createCommandRiskPolygon(lat, lng, radius, index + 10);

    const polygon = L.polygon(points, {
      color: colors.stroke,

      weight:
        risk === "CRITICAL" || risk === "EXTREME" ? 4 : risk === "HIGH" ? 3 : 2,

      opacity: 0.9,

      fillColor: colors.fill,

      fillOpacity: colors.opacity,
    });

    polygon.bindPopup(`
        <div class="command-popup">

          <div
            class="command-popup-type"
            style="
              color:${colors.stroke};
            "
          >
            ${escapeCommandMapHTML(risk)}
            RISK ZONE
          </div>

          <h3>
            ${escapeCommandMapHTML(zone.name || "Affected Area")}
          </h3>

          <div class="command-popup-row">
            <span>PROBABILITY</span>

            <strong>
              ${zone.probability ?? "--"}%
            </strong>
          </div>

          <div class="command-popup-row">
            <span>RADIUS</span>

            <strong>
              ${(radius / 1000).toFixed(1)}
              km
            </strong>
          </div>

        </div>
      `);

    polygon.on("mouseover", function () {
      this.setStyle({
        fillOpacity: Math.min(colors.opacity + 0.15, 0.7),

        weight: 3,
      });
    });

    polygon.on("mouseout", function () {
      this.setStyle({
        fillOpacity: colors.opacity,

        weight:
          risk === "CRITICAL" || risk === "EXTREME"
            ? 4
            : risk === "HIGH"
              ? 3
              : 2,
      });
    });

    polygon.addTo(commandMapLayers.zones);

    commandMarkers.zones.push(polygon);
  });
}

// ==========================================================
// FIT MAP TO ZONES
// ==========================================================

function fitCommandMapToZones() {
  if (!commandMap || !commandMapLayers.zones) {
    return;
  }

  const layers = [];

  commandMapLayers.zones.eachLayer((layer) => {
    layers.push(layer);
  });

  if (!layers.length) {
    return;
  }

  const group = L.featureGroup(layers);

  const bounds = group.getBounds();

  if (!bounds.isValid()) {
    return;
  }

  commandMap.fitBounds(bounds.pad(0.2), {
    maxZoom: 13,

    minZoom: 9,

    animate: true,
  });
}

// ==========================================================
// FIT MAP TO ALL OPERATIONS
// ==========================================================

function fitCommandMapToOperations() {
  if (!commandMap) {
    return;
  }

  const layers = [];

  Object.values(commandMapLayers).forEach((group) => {
    group.eachLayer((layer) => {
      if (layer.getLatLng || layer.getBounds) {
        layers.push(layer);
      }
    });
  });

  if (!layers.length) {
    if (window.commandLocation) {
      flyCommandMapToLocation(
        window.commandLocation.lat,
        window.commandLocation.lng,
      );
    }

    return;
  }

  const group = L.featureGroup(layers);

  const bounds = group.getBounds();

  if (!bounds.isValid()) {
    return;
  }

  commandMap.fitBounds(bounds.pad(0.15), {
    maxZoom: 13,

    minZoom: 9,

    animate: true,
  });
}

// ==========================================================
// MAP LAYER VISIBILITY
// ==========================================================

function setCommandMapLayerVisibility(type, visible) {
  if (!commandMap) {
    return;
  }

  const layer = commandMapLayers[type];

  if (!layer) {
    console.warn("Unknown map layer:", type);

    return;
  }

  if (visible) {
    if (!commandMap.hasLayer(layer)) {
      layer.addTo(commandMap);
    }
  } else {
    if (commandMap.hasLayer(layer)) {
      commandMap.removeLayer(layer);
    }
  }
}

// ==========================================================
// LAYER CHECKBOXES
// ==========================================================

function initializeCommandLayerControls() {
  const checkboxes = document.querySelectorAll(
    ".layer-option input[data-layer]",
  );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const layer = checkbox.dataset.layer;

      const visible = checkbox.checked;

      setCommandMapLayerVisibility(layer, visible);
    });
  });
}

// ==========================================================
// REFRESH MAP DATA
// ==========================================================

function refreshCommandMap(data) {
  if (!commandMap) {
    return;
  }

  clearCommandMapData();

  if (!data) {
    return;
  }

  renderCommandIncidents(data.incidents || data.incident || []);

  renderCommandSOS(data.sos || data.sosRequests || []);

  renderCommandMissions(data.missions || []);

  renderCommandTeams(data.teams || data.responders || []);

  renderCommandResources(data.resources || []);

  renderCommandRiskZones(data.zones || data.riskZones || []);

  updateCommandMapCoordinates();

  console.log("Command Center map data refreshed.");
}

// ==========================================================
// MAP CLICK
// ==========================================================

function initializeCommandMapClick() {
  if (!commandMap) {
    return;
  }

  commandMap.on("click", (event) => {
    console.log("Map clicked:", event.latlng);
  });
}

// ==========================================================
// LOCATION READY EVENT
// ==========================================================

window.addEventListener("commandLocationReady", (event) => {
  const location = event.detail;

  if (!location) {
    return;
  }

  initializeCommandMap(location.lat, location.lng);

  initializeCommandMapClick();
});

// ==========================================================
// LOCATION RESET EVENT
// ==========================================================

window.addEventListener("commandLocationReset", () => {
  if (commandMap) {
    try {
      commandMap.remove();
    } catch (error) {
      console.warn("Map cleanup failed:", error);
    }

    commandMap = null;
  }

  clearCommandMapData();
});

// ==========================================================
// INITIALIZE CONTROLS
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeCommandLayerControls();
});

// ==========================================================
// EXPORTS
// ==========================================================

window.commandMap = commandMap;

window.initializeCommandMap = initializeCommandMap;

window.flyCommandMapToLocation = flyCommandMapToLocation;

window.refreshCommandMap = refreshCommandMap;

window.renderCommandIncidents = renderCommandIncidents;

window.renderCommandSOS = renderCommandSOS;

window.renderCommandMissions = renderCommandMissions;

window.renderCommandTeams = renderCommandTeams;

window.renderCommandResources = renderCommandResources;

window.renderCommandRiskZones = renderCommandRiskZones;

window.fitCommandMapToZones = fitCommandMapToZones;

window.fitCommandMapToOperations = fitCommandMapToOperations;

window.setCommandMapLayerVisibility = setCommandMapLayerVisibility;

console.log("✅ Command Center Map Engine Ready");
