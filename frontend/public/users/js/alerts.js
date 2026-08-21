// =========================================================
// DISASTEROS ALERTS
// =========================================================

(function () {
  let initialized = false;

  let incidents = [];
  let sosRequests = [];

  let activeFilter = "all";

  // =====================================================
  // INIT
  // =====================================================

  function initAlertsOverlay() {
    if (!initialized) {
      initialized = true;

      // -------------------------------------------------
      // FILTER TABS
      // -------------------------------------------------

      document.querySelectorAll(".alert-tab").forEach((tab) => {
        tab.addEventListener("click", function () {
          document
            .querySelectorAll(".alert-tab")
            .forEach((item) => item.classList.remove("active"));

          this.classList.add("active");

          activeFilter = this.dataset.alertType || "all";

          renderAlerts();
        });
      });

      // -------------------------------------------------
      // REFRESH
      // -------------------------------------------------

      const refresh = document.getElementById("alertsRefresh");

      if (refresh) {
        refresh.addEventListener("click", loadAlerts);
      }
    }

    // Always load fresh data when opening Alerts
    loadAlerts();
  }

  // =====================================================
  // LOAD ALERTS
  // =====================================================

  async function loadAlerts() {
    try {
      console.log("🚨 Loading alerts...");

      // -------------------------------------------------
      // INCIDENTS
      // Uses the SAME working helper as dashboard.js
      // -------------------------------------------------

      const incidentResponse = await getIncidents();

      if (!incidentResponse.success) {
        throw new Error(incidentResponse.message || "Unable to load incidents");
      }

      incidents = Array.isArray(incidentResponse.data)
        ? incidentResponse.data
        : [];

      console.log("⚠ Incidents:", incidents);

      // -------------------------------------------------
      // SOS
      // -------------------------------------------------

      const sosResponse = await fetch(
        `${window.API || "http://localhost:4000"}/api/sos`,
        {
          credentials: "include",
        },
      );

      const sosResult = await sosResponse.json();

      if (!sosResponse.ok || !sosResult.success) {
        throw new Error(sosResult.message || "Unable to load SOS requests");
      }

      sosRequests = Array.isArray(sosResult.data) ? sosResult.data : [];

      console.log("🆘 SOS:", sosRequests);

      // -------------------------------------------------
      // UPDATE UI
      // -------------------------------------------------

      updateSummary();

      renderAlerts();
    } catch (error) {
      console.error("❌ Alerts Error:", error);

      incidents = [];
      sosRequests = [];

      updateSummary();
      renderAlerts();
    }
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  function updateSummary() {
    // -------------------------------------------------
    // INCIDENT COUNT
    // -------------------------------------------------

    setText("incidentAlertCount", incidents.length);

    // -------------------------------------------------
    // SOS COUNT
    // -------------------------------------------------

    setText("sosAlertCount", sosRequests.length);

    // -------------------------------------------------
    // CRITICAL INCIDENTS
    // -------------------------------------------------

    const criticalIncidents = incidents.filter(
      (item) => String(item.severity || "").toUpperCase() === "CRITICAL",
    );

    // -------------------------------------------------
    // CRITICAL SOS
    // -------------------------------------------------

    const criticalSOS = sosRequests.filter(
      (item) => String(item.priority || "").toUpperCase() === "CRITICAL",
    );

    const criticalTotal = criticalIncidents.length + criticalSOS.length;

    setText("criticalAlertCount", criticalTotal);

    // -------------------------------------------------
    // TOTAL ALERTS
    // -------------------------------------------------

    const totalAlerts = incidents.length + sosRequests.length;

    setText("navAlertCount", totalAlerts);
    setText("notificationBadge", totalAlerts);
    setText("alertCount", totalAlerts);
  }

  // =====================================================
  // RENDER ALERTS
  // =====================================================

  function renderAlerts() {
    const list = document.getElementById("alertsList");

    if (!list) {
      return;
    }

    let items = [];

    // -------------------------------------------------
    // INCIDENTS
    // -------------------------------------------------

    if (activeFilter === "all" || activeFilter === "incident") {
      items = items.concat(
        incidents.map((incident) => ({
          source: "incident",
          data: incident,
        })),
      );
    }

    // -------------------------------------------------
    // SOS
    // -------------------------------------------------

    if (activeFilter === "all" || activeFilter === "sos") {
      items = items.concat(
        sosRequests.map((sos) => ({
          source: "sos",
          data: sos,
        })),
      );
    }

    // -------------------------------------------------
    // SORT NEWEST FIRST
    // -------------------------------------------------

    items.sort((a, b) => {
      return new Date(b.data.createdAt || 0) - new Date(a.data.createdAt || 0);
    });

    // -------------------------------------------------
    // EMPTY STATE
    // -------------------------------------------------

    if (!items.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span>✓</span>

          <p>
            No active alerts
          </p>
        </div>
      `;

      return;
    }

    // -------------------------------------------------
    // CLEAR LIST
    // -------------------------------------------------

    list.innerHTML = "";

    // -------------------------------------------------
    // RENDER
    // -------------------------------------------------

    items.forEach((item) => {
      const data = item.data;

      const element = document.createElement("div");

      element.className = "full-alert-item";

      const isSOS = item.source === "sos";

      // -------------------------------------------------
      // SEVERITY / PRIORITY
      // -------------------------------------------------

      const level = String(
        isSOS ? data.priority : data.severity || "MEDIUM",
      ).toUpperCase();

      let icon = "⚠";

      if (isSOS) {
        icon = "🆘";
      } else if (level === "CRITICAL" || level === "HIGH") {
        icon = "🚨";
      }

      // -------------------------------------------------
      // TITLE
      // -------------------------------------------------

      const title = isSOS ? "SOS REQUEST" : data.type || "INCIDENT";

      // -------------------------------------------------
      // DESCRIPTION
      // -------------------------------------------------

      const description =
        data.description ||
        (isSOS
          ? "Emergency SOS request received."
          : "No description available.");

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      const status = data.status || "ACTIVE";

      // -------------------------------------------------
      // ID
      // -------------------------------------------------

      const alertId = isSOS
        ? data.sosId || data._id || "SOS"
        : data.incidentId || data._id || "INCIDENT";

      element.innerHTML = `
        <div class="full-alert-icon">
          ${icon}
        </div>

        <div class="full-alert-content">

          <div class="alert-header">

            <strong>
              ${escapeHTML(title)}
            </strong>

            <span class="alert-severity alert-${level.toLowerCase()}">
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

            <time>
              ${formatDate(data.createdAt)}
            </time>

          </div>

        </div>
      `;

      list.appendChild(element);
    });
  }

  // =====================================================
  // SET TEXT
  // =====================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  // =====================================================
  // DATE
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

  window.DisasterOSAlerts = {
    refresh: loadAlerts,

    get incidents() {
      return incidents;
    },

    get sos() {
      return sosRequests;
    },
  };

  console.log("✅ DisasterOS alerts.js loaded");
})();
