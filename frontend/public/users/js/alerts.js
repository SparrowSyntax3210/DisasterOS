// =========================================================
// DISASTEROS ALERTS
// Full incident + SOS alert view
// =========================================================

(function () {
  "use strict";

  let initialized = false;

  let incidents = [];
  let sosRequests = [];

  let activeFilter = "all";

  // =====================================================
  // API
  // =====================================================

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  // =====================================================
  // INIT
  // =====================================================

  function initAlertsOverlay() {
    console.log("🚨 Initializing DisasterOS Alerts...");

    if (!initialized) {
      initialized = true;

      bindControls();
    }

    // Always refresh when the overlay/page is opened
    loadAlerts();
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  function bindControls() {
    // -------------------------------------------------
    // ALERT FILTER TABS
    // -------------------------------------------------

    document.querySelectorAll(".alert-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document
          .querySelectorAll(".alert-tab")
          .forEach((item) => item.classList.remove("active"));

        this.classList.add("active");

        activeFilter = this.dataset.alertType || "all";

        console.log("🔎 Alert filter:", activeFilter);

        renderAlerts();
      });
    });

    // -------------------------------------------------
    // REFRESH
    // -------------------------------------------------

    const refresh = document.getElementById("alertsRefresh");

    if (refresh) {
      refresh.addEventListener("click", async () => {
        refresh.disabled = true;

        try {
          await loadAlerts();
        } finally {
          refresh.disabled = false;
        }
      });
    }
  }

  // =====================================================
  // LOAD ALL ALERTS
  // =====================================================

  async function loadAlerts() {
    console.log("🚨 Loading DisasterOS alerts...");

    showLoadingState();

    try {
      // =================================================
      // INCIDENTS
      // =================================================

      let incidentResponse;

      try {
        incidentResponse = await getIncidents();

        console.log("📦 Raw incident response:", incidentResponse);

        if (!incidentResponse || incidentResponse.success === false) {
          throw new Error(
            incidentResponse?.message || "Unable to load incidents",
          );
        }

        incidents = extractIncidents(incidentResponse);

        console.log(`⚠ Incidents loaded: ${incidents.length}`, incidents);
      } catch (incidentError) {
        console.warn("⚠ Incident loading failed:", incidentError);

        incidents = [];
      }

      // =================================================
      // SOS
      // =================================================

      try {
        const sosResponse = await fetch(`${getAPI()}/api/sos`, {
          method: "GET",
          credentials: "include",

          headers: {
            Accept: "application/json",
          },
        });

        const sosResult = await sosResponse.json();

        console.log("📦 Raw SOS response:", sosResult);

        if (!sosResponse.ok || sosResult.success === false) {
          throw new Error(
            sosResult?.message || `SOS API returned ${sosResponse.status}`,
          );
        }

        sosRequests = extractSOS(sosResult);

        console.log(
          `🆘 SOS requests loaded: ${sosRequests.length}`,
          sosRequests,
        );
      } catch (sosError) {
        console.warn("⚠ SOS loading failed:", sosError);

        sosRequests = [];
      }

      // =================================================
      // UPDATE UI
      // =================================================

      updateSummary();

      renderAlerts();

      // =================================================
      // GLOBAL DATA
      // =================================================

      window.disasterOSAlertsData = {
        incidents,
        sos: sosRequests,
      };

      window.dispatchEvent(
        new CustomEvent("disasterOSAlertsReady", {
          detail: {
            incidents,
            sos: sosRequests,
          },
        }),
      );

      console.log("📡 Alerts data ready");
    } catch (error) {
      console.error("❌ Alerts initialization error:", error);

      incidents = [];
      sosRequests = [];

      updateSummary();

      renderAlerts();
    }
  }

  // =====================================================
  // EXTRACT INCIDENTS
  // =====================================================

  function extractIncidents(response) {
    if (!response) {
      return [];
    }

    // ---------------------------------------------
    // response.data
    // ---------------------------------------------

    if (Array.isArray(response.data)) {
      return response.data;
    }

    // ---------------------------------------------
    // response.incidents
    // ---------------------------------------------

    if (Array.isArray(response.incidents)) {
      return response.incidents;
    }

    // ---------------------------------------------
    // response.data.incidents
    // ---------------------------------------------

    if (response.data && Array.isArray(response.data.incidents)) {
      return response.data.incidents;
    }

    // ---------------------------------------------
    // response.results
    // ---------------------------------------------

    if (Array.isArray(response.results)) {
      return response.results;
    }

    // ---------------------------------------------
    // response.data.results
    // ---------------------------------------------

    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }

    return [];
  }

  // =====================================================
  // EXTRACT SOS
  // =====================================================

  function extractSOS(response) {
    if (!response) {
      return [];
    }

    // ---------------------------------------------
    // response.data
    // ---------------------------------------------

    if (Array.isArray(response.data)) {
      return response.data;
    }

    // ---------------------------------------------
    // response.sos
    // ---------------------------------------------

    if (Array.isArray(response.sos)) {
      return response.sos;
    }

    // ---------------------------------------------
    // response.requests
    // ---------------------------------------------

    if (Array.isArray(response.requests)) {
      return response.requests;
    }

    // ---------------------------------------------
    // response.data.sos
    // ---------------------------------------------

    if (response.data && Array.isArray(response.data.sos)) {
      return response.data.sos;
    }

    // ---------------------------------------------
    // response.data.requests
    // ---------------------------------------------

    if (response.data && Array.isArray(response.data.requests)) {
      return response.data.requests;
    }

    // ---------------------------------------------
    // response.results
    // ---------------------------------------------

    if (Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  function updateSummary() {
    // -------------------------------------------------
    // INCIDENTS
    // -------------------------------------------------

    setText("incidentAlertCount", incidents.length);

    // -------------------------------------------------
    // SOS
    // -------------------------------------------------

    setText("sosAlertCount", sosRequests.length);

    // -------------------------------------------------
    // CRITICAL INCIDENTS
    // -------------------------------------------------

    const criticalIncidents = incidents.filter((incident) => {
      const severity = String(
        incident.severity || incident.priority || "",
      ).toUpperCase();

      return severity === "CRITICAL" || severity === "EXTREME";
    });

    // -------------------------------------------------
    // CRITICAL SOS
    // -------------------------------------------------

    const criticalSOS = sosRequests.filter((sos) => {
      const priority = String(sos.priority || sos.severity || "").toUpperCase();

      return priority === "CRITICAL" || priority === "EXTREME";
    });

    const criticalTotal = criticalIncidents.length + criticalSOS.length;

    setText("criticalAlertCount", criticalTotal);

    // -------------------------------------------------
    // TOTAL
    // -------------------------------------------------

    const totalAlerts = incidents.length + sosRequests.length;

    setText("navAlertCount", totalAlerts);

    setText("notificationBadge", totalAlerts);

    setText("alertCount", totalAlerts);

    console.log("📊 Alert summary:", {
      incidents: incidents.length,
      sos: sosRequests.length,
      critical: criticalTotal,
      total: totalAlerts,
    });
  }

  // =====================================================
  // RENDER ALERTS
  // =====================================================

  function renderAlerts() {
    const list = document.getElementById("alertsList");

    if (!list) {
      console.warn("⚠ alertsList element not found");

      return;
    }

    // =================================================
    // COMBINE DATA
    // =================================================

    let items = [];

    // -------------------------------------------------
    // INCIDENTS
    // -------------------------------------------------

    if (activeFilter === "all" || activeFilter === "incident") {
      incidents.forEach((incident) => {
        items.push({
          source: "incident",
          data: incident,
        });
      });
    }

    // -------------------------------------------------
    // SOS
    // -------------------------------------------------

    if (activeFilter === "all" || activeFilter === "sos") {
      sosRequests.forEach((sos) => {
        items.push({
          source: "sos",
          data: sos,
        });
      });
    }

    // =================================================
    // SORT NEWEST FIRST
    // =================================================

    items.sort((a, b) => {
      const dateA = getDateValue(
        a.data.createdAt || a.data.created_at || a.data.timestamp,
      );

      const dateB = getDateValue(
        b.data.createdAt || b.data.created_at || b.data.timestamp,
      );

      return dateB - dateA;
    });

    // =================================================
    // EMPTY
    // =================================================

    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state">

          <span>✓</span>

          <p>
            ${
              activeFilter === "incident"
                ? "No incidents reported"
                : activeFilter === "sos"
                  ? "No SOS requests"
                  : "No active alerts"
            }
          </p>

        </div>
      `;

      setText("alertResultCount", 0);

      return;
    }

    // =================================================
    // RESULT COUNT
    // =================================================

    setText("alertResultCount", items.length);

    // =================================================
    // CLEAR
    // =================================================

    list.innerHTML = "";

    // =================================================
    // RENDER
    // =================================================

    items.forEach((item) => {
      const element = createAlertElement(item);

      if (element) {
        list.appendChild(element);
      }
    });

    console.log(`📋 Rendered ${items.length} alerts`);
  }

  // =====================================================
  // CREATE ALERT ELEMENT
  // =====================================================

  function createAlertElement(item) {
    const data = item.data || {};

    const isSOS = item.source === "sos";

    const element = document.createElement("div");

    element.className = "full-alert-item";

    // =================================================
    // LEVEL
    // =================================================

    const level = String(
      isSOS
        ? data.priority || data.severity || "HIGH"
        : data.severity || data.priority || "MEDIUM",
    ).toUpperCase();

    // =================================================
    // ICON
    // =================================================

    let icon = "⚠";

    if (isSOS) {
      icon = "🆘";
    } else if (level === "CRITICAL" || level === "EXTREME") {
      icon = "🚨";
    } else if (level === "HIGH") {
      icon = "🔴";
    } else if (level === "MEDIUM") {
      icon = "🟠";
    } else if (level === "LOW") {
      icon = "🟢";
    }

    // =================================================
    // TITLE
    // =================================================

    const title = isSOS ? getSOSName(data) : getIncidentName(data);

    // =================================================
    // DESCRIPTION
    // =================================================

    const description =
      data.description ||
      data.message ||
      data.details ||
      (isSOS
        ? "Emergency SOS request received."
        : "Emergency incident reported.");

    // =================================================
    // STATUS
    // =================================================

    const status = String(
      data.status || (isSOS ? "ACTIVE" : "REPORTED"),
    ).toUpperCase();

    // =================================================
    // ID
    // =================================================

    const alertId = isSOS
      ? data.sosId || data.sosID || data.requestId || data._id || "SOS"
      : data.incidentId || data.incidentID || data._id || "INCIDENT";

    // =================================================
    // REPORTER
    // =================================================

    const reporter =
      data.reportedBy ||
      data.reporter ||
      data.user?.name ||
      data.user?.username ||
      data.createdBy ||
      "";

    // =================================================
    // LOCATION
    // =================================================

    const location = getAlertLocation(data);

    // =================================================
    // DATE
    // =================================================

    const date = data.createdAt || data.created_at || data.timestamp;

    // =================================================
    // BUILD META
    // =================================================

    const reporterHTML = reporter
      ? `
        <span>
          👤 ${escapeHTML(getPersonName(reporter))}
        </span>
      `
      : "";

    const locationHTML = location
      ? `
        <span>
          📍 ${escapeHTML(location)}
        </span>
      `
      : "";

    // =================================================
    // HTML
    // =================================================

    element.innerHTML = `
      <div class="full-alert-icon">
        ${icon}
      </div>

      <div class="full-alert-content">

        <div class="alert-header">

          <strong>
            ${escapeHTML(title)}
          </strong>

          <span
            class="alert-severity alert-${escapeHTML(level.toLowerCase())}"
          >
            ${escapeHTML(level)}
          </span>

        </div>

        <p>
          ${escapeHTML(description)}
        </p>

        <div class="alert-meta">

          <span>
            ${escapeHTML(alertId)}
          </span>

          <span>
            ${escapeHTML(status)}
          </span>

          ${reporterHTML}

          ${locationHTML}

          <time>
            ${escapeHTML(formatDate(date))}
          </time>

        </div>

      </div>
    `;

    // =================================================
    // CLICK
    // =================================================

    element.addEventListener("click", () => {
      console.log("🚨 Alert selected:", {
        source: item.source,
        data,
      });

      window.dispatchEvent(
        new CustomEvent("disasterOSAlertSelected", {
          detail: {
            source: item.source,
            data,
          },
        }),
      );
    });

    return element;
  }

  // =====================================================
  // INCIDENT NAME
  // =====================================================

  function getIncidentName(data) {
    return (
      data.type ||
      data.incidentType ||
      data.category ||
      data.title ||
      "INCIDENT"
    );
  }

  // =====================================================
  // SOS NAME
  // =====================================================

  function getSOSName(data) {
    return data.title || data.type || data.requestType || "SOS REQUEST";
  }

  // =====================================================
  // PERSON NAME
  // =====================================================

  function getPersonName(person) {
    if (!person) {
      return "";
    }

    if (typeof person === "string") {
      return person;
    }

    return (
      person.name ||
      person.username ||
      person.fullName ||
      person.email ||
      "Unknown"
    );
  }

  // =====================================================
  // LOCATION
  // =====================================================

  function getAlertLocation(data) {
    // ---------------------------------------------
    // Direct address
    // ---------------------------------------------

    if (data.address) {
      return data.address;
    }

    if (data.locationName) {
      return data.locationName;
    }

    if (data.location?.address) {
      return data.location.address;
    }

    if (data.location?.name) {
      return data.location.name;
    }

    // ---------------------------------------------
    // Coordinates
    // ---------------------------------------------

    const latitude =
      data.latitude ??
      data.lat ??
      data.location?.latitude ??
      data.location?.lat;

    const longitude =
      data.longitude ??
      data.lng ??
      data.lon ??
      data.location?.longitude ??
      data.location?.lng;

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      latitude !== null &&
      longitude !== null
    ) {
      return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
    }

    return "";
  }

  // =====================================================
  // DATE VALUE
  // =====================================================

  function getDateValue(date) {
    if (!date) {
      return 0;
    }

    const parsed = new Date(date);

    const time = parsed.getTime();

    return Number.isNaN(time) ? 0 : time;
  }

  // =====================================================
  // DATE FORMAT
  // =====================================================

  function formatDate(date) {
    if (!date) {
      return "Unknown time";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown time";
    }

    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =====================================================
  // LOADING
  // =====================================================

  function showLoadingState() {
    const list = document.getElementById("alertsList");

    if (!list) {
      return;
    }

    list.innerHTML = `
      <div class="loading-state">

        <span>⟳</span>

        <p>
          Loading alerts...
        </p>

      </div>
    `;
  }

  // =====================================================
  // SET TEXT
  // =====================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value);
    }
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );
  }

  // =====================================================
  // EXPOSE
  // =====================================================

  window.initAlertsOverlay = initAlertsOverlay;

  window.refreshAlerts = loadAlerts;

  window.DisasterOSAlerts = {
    refresh: loadAlerts,

    get incidents() {
      return incidents;
    },

    get sos() {
      return sosRequests;
    },

    get all() {
      return [
        ...incidents.map((incident) => ({
          source: "incident",
          data: incident,
        })),

        ...sosRequests.map((sos) => ({
          source: "sos",
          data: sos,
        })),
      ];
    },
  };

  console.log("✅ DisasterOS alerts.js loaded");

  // =====================================================
  // AUTO INITIALIZATION
  // =====================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAlertsOverlay();
    });
  } else {
    initAlertsOverlay();
  }
})();
