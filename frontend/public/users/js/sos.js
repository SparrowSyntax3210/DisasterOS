// =========================================================
// DISASTEROS SOS
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
    // Existing global user
    if (window.currentUser) {
      return window.currentUser;
    }

    // Fallback to localStorage
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

  function initSOSOverlay() {
    console.log("🆘 Initializing DisasterOS SOS...");

    updateLocation();

    if (initialized) {
      return;
    }

    const form = document.getElementById("sosForm");

    if (!form) {
      console.warn("⚠ sosForm not found.");

      return;
    }

    initialized = true;

    form.addEventListener("submit", submitSOS);
  }

  // =====================================================
  // LOCATION
  // =====================================================

  function updateLocation() {
    const location = getLocation();

    const element = document.getElementById("sosLocation");

    if (!element) {
      return;
    }

    if (!location) {
      element.textContent = "Location unavailable";

      return;
    }

    const lat = Number(location.latitude);

    const lng = Number(location.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      element.textContent = "Location unavailable";

      return;
    }

    element.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    console.log("📍 SOS location:", lat, lng);
  }

  // =====================================================
  // SUBMIT SOS
  // =====================================================

  async function submitSOS(event) {
    event.preventDefault();

    const location = getLocation();

    // ===================================================
    // LOCATION VALIDATION
    // ===================================================

    if (!location) {
      showMessage("sosMessage", "Location is required for SOS.", "error");

      return;
    }

    const latitude = Number(location.latitude);

    const longitude = Number(location.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      showMessage("sosMessage", "Invalid location coordinates.", "error");

      return;
    }

    // ===================================================
    // FORM ELEMENTS
    // ===================================================

    const typeElement = document.getElementById("sosType");

    const priorityElement = document.getElementById("sosPriority");

    const descriptionElement = document.getElementById("sosDescription");

    const peopleElement = document.getElementById("sosPeopleCount");

    const submit = document.getElementById("sosSubmit");

    const type = typeElement?.value || "";

    const priority = priorityElement?.value || "";

    const description = descriptionElement?.value.trim() || "";

    const peopleCount = Number(peopleElement?.value) || 1;

    // ===================================================
    // VALIDATION
    // ===================================================

    if (!type) {
      showMessage("sosMessage", "Please select the emergency type.", "error");

      return;
    }

    if (!priority) {
      showMessage(
        "sosMessage",
        "Please select the emergency priority.",
        "error",
      );

      return;
    }

    if (peopleCount < 1) {
      showMessage("sosMessage", "People count must be at least 1.", "error");

      return;
    }

    // ===================================================
    // USER
    // ===================================================

    const user = getCurrentUser();

    const reporter = user?._id || user?.id || null;

    // ===================================================
    // PAYLOAD
    // ===================================================

    const payload = {
      reporter,

      latitude,

      longitude,

      type,

      priority,

      description,

      peopleCount,
    };

    console.log("🆘 Sending SOS:", payload);

    // ===================================================
    // SEND
    // ===================================================

    try {
      if (submit) {
        submit.disabled = true;

        submit.textContent = "Sending SOS...";
      }

      const response = await fetch(`${getAPI()}/api/sos`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log("📡 SOS API response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "SOS request failed.");
      }

      // =================================================
      // SUCCESS
      // =================================================

      const sos = result.data;

      console.log("🚨 SOS CREATED:", sos);

      const sosId = sos?.sosId || "Unknown";

      showMessage(
        "sosMessage",
        `SOS sent successfully. ID: ${sosId}`,
        "success",
      );

      // =================================================
      // STATUS
      // =================================================

      const status = document.getElementById("sosStatus");

      if (status) {
        status.textContent = "SOS REQUEST PENDING";
      }

      const statusMessage = document.getElementById("sosStatusMessage");

      if (statusMessage) {
        statusMessage.textContent = `Request ${sosId} has been sent to the response network.`;
      }

      // =================================================
      // RESET
      // =================================================

      const form = document.getElementById("sosForm");

      if (form) {
        form.reset();
      }

      // =================================================
      // LOCAL EVENT
      // =================================================

      /*
       * Other frontend modules can listen
       * for this event.
       */

      window.dispatchEvent(
        new CustomEvent("disasterOSSOSCreated", {
          detail: sos,
        }),
      );
    } catch (error) {
      console.error("❌ SOS Error:", error);

      showMessage(
        "sosMessage",
        error.message || "Unable to send SOS.",
        "error",
      );
    } finally {
      if (submit) {
        submit.disabled = false;

        submit.textContent = "🆘 SEND EMERGENCY SOS";
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
  // DASHBOARD READY
  // =====================================================

  window.addEventListener("disasterOSDataReady", () => {
    console.log("📡 Dashboard ready → updating SOS location");

    updateLocation();
  });

  // =====================================================
  // EXPOSE
  // =====================================================

  window.initSOSOverlay = initSOSOverlay;

  console.log("✅ DisasterOS sos.js loaded");

  // =====================================================
  // AUTO INIT
  // =====================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSOSOverlay();
    });
  } else {
    initSOSOverlay();
  }
})();
