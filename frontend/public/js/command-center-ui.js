// ==========================================================
// DISASTEROS COMMAND CENTER
// UI / DASHBOARD RENDERING
// ==========================================================

console.log("Command Center UI JS Loaded");

// ==========================================================
// DOM REFERENCES
// ==========================================================

const commandUI = {
  incidentCount: document.getElementById("incidentCount"),
  sosCount: document.getElementById("sosCount"),
  missionCount: document.getElementById("missionCount"),
  teamCount: document.getElementById("teamCount"),

  riskLevel: document.getElementById("riskLevel"),
  riskScore: document.getElementById("riskScore"),
  situationSummary: document.getElementById("situationSummary"),

  alertCount: document.getElementById("alertCount"),
  alertsList: document.getElementById("alertsList"),

  resourceTeams: document.getElementById("resourceTeams"),
  resourceAmbulance: document.getElementById("resourceAmbulance"),
  resourceBoats: document.getElementById("resourceBoats"),
  resourceSupplies: document.getElementById("resourceSupplies"),

  selectedPanel: document.getElementById("selectedPanel"),
  selectedTitle: document.getElementById("selectedTitle"),
  selectedStatus: document.getElementById("selectedStatus"),
  selectedSeverity: document.getElementById("selectedSeverity"),
  selectedDescription: document.getElementById("selectedDescription"),
  selectedLocation: document.getElementById("selectedLocation"),
  selectedType: document.querySelector(".selected-type"),

  closeSelected: document.getElementById("closeSelected"),

  mapLat: document.getElementById("mapLat"),
  mapLng: document.getElementById("mapLng"),
};

// ==========================================================
// SAFE VALUE
// ==========================================================

function uiValue(value, fallback = "--") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value;
}

// ==========================================================
// UPDATE LOCATION DISPLAY
// ==========================================================

function updateCommandLocationUI() {
  const location = window.commandLocation;

  if (!location) {
    return;
  }

  if (commandUI.mapLat) {
    commandUI.mapLat.textContent = Number(location.lat).toFixed(5);
  }

  if (commandUI.mapLng) {
    commandUI.mapLng.textContent = Number(location.lng).toFixed(5);
  }
}

// ==========================================================
// UPDATE SITUATION COUNTERS
// ==========================================================

function renderSituationOverview(data) {
  if (!data) {
    return;
  }

  const incidents = data.incidents || data.incident || [];

  const sos = data.sos || data.sosRequests || [];

  const missions = data.missions || [];

  const teams = data.teams || data.responders || [];

  if (commandUI.incidentCount) {
    commandUI.incidentCount.textContent = Array.isArray(incidents)
      ? incidents.length
      : Number(incidents) || 0;
  }

  if (commandUI.sosCount) {
    commandUI.sosCount.textContent = Array.isArray(sos)
      ? sos.length
      : Number(sos) || 0;
  }

  if (commandUI.missionCount) {
    commandUI.missionCount.textContent = Array.isArray(missions)
      ? missions.length
      : Number(missions) || 0;
  }

  if (commandUI.teamCount) {
    commandUI.teamCount.textContent = Array.isArray(teams)
      ? teams.length
      : Number(teams) || 0;
  }
}

// ==========================================================
// RISK STATUS
// ==========================================================

function renderRiskStatus(data) {
  if (!data) {
    return;
  }

  const prediction = data.prediction || data.risk || {};

  const risk =
    prediction.risk || data.riskLevel || data.risk || "AWAITING DATA";

  const score =
    prediction.probability ??
    prediction.score ??
    data.riskScore ??
    data.probability ??
    null;

  if (commandUI.riskLevel) {
    commandUI.riskLevel.textContent = String(risk).toUpperCase();
  }

  if (commandUI.riskScore) {
    commandUI.riskScore.textContent = score === null ? "--" : `${score}%`;
  }

  if (commandUI.situationSummary) {
    commandUI.situationSummary.textContent = buildSituationSummary(
      data,
      risk,
      score,
    );
  }
}

