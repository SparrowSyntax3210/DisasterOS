// ==========================================================
// DISASTEROS COMMAND CENTER
// MAP LAYERS
// ==========================================================

console.log("Command Center Layers JS Loaded");

// ==========================================================
// GLOBAL LAYER STATE
// ==========================================================

window.commandLayers = {
  incidents: null,
  sos: null,
  missions: null,
  teams: null,
  resources: null,
  zones: null,
};

// ==========================================================
// CREATE LAYER GROUPS
// ==========================================================

function initializeCommandLayers() {
  if (!window.commandMap) {
    console.warn("Command map is not initialized yet.");
    return;
  }

  window.commandLayers.incidents = L.layerGroup().addTo(window.commandMap);
  window.commandLayers.sos = L.layerGroup().addTo(window.commandMap);
  window.commandLayers.missions = L.layerGroup().addTo(window.commandMap);
  window.commandLayers.teams = L.layerGroup().addTo(window.commandMap);
  window.commandLayers.resources = L.layerGroup().addTo(window.commandMap);
  window.commandLayers.zones = L.layerGroup().addTo(window.commandMap);

  console.log("Command Center layers initialized.");
}

// ==========================================================
// CLEAR SINGLE LAYER
// ==========================================================

function clearCommandLayer(layerName) {
  const layer = window.commandLayers[layerName];

  if (!layer) {
    return;
  }

  layer.clearLayers();
}

// ==========================================================
// CLEAR ALL LAYERS
// ==========================================================

function clearAllCommandLayers() {
  Object.values(window.commandLayers).forEach((layer) => {
    if (layer) {
      layer.clearLayers();
    }
  });
}

// ==========================================================
// CREATE ICON
// ==========================================================

function createCommandIcon(type) {
  const config = {
    incidents: {
      emoji: "!",
      color: "#ff2525",
    },

    sos: {
      emoji: "SOS",
      color: "#ff1744",
    },

    missions: {
      emoji: "◆",
      color: "#00a8ff",
    },

    teams: {
      emoji: "●",
      color: "#00d26a",
    },

    resources: {
      emoji: "◈",
      color: "#ffd000",
    },
  };

  const settings = config[type] || {
    emoji: "•",
    color: "#ffffff",
  };

  return L.divIcon({
    className: "command-map-marker",

    html: `
      <div
        style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${settings.color};
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow:
            0 0 8px ${settings.color},
            0 0 18px ${settings.color};
        "
      >
        ${settings.emoji}
      </div>
    `,

    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// ==========================================================
// ADD INCIDENT MARKER
// ==========================================================

function addIncidentMarker(incident) {
  if (!window.commandMap || !window.commandLayers.incidents) {
    return;
  }

  const lat = Number(
    incident.latitude ?? incident.lat ?? incident.location?.latitude,
  );

  const lng = Number(
    incident.longitude ??
      incident.lng ??
      incident.lon ??
      incident.location?.longitude,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandIcon("incidents"),
  });

  const title = escapeCommandHtml(
    incident.title || incident.name || "Emergency Incident",
  );

  const severity = escapeCommandHtml(incident.severity || "UNKNOWN");

  const status = escapeCommandHtml(incident.status || "ACTIVE");

  marker.bindPopup(`
    <div class="command-popup">
      <strong>${title}</strong>

      <div>
        <span>INCIDENT</span>
      </div>

      <div>
        Severity:
        <strong>${severity}</strong>
      </div>

      <div>
        Status:
        <strong>${status}</strong>
      </div>
    </div>
  `);

  marker.on("click", () => {
    if (typeof window.selectCommandOperation === "function") {
      window.selectCommandOperation(incident, "INCIDENT");
    }
  });

  marker.addTo(window.commandLayers.incidents);
}

// ==========================================================
// ADD SOS MARKER
// ==========================================================

function addSOSMarker(sos) {
  if (!window.commandMap || !window.commandLayers.sos) {
    return;
  }

  const lat = Number(sos.latitude ?? sos.lat ?? sos.location?.latitude);

  const lng = Number(
    sos.longitude ?? sos.lng ?? sos.lon ?? sos.location?.longitude,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandIcon("sos"),
  });

  marker.bindPopup(`
    <div class="command-popup">
      <strong>SOS REQUEST</strong>

      <div>
        Status:
        <strong>
          ${escapeCommandHtml(sos.status || "ACTIVE")}
        </strong>
      </div>

      <div>
        Priority:
        <strong>
          ${escapeCommandHtml(sos.priority || sos.severity || "HIGH")}
        </strong>
      </div>
    </div>
  `);

  marker.on("click", () => {
    if (typeof window.selectCommandOperation === "function") {
      window.selectCommandOperation(sos, "SOS");
    }
  });

  marker.addTo(window.commandLayers.sos);
}

// ==========================================================
// ADD MISSION MARKER
// ==========================================================

function addMissionMarker(mission) {
  if (!window.commandMap || !window.commandLayers.missions) {
    return;
  }

  const lat = Number(
    mission.latitude ?? mission.lat ?? mission.location?.latitude,
  );

  const lng = Number(
    mission.longitude ??
      mission.lng ??
      mission.lon ??
      mission.location?.longitude,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandIcon("missions"),
  });

  marker.bindPopup(`
    <div class="command-popup">
      <strong>
        ${escapeCommandHtml(mission.title || mission.name || "Mission")}
      </strong>

      <div>
        Mission
      </div>

      <div>
        Status:
        <strong>
          ${escapeCommandHtml(mission.status || "ACTIVE")}
        </strong>
      </div>
    </div>
  `);

  marker.on("click", () => {
    if (typeof window.selectCommandOperation === "function") {
      window.selectCommandOperation(mission, "MISSION");
    }
  });

  marker.addTo(window.commandLayers.missions);
}

