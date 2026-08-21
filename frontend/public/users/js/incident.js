// =========================================================
// DISASTEROS INCIDENT REPORTING
// =========================================================

(function () {
  let initialized = false;

  // =====================================================
  // API
  // =====================================================

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  // =====================================================
  // DASHBOARD LOCATION
  // =====================================================

  function getLocation() {
    const dashboard = window.DisasterOSDashboard;

    if (!dashboard) {
      return null;
    }

    return dashboard.location || null;
  }

  // =====================================================
  // CURRENT USER
  // =====================================================

  function getCurrentUser() {
    /*
     * First try your existing global user.
     */

    if (window.currentUser) {
      return window.currentUser;
    }

    /*
     * Then try localStorage.
     */

    const possibleKeys = ["user", "authUser", "currentUser", "loggedInUser"];

    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      try {
        return JSON.parse(stored);
      } catch {
        continue;
      }
    }

    return null;
  }

  // =====================================================
  // INIT
  // =====================================================

  function initIncidentOverlay() {
    console.log("🚨 Initializing Incident Reporting...");

    const form = document.getElementById("incidentForm");

    if (!form) {
      console.warn("⚠ incidentForm not found.");

      return;
    }

    if (!initialized) {
      initialized = true;

      form.addEventListener("submit", submitIncident);
    }

    updateLocation();
  }

  // =====================================================
  // LOCATION
  // =====================================================

  function updateLocation() {
    const location = getLocation();

    const lat = document.getElementById("incidentLatitude");

    const lng = document.getElementById("incidentLongitude");

    if (!location) {
      console.warn("⚠ Dashboard location unavailable.");

      if (lat) {
        lat.value = "";
      }

      if (lng) {
        lng.value = "";
      }

      return;
    }

    if (
      location.latitude === null ||
      location.longitude === null ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      return;
    }

    if (lat) {
      lat.value = location.latitude;
    }

    if (lng) {
      lng.value = location.longitude;
    }

    console.log("📍 Incident location:", location.latitude, location.longitude);
  }

  // =====================================================
  // GENERATE INCIDENT ID
  // =====================================================

  function generateIncidentId() {
    const timestamp = Date.now();

    const random = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `INC-${timestamp}-${random}`;
  }

  // =====================================================
  // SUBMIT INCIDENT
  // =====================================================

  async function submitIncident(event) {
    event.preventDefault();

    const form = event.target;

    // ===================================================
    // LOCATION
    // ===================================================

    const location = getLocation();

    if (!location) {
      showMessage(
        "incidentMessage",
        "Your location is unavailable. Please enable location access and try again.",
        "error",
      );

      return;
    }

    const latitude = Number(location.latitude);

    const longitude = Number(location.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      showMessage("incidentMessage", "Invalid location coordinates.", "error");

      return;
    }

    // ===================================================
    // FORM VALUES
    // ===================================================

    const incidentIdElement = document.getElementById("incidentId");

    const typeElement = document.getElementById("incidentType");

    const descriptionElement = document.getElementById("incidentDescription");

    const severityElement = document.getElementById("incidentSeverity");

    const peopleAffectedElement = document.getElementById("peopleAffected");

    const submitButton = document.getElementById("incidentSubmit");

    const incidentId = incidentIdElement?.value.trim() || generateIncidentId();

    const type = typeElement?.value || "";

    const description = descriptionElement?.value.trim() || "";

    const severity = severityElement?.value || "";

    const peopleAffected = Number(peopleAffectedElement?.value) || 0;

    // ===================================================
    // VALIDATION
    // ===================================================

    if (!type) {
      showMessage(
        "incidentMessage",
        "Please select an incident type.",
        "error",
      );

      return;
    }

    if (!severity) {
      showMessage(
        "incidentMessage",
        "Please select the incident severity.",
        "error",
      );

      return;
    }

    // ===================================================
    // REQUIRED RESOURCES
    // ===================================================

    const resources = [
      ...form.querySelectorAll('input[name="requiredResources"]:checked'),
    ].map((checkbox) => checkbox.value);

    // ===================================================
    // USER
    // ===================================================

    const user = getCurrentUser();

    const reportedBy = user?._id || user?.id || null;

    // ===================================================
    // PAYLOAD
    // ===================================================

    const payload = {
      incidentId,

      type,

      description,

      latitude,

      longitude,

      severity,

      peopleAffected,

      reportedBy,

      requiredResources: resources,
    };

    console.log("🚨 Reporting incident:", payload);

    // ===================================================
    // SUBMIT
    // ===================================================

    try {
      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent = "Submitting...";
      }

      const response = await fetch(`${getAPI()}/api/incidents`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log("📡 Incident API response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to report incident.");
      }

      // =================================================
      // SUCCESS
      // =================================================

      console.log("✅ Incident created:", result.data);

      showMessage(
        "incidentMessage",
        `Incident ${incidentId} reported successfully.`,
        "success",
      );

      // =================================================
      // RESET FORM
      // =================================================

      form.reset();

      /*
       * Restore the automatically detected
       * location after reset.
       */

      updateLocation();

      // =================================================
      // NOTIFY OTHER DISASTEROS COMPONENTS
      // =================================================

      window.dispatchEvent(
        new CustomEvent("disasterOSIncidentCreated", {
          detail: result.data,
        }),
      );

      /*
       * If another component is listening for
       * incident updates, it can immediately
       * refresh itself.
       */
    } catch (error) {
      console.error("❌ Incident Error:", error);

      showMessage(
        "incidentMessage",
        error.message || "Unable to report incident.",
        "error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent = "Submit Incident Report";
      }
    }
  }

  // =====================================================
  // MESSAGE
  // =====================================================

  function showMessage(id, message, type) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = message;

    element.style.color =
      type === "success" ? "var(--accent)" : "var(--danger)";
  }

  // =====================================================
  // DASHBOARD READY EVENT
  // =====================================================

  window.addEventListener("disasterOSDataReady", () => {
    console.log("📡 Dashboard ready → updating incident location");

    updateLocation();
  });

  // =====================================================
  // EXPOSE
  // =====================================================

  window.initIncidentOverlay = initIncidentOverlay;

  console.log("✅ DisasterOS incident.js loaded");

  // =====================================================
  // AUTO INIT
  // =====================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initIncidentOverlay();
    });
  } else {
    initIncidentOverlay();
  }
})();
