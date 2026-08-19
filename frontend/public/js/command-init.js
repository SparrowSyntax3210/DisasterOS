"use strict";

console.log(
  "🚀 COMMAND CENTER APPLICATION START"
);

const CommandCenterInit = (() => {
  let started = false;

  async function start() {
    if (started) return;

    started = true;

    console.log(
      "🚀 Starting Command Center..."
    );

    try {
      // ---------------------------------------------
      // 1. Initialize location gate ONLY
      // ---------------------------------------------

      if (
        window.CommandCenterLocation
      ) {
        window.CommandCenterLocation.initialize();
      }

      // ---------------------------------------------
      // 2. Initialize realtime
      //
      // Socket connection itself is okay.
      // It does NOT load initial dashboard data.
      // ---------------------------------------------

      if (
        window.CommandCenterRealtime
      ) {
        window.CommandCenterRealtime.initialize();
      }

      // ---------------------------------------------
      // DO NOT LOAD DATA HERE.
      //
      // Data will be loaded by:
      //
      // CommandCenterLocation.activateLocation()
      //
      // after user selects a location.
      // ---------------------------------------------

      console.log(
        "========================================"
      );

      console.log(
        "⏳ COMMAND CENTER WAITING FOR LOCATION"
      );

      console.log(
        "========================================"
      );

    } catch (error) {
      console.error(
        "❌ Command Center startup failed:",
        error
      );
    }
  }

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        console.log(
          "[COMMAND CENTER] DOM READY"
        );

        start();
      },
      { once: true }
    );
  } else {
    start();
  }

  return {
    start,
  };
})();

window.CommandCenterInit =
  CommandCenterInit;

console.log(
  "✅ Command Init Ready"
);