// ==========================================================
// GENERATE SITUATION SUMMARY
// ==========================================================

function buildSituationSummary(data, risk, score) {
  const incidents = Array.isArray(data.incidents) ? data.incidents.length : 0;

  const sos = Array.isArray(data.sos)
    ? data.sos.length
    : Array.isArray(data.sosRequests)
      ? data.sosRequests.length
      : 0;

  const missions = Array.isArray(data.missions) ? data.missions.length : 0;

  const teams = Array.isArray(data.teams)
    ? data.teams.length
    : Array.isArray(data.responders)
      ? data.responders.length
      : 0;

  let summary =
    `Operational monitoring active. ` +
    `${incidents} incidents, ` +
    `${sos} SOS requests and ` +
    `${missions} missions detected. ` +
    `${teams} responder units available.`;

  if (
    String(risk).toUpperCase() === "CRITICAL" ||
    String(risk).toUpperCase() === "EXTREME"
  ) {
    summary =
      `Critical operational conditions detected. ` +
      `Immediate attention is required across ` +
      `active incidents and emergency operations.`;
  } else if (String(risk).toUpperCase() === "HIGH") {
    summary =
      `High operational risk detected. ` +
      `Emergency teams should remain prepared ` +
      `for escalation.`;
  }

  return summary;
}

// ==========================================================
// ALERTS
// ==========================================================

