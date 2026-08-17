"use strict";

// ==========================================================
// DISASTEROS COMMAND CENTER
// COMMAND DASHBOARD MODULE
// ==========================================================

console.log("✅ command-dashboard.js loaded");

// ==========================================================
// SAFE HELPERS
// ==========================================================

function dashboardArray(value) {
  return Array.isArray(value) ? value : [];
}

function dashboardStatus(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase();
}

function dashboardEntityID(item) {
  return (
    item?._id ||
    item?.id ||
    item?.incidentId ||
    item?.sosId ||
    item?.missionId ||
    item?.teamId ||
    item?.resourceId ||
    item?.deviceId ||
    null
  );
}

// ==========================================================
// GET DATA
// ==========================================================

function getDashboardData() {
  const data = CommandCenter.data || {};

  return {
    incidents: dashboardArray(data.incidents),

    sos: dashboardArray(data.sos),

    missions: dashboardArray(data.missions),

    teams: dashboardArray(data.teams),

    resources: dashboardArray(data.resources),

    fieldDevices: dashboardArray(data.fieldDevices),
  };
}

// ==========================================================
// ACTIVE COUNTS
// ==========================================================

function isActiveStatus(status) {
  return [
    "ACTIVE",
    "OPEN",
    "PENDING",
    "ASSIGNED",
    "IN_PROGRESS",
    "ONGOING",
    "RESPONDING",
    "DISPATCHED",
    "REPORTED",
  ].includes(dashboardStatus(status));
}

function countActive(items) {
  return items.filter((item) => isActiveStatus(item?.status)).length;
}

// ==========================================================
// UPDATE TEXT
// ==========================================================

function dashboardText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = value ?? 0;
}

// ==========================================================
// STATISTICS
// ==========================================================

function updateCommandDashboardStats() {
  const data = getDashboardData();

  const incidents = data.incidents.length;

  const sos = data.sos.length;

  const missions = data.missions.length;

  const teams = data.teams.length;

  const resources = data.resources.length;

  const activeIncidents = countActive(data.incidents);

  const activeSOS = countActive(data.sos);

  const activeMissions = countActive(data.missions);

  // HTML supplied by you
  dashboardText("incidentCount", incidents);

  dashboardText("sosCount", sos);

  dashboardText("missionCount", missions);

  dashboardText("teamCount", teams);

  dashboardText("resourceTeams", teams);

  dashboardText("resourceSupplies", resources);

  // --------------------------------------------------------
  // Risk
  // --------------------------------------------------------

  let risk = "LOW";

  if (activeIncidents > 10 || activeSOS > 10) {
    risk = "CRITICAL";
  } else if (activeIncidents > 5 || activeSOS > 5) {
    risk = "HIGH";
  } else if (activeIncidents > 0 || activeSOS > 0) {
    risk = "MEDIUM";
  }

  const riskScore = Math.min(
    100,
    activeIncidents * 5 + activeSOS * 8 + activeMissions * 2,
  );

  dashboardText("riskLevel", risk);

  dashboardText("riskScore", riskScore);

  // --------------------------------------------------------
  // Alert count
  // --------------------------------------------------------

  const alertCount = activeIncidents + activeSOS;

  dashboardText("alertCount", alertCount);

  renderAlerts(data.incidents, data.sos);

  updateSituationSummary(risk, incidents, sos, missions, teams);
}

// ==========================================================
// SITUATION SUMMARY
// ==========================================================

function updateSituationSummary(risk, incidents, sos, missions, teams) {
  const element = document.getElementById("situationSummary");

  if (!element) {
    return;
  }

  element.textContent =
    `${incidents} incidents, ` +
    `${sos} SOS requests, ` +
    `${missions} missions and ` +
    `${teams} responder teams ` +
    `currently monitored in this operational area.`;
}

// ==========================================================
// ALERTS
// ==========================================================

function renderAlerts(incidents, sos) {
  const container = document.getElementById("alertsList");

  if (!container) {
    return;
  }

  const alerts = [];

  incidents
    .filter((item) => isActiveStatus(item?.status))
    .forEach((incident) => {
      alerts.push({
        type: "INCIDENT",
        title: incident?.type || incident?.title || "Incident",
        severity: incident?.severity || "UNKNOWN",
      });
    });

  sos
    .filter((item) => isActiveStatus(item?.status))
    .forEach((request) => {
      alerts.push({
        type: "SOS",
        title: request?.type || "Emergency SOS",
        severity: request?.severity || "UNKNOWN",
      });
    });

  if (!alerts.length) {
    container.innerHTML = `<div class="empty-state">
        No active alerts
      </div>`;

    return;
  }

  container.innerHTML = alerts
    .slice(0, 10)
    .map(
      (alert) => `
          <div class="command-alert">
            <strong>
              ${escapeMapHTML(alert.type)}
            </strong>

            <span>
              ${escapeMapHTML(alert.title)}
            </span>

            <small>
              ${escapeMapHTML(alert.severity)}
            </small>
          </div>
        `,
    )
    .join("");
}

// ==========================================================
// HTML ESCAPE
// ==========================================================

function escapeDashboardHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Keep compatibility with existing map module
if (typeof window.escapeMapHTML !== "function") {
  window.escapeMapHTML = escapeDashboardHTML;
}

// ==========================================================
// REFRESH DASHBOARD
// ==========================================================

async function updateCommandCenterDashboard() {
  updateCommandDashboardStats();

  if (typeof window.renderCommandCenterMapData === "function") {
    try {
      window.renderCommandCenterMapData();
    } catch (error) {
      console.error("[DASHBOARD] Map render failed:", error);
    }
  }
}

// ==========================================================
// LOCATION CHANGE
// ==========================================================

document.addEventListener("commandcenter:location-selected", async () => {
  console.log("[DASHBOARD] Location selected.");

  await updateCommandCenterDashboard();
});

// ==========================================================
// DATA UPDATE
// ==========================================================

document.addEventListener("commandcenter:data-updated", () => {
  updateCommandCenterDashboard();
});

// ==========================================================
// PUBLIC API
// ==========================================================

window.updateCommandCenterDashboard = updateCommandCenterDashboard;

window.updateCommandDashboardStats = updateCommandDashboardStats;

window.getDashboardData = getDashboardData;

console.log("✅ Command dashboard module ready.");
