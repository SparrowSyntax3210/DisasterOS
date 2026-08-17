"use strict";

// ==========================================================
// DISASTEROS COMMAND CENTER
// APPLICATION INITIALIZER
// ==========================================================

console.log("🚀 command-init.js loaded");

let commandCenterApplicationInitialized = false;

let commandCenterLocationReady = false;

// ==========================================================
// INITIALIZE AFTER LOCATION
// ==========================================================

async function startCommandCenterAfterLocation() {
  if (commandCenterLocationReady) {
    return;
  }

  const location =
    typeof window.getCommandCenterOperationalLocation === "function"
      ? window.getCommandCenterOperationalLocation()
      : null;

  const fallbackLocation =
    typeof window.getCommandCenterLocation === "function"
      ? window.getCommandCenterLocation()
      : null;

  const selected =
    location ||
    fallbackLocation ||
    CommandCenter.operationalLocation ||
    CommandCenter.location;

  if (!selected) {
    console.warn("[COMMAND CENTER] No operational location.");

    return;
  }

  const latitude = selected.latitude ?? selected.lat;

  const longitude = selected.longitude ?? selected.lng;

  if (
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    console.error("[COMMAND CENTER] Invalid operational coordinates.");

    return;
  }

  commandCenterLocationReady = true;

  console.log("==========================================");

  console.log("[COMMAND CENTER] LOCATION SELECTED");

  console.log("Name:", selected.name);

  console.log("Latitude:", latitude);

  console.log("Longitude:", longitude);

  console.log("==========================================");

  // --------------------------------------------------------
  // Show Command Center
  // --------------------------------------------------------

  const gate = document.getElementById("commandLocationGate");

  if (gate) {
    gate.style.display = "none";
  }

  const commandCenter = document.getElementById("commandCenter");

  if (commandCenter) {
    commandCenter.style.display = "";
  }

  // --------------------------------------------------------
  // Initialize map
  // --------------------------------------------------------

  try {
    if (typeof window.initializeCommandCenterMap === "function") {
      await window.initializeCommandCenterMap(
        Number(latitude),
        Number(longitude),
      );
    } else if (typeof window.initializeCommandMap === "function") {
      await window.initializeCommandMap(Number(latitude), Number(longitude));
    }
  } catch (error) {
    console.error("[COMMAND CENTER] Map initialization failed:", error);
  }

  // --------------------------------------------------------
  // Load location-specific data
  // --------------------------------------------------------

  try {
    if (typeof window.loadOperationalData === "function") {
      await window.loadOperationalData();
    } else if (typeof window.loadCompleteCommandCenterData === "function") {
      await window.loadCompleteCommandCenterData();
    } else if (typeof window.loadAllCommandCenterData === "function") {
      await window.loadAllCommandCenterData();
    }
  } catch (error) {
    console.error("[COMMAND CENTER] Data loading failed:", error);
  }

  // --------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------

  try {
    if (typeof window.updateCommandCenterDashboard === "function") {
      window.updateCommandCenterDashboard();
    }
  } catch (error) {
    console.error("[COMMAND CENTER] Dashboard update failed:", error);
  }

  // --------------------------------------------------------
  // Realtime
  // --------------------------------------------------------

  try {
    if (typeof window.waitForCommandRealtime === "function") {
      window.waitForCommandRealtime();
    } else if (typeof window.initializeCommandRealtime === "function") {
      window.initializeCommandRealtime();
    } else if (typeof window.initializeCommandCenterRealtime === "function") {
      window.initializeCommandCenterRealtime();
    }
  } catch (error) {
    console.error("[COMMAND CENTER] Realtime initialization failed:", error);
  }

  // --------------------------------------------------------
  // Location event
  // --------------------------------------------------------

  document.dispatchEvent(
    new CustomEvent("commandcenter:location-ready", {
      detail: {
        latitude: Number(latitude),

        longitude: Number(longitude),

        name: selected.name || "Operational Area",
      },
    }),
  );

  console.log("✅ Command Center operational.");
}

// ==========================================================
// LOCATION EVENT
// ==========================================================

document.addEventListener("commandcenter:location-selected", async (event) => {
  console.log("[COMMAND CENTER] Location event received.", event?.detail);

  await startCommandCenterAfterLocation();
});

// ==========================================================
// INITIAL APPLICATION
// ==========================================================

async function initializeCommandCenterApplication() {
  if (commandCenterApplicationInitialized) {
    return;
  }

  console.log("==========================================");

  console.log(" DISASTEROS COMMAND CENTER");

  console.log(" APPLICATION START");

  console.log("==========================================");

  // --------------------------------------------------------
  // Authentication
  // --------------------------------------------------------

  if (typeof window.protectDashboard !== "function") {
    console.error("[COMMAND CENTER] protectDashboard() unavailable.");

    return;
  }

  let user;

  try {
    user = await protectDashboard("command-center");
  } catch (error) {
    console.error("[COMMAND CENTER] Authentication failed:", error);

    return;
  }

  if (!user) {
    console.warn("[COMMAND CENTER] Authentication rejected.");

    return;
  }

  CommandCenter.user = user;

  if (typeof window.getAuthToken === "function") {
    CommandCenter.token = getAuthToken();
  }

  console.log("[COMMAND CENTER] Authenticated:", user);

  // --------------------------------------------------------
  // Location Gate
  // --------------------------------------------------------

  if (typeof window.initializeCommandCenterLocationGate !== "function") {
    console.error("[COMMAND CENTER] Location gate module unavailable.");

    return;
  }

  const ready = initializeCommandCenterLocationGate();

  if (!ready) {
    console.error("[COMMAND CENTER] Location gate failed.");

    return;
  }

  commandCenterApplicationInitialized = true;

  console.log("[COMMAND CENTER] Waiting for operational location...");

  // --------------------------------------------------------
  // Existing saved location
  // --------------------------------------------------------

  const existingLocation =
    typeof window.getCommandCenterOperationalLocation === "function"
      ? getCommandCenterOperationalLocation()
      : null;

  if (
    existingLocation &&
    (existingLocation.latitude !== undefined ||
      existingLocation.lat !== undefined)
  ) {
    console.log("[COMMAND CENTER] Existing location found.");

    await startCommandCenterAfterLocation();
  }
}

// ==========================================================
// DOM READY
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeCommandCenterApplication().catch((error) => {
    console.error("[COMMAND CENTER] Fatal initialization error:", error);
  });
});

// ==========================================================
// PUBLIC
// ==========================================================

window.initializeCommandCenterApplication = initializeCommandCenterApplication;

window.startCommandCenterAfterLocation = startCommandCenterAfterLocation;

console.log("✅ Command Center initialization ready.");