function renderAlerts(data) {
  if (!commandUI.alertsList) {
    return;
  }

  const alerts = [];

  // --------------------------------------------------------
  // INCIDENT ALERTS
  // --------------------------------------------------------

  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  incidents.forEach((incident) => {
    const severity = String(
      incident.severity || incident.priority || "HIGH",
    ).toUpperCase();

    alerts.push({
      type: "INCIDENT",
      title: incident.title || incident.name || "Emergency Incident",
      description:
        incident.description ||
        "Active incident reported in the operational area.",
      severity,
      item: incident,
    });
  });

  // --------------------------------------------------------
  // SOS ALERTS
  // --------------------------------------------------------

  const sos = Array.isArray(data?.sos)
    ? data.sos
    : Array.isArray(data?.sosRequests)
      ? data.sosRequests
      : [];

  sos.forEach((item) => {
    alerts.push({
      type: "SOS",
      title: "Emergency SOS Request",
      description:
        item.description ||
        item.message ||
        "Emergency assistance has been requested.",
      severity: String(
        item.severity || item.priority || "CRITICAL",
      ).toUpperCase(),
      item,
    });
  });

  // --------------------------------------------------------
  // SORT BY SEVERITY
  // --------------------------------------------------------

  const priority = {
    CRITICAL: 4,
    EXTREME: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  alerts.sort((a, b) => {
    return (priority[b.severity] || 0) - (priority[a.severity] || 0);
  });

  if (commandUI.alertCount) {
    commandUI.alertCount.textContent = alerts.length;
  }

  // --------------------------------------------------------
  // EMPTY STATE
  // --------------------------------------------------------

  if (!alerts.length) {
    commandUI.alertsList.innerHTML = `
      <div class="empty-state">
        No active alerts
      </div>
    `;

    return;
  }

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------

  commandUI.alertsList.innerHTML = "";

  alerts.slice(0, 10).forEach((alert) => {
    const element = document.createElement("div");

    element.className = "command-alert-item";

    const severityClass = alert.severity.toLowerCase().replace(/[^a-z]/g, "");

    element.innerHTML = `
        <div class="alert-indicator ${severityClass}">
        </div>

        <div class="alert-content">

          <div class="alert-top">

            <span class="alert-type">
              ${escapeCommandUI(alert.type)}
            </span>

            <span class="alert-severity">
              ${escapeCommandUI(alert.severity)}
            </span>

          </div>

          <strong>
            ${escapeCommandUI(alert.title)}
          </strong>

          <p>
            ${escapeCommandUI(alert.description)}
          </p>

        </div>
      `;

    element.addEventListener("click", () => {
      if (typeof window.selectCommandOperation === "function") {
        window.selectCommandOperation(alert.item, alert.type);
      }
    });

    commandUI.alertsList.appendChild(element);
  });
}

// ==========================================================
// RESOURCE COUNTS
// ==========================================================

function renderResourcesUI(data) {
  if (!data) {
    return;
  }

  const resources = data.resources || {};

  const teams = data.teams || data.responders || resources.teams || [];

  const ambulances =
    data.ambulances || resources.ambulances || resources.ambulance || [];

  const boats = data.boats || resources.boats || [];

  const supplies = data.supplies || resources.supplies || [];

  if (commandUI.resourceTeams) {
    commandUI.resourceTeams.textContent = Array.isArray(teams)
      ? teams.length
      : Number(teams) || 0;
  }

  if (commandUI.resourceAmbulance) {
    commandUI.resourceAmbulance.textContent = Array.isArray(ambulances)
      ? ambulances.length
      : Number(ambulances) || 0;
  }

  if (commandUI.resourceBoats) {
    commandUI.resourceBoats.textContent = Array.isArray(boats)
      ? boats.length
      : Number(boats) || 0;
  }

  if (commandUI.resourceSupplies) {
    commandUI.resourceSupplies.textContent = Array.isArray(supplies)
      ? supplies.length
      : Number(supplies) || 0;
  }
}

// ==========================================================
// SELECTED OPERATION
// ==========================================================

function selectCommandOperation(operation, type = "INCIDENT") {
  if (!commandUI.selectedPanel) {
    return;
  }

  if (!operation) {
    return;
  }

  const normalizedType = String(type).toUpperCase();

  if (commandUI.selectedType) {
    commandUI.selectedType.textContent = normalizedType;
  }

  if (commandUI.selectedTitle) {
    commandUI.selectedTitle.textContent = uiValue(
      operation.title ||
        operation.name ||
        operation.subject ||
        `${normalizedType} Operation`,
    );
  }

  if (commandUI.selectedStatus) {
    commandUI.selectedStatus.textContent = uiValue(operation.status, "ACTIVE");
  }

  if (commandUI.selectedSeverity) {
    commandUI.selectedSeverity.textContent = uiValue(
      operation.severity || operation.priority,
      "HIGH",
    );
  }

  if (commandUI.selectedDescription) {
    commandUI.selectedDescription.textContent = uiValue(
      operation.description || operation.message,
      "No additional information available.",
    );
  }

  if (commandUI.selectedLocation) {
    commandUI.selectedLocation.textContent = uiValue(
      operation.location?.name ||
        operation.locationName ||
        operation.address ||
        operation.area,
      "Operational Area",
    );
  }

  commandUI.selectedPanel.classList.remove("hidden");
}

// ==========================================================
// CLOSE SELECTED OPERATION
// ==========================================================

function closeSelectedOperation() {
  if (!commandUI.selectedPanel) {
    return;
  }

  commandUI.selectedPanel.classList.add("hidden");
}

if (commandUI.closeSelected) {
  commandUI.closeSelected.addEventListener("click", closeSelectedOperation);
}

// ==========================================================
// RENDER COMPLETE UI
// ==========================================================

function renderCommandUI(data) {
  if (!data) {
    console.warn("No command center data received.");

    return;
  }

  renderSituationOverview(data);

  renderRiskStatus(data);

  renderAlerts(data);

  renderResourcesUI(data);

  updateCommandLocationUI();

  console.log("Command Center UI rendered.");
}

// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeCommandUI(value) {
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

window.renderCommandUI = renderCommandUI;

window.renderSituationOverview = renderSituationOverview;

window.renderRiskStatus = renderRiskStatus;

window.renderAlerts = renderAlerts;

window.renderResourcesUI = renderResourcesUI;

window.selectCommandOperation = selectCommandOperation;

window.closeSelectedOperation = closeSelectedOperation;

window.updateCommandLocationUI = updateCommandLocationUI;
