"use strict";

console.log("🚀 Command Center Init Loaded");

const CommandCenterInit = (() => {
  let initialized = false;

  function checkDependencies() {
    const dependencies = {
      CommandCenterData: window.CommandCenterData,

      CommandCenterLocation: window.CommandCenterLocation,

      CommandCenterMap: window.CommandCenterMap,

      CommandDashboard: window.CommandDashboard,

      CommandCenterUI: window.CommandCenterUI,
    };

    const missing = Object.entries(dependencies)
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length) {
      console.error("❌ Command Center dependencies missing:", missing);

      return false;
    }

    return true;
  }

  function initializeModules() {
    if (!checkDependencies()) {
      return false;
    }

    console.log("⚙️ Initializing Command Center modules...");

    // ======================================================
    // LOCATION GATE
    // ======================================================

    CommandCenterLocation.initialize();

    // ======================================================
    // ALERTS
    // ======================================================

    if (
      window.CommandCenterAlerts &&
      typeof window.CommandCenterAlerts.initialize === "function"
    ) {
      window.CommandCenterAlerts.initialize();
    }

    // ======================================================
    // SELECTION
    // ======================================================

    if (
      window.CommandCenterSelection &&
      typeof window.CommandCenterSelection.initialize === "function"
    ) {
      window.CommandCenterSelection.initialize();
    }

    // ======================================================
    // MISSIONS
    // ======================================================

    if (
      window.CommandCenterMissions &&
      typeof window.CommandCenterMissions.initialize === "function"
    ) {
      window.CommandCenterMissions.initialize();
    }

    // ======================================================
    // REALTIME
    // ======================================================

    if (
      window.CommandCenterRealtime &&
      typeof window.CommandCenterRealtime.initialize === "function"
    ) {
      window.CommandCenterRealtime.initialize();
    }

    console.log("✅ Command Center modules initialized.");

    return true;
  }

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    console.log("🚀 Starting DisasterOS Command Center...");

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          initializeModules();
        },
        {
          once: true,
        },
      );
    } else {
      initializeModules();
    }
  }

  return {
    initialize,
    initializeModules,
  };
})();

window.CommandCenterInit = CommandCenterInit;

CommandCenterInit.initialize();

console.log("✅ Command Center Init Ready");