// ==========================================================
// ADD TEAM / RESPONDER MARKER
// ==========================================================

function addTeamMarker(team) {
  if (!window.commandMap || !window.commandLayers.teams) {
    return;
  }

  const lat = Number(team.latitude ?? team.lat ?? team.location?.latitude);

  const lng = Number(
    team.longitude ?? team.lng ?? team.lon ?? team.location?.longitude,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandIcon("teams"),
  });

  marker.bindPopup(`
    <div class="command-popup">
      <strong>
        ${escapeCommandHtml(team.name || team.teamName || "Responder Team")}
      </strong>

      <div>
        RESPONDER
      </div>

      <div>
        Status:
        <strong>
          ${escapeCommandHtml(team.status || "AVAILABLE")}
        </strong>
      </div>
    </div>
  `);

  marker.addTo(window.commandLayers.teams);
}

// ==========================================================
// ADD RESOURCE MARKER
// ==========================================================

function addResourceMarker(resource) {
  if (!window.commandMap || !window.commandLayers.resources) {
    return;
  }

  const lat = Number(
    resource.latitude ?? resource.lat ?? resource.location?.latitude,
  );

  const lng = Number(
    resource.longitude ??
      resource.lng ??
      resource.lon ??
      resource.location?.longitude,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const marker = L.marker([lat, lng], {
    icon: createCommandIcon("resources"),
  });

  marker.bindPopup(`
    <div class="command-popup">
      <strong>
        ${escapeCommandHtml(resource.name || "Emergency Resource")}
      </strong>

      <div>
        RESOURCE
      </div>

      <div>
        Type:
        <strong>
          ${escapeCommandHtml(resource.type || "RESOURCE")}
        </strong>
      </div>
    </div>
  `);

  marker.addTo(window.commandLayers.resources);
}

// ==========================================================
// ADD RISK ZONE
// ==========================================================

function addCommandRiskZone(zone) {
  if (!window.commandMap || !window.commandLayers.zones) {
    return;
  }

  const lat = Number(zone.latitude ?? zone.lat ?? window.commandLocation?.lat);

  const lng = Number(
    zone.longitude ?? zone.lng ?? zone.lon ?? window.commandLocation?.lng,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  const risk = String(zone.risk || zone.level || "LOW").toUpperCase();

  let color = "#00d26a";
  let radius = Number(zone.radius) || 2500;

  if (risk === "EXTREME" || risk === "CRITICAL") {
    color = "#ff2525";
    radius = Number(zone.radius) || 4000;
  } else if (risk === "HIGH") {
    color = "#ff5a36";
    radius = Number(zone.radius) || 3500;
  } else if (risk === "MEDIUM") {
    color = "#ffb000";
    radius = Number(zone.radius) || 3000;
  }

  const latRadius = radius / 111320;

  const lngRadius = radius / (111320 * Math.cos((lat * Math.PI) / 180));

  const points = [
    [0.0, 1.0],
    [0.55, 0.75],
    [1.0, 0.2],
    [0.7, -0.65],
    [0.15, -1.0],
    [-0.65, -0.85],
    [-1.0, -0.25],
    [-0.8, 0.55],
    [-0.25, 0.95],
  ];

  const polygonPoints = points.map(([x, y]) => [
    lat + y * latRadius,
    lng + x * lngRadius,
  ]);

  const polygon = L.polygon(polygonPoints, {
    color,
    fillColor: color,
    weight: 3,
    opacity: 0.85,
    fillOpacity: risk === "CRITICAL" || risk === "EXTREME" ? 0.48 : 0.28,
  });

  polygon.bindPopup(`
    <div class="command-popup">
      <strong style="color:${color}">
        ${risk} RISK ZONE
      </strong>

      <div>
        Area:
        ${escapeCommandHtml(zone.name || "Affected Area")}
      </div>

      <div>
        Probability:
        <strong>
          ${zone.probability ?? "--"}%
        </strong>
      </div>
    </div>
  `);

  polygon.addTo(window.commandLayers.zones);
}

// ==========================================================
// RENDER ALL MARKERS
// ==========================================================

function renderCommandMarkers(data) {
  if (!data) {
    return;
  }

  clearAllCommandLayers();

  const incidents = data.incidents || data.incident || [];

  const sos = data.sos || data.sosRequests || [];

  const missions = data.missions || [];

  const teams = data.teams || data.responders || [];

  const resources = data.resources || [];

  const zones = data.zones || data.riskZones || [];

  if (Array.isArray(incidents)) {
    incidents.forEach(addIncidentMarker);
  }

  if (Array.isArray(sos)) {
    sos.forEach(addSOSMarker);
  }

  if (Array.isArray(missions)) {
    missions.forEach(addMissionMarker);
  }

  if (Array.isArray(teams)) {
    teams.forEach(addTeamMarker);
  }

  if (Array.isArray(resources)) {
    resources.forEach(addResourceMarker);
  }

  if (Array.isArray(zones)) {
    zones.forEach(addCommandRiskZone);
  }

  console.log("Command Center markers rendered.");
}

// ==========================================================
// MAP LAYER CHECKBOXES
// ==========================================================

function initializeLayerControls() {
  const checkboxes = document.querySelectorAll(
    ".layer-option input[data-layer]",
  );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const layerName = checkbox.dataset.layer;

      const layer = window.commandLayers[layerName];

      if (!layer) {
        return;
      }

      if (checkbox.checked) {
        layer.addTo(window.commandMap);
      } else {
        window.commandMap.removeLayer(layer);
      }
    });
  });
}

// ==========================================================
// HTML ESCAPE
// ==========================================================

function escapeCommandHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================
// EXPORT
// ==========================================================

window.initializeCommandLayers = initializeCommandLayers;

window.clearCommandLayer = clearCommandLayer;

window.clearAllCommandLayers = clearAllCommandLayers;

window.renderCommandMarkers = renderCommandMarkers;

window.initializeLayerControls = initializeLayerControls;

window.addCommandRiskZone = addCommandRiskZone;
