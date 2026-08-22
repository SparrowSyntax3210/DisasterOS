"use strict";

console.log("🎚️ Command Center Layers Loaded");

/* ==========================================================
   COMMAND CENTER MAP LAYERS
========================================================== */

const CommandCenterLayers = (() => {
  let initialized = false;

  /* ========================================================
     GET CHECKBOXES
  ======================================================== */

  function getCheckboxes() {
    return document.querySelectorAll(".layer-option input[data-layer]");
  }

  /* ========================================================
     APPLY LAYER VISIBILITY
  ======================================================== */

  function applyLayerVisibility(layer, visible) {
    if (
      !window.CommandCenterMap ||
      typeof window.CommandCenterMap.setLayerVisibility !== "function"
    ) {
      console.warn("⚠️ Command map is not ready for layer:", layer);

      return;
    }

    window.CommandCenterMap.setLayerVisibility(layer, Boolean(visible));
  }

  /* ========================================================
     UPDATE VISUAL STATE
  ======================================================== */

  function updateCheckboxVisualState(checkbox) {
    if (!checkbox) return;

    const container = checkbox.closest(".layer-option");

    if (!container) return;

    container.classList.toggle("layer-disabled", !checkbox.checked);
  }

  /* ========================================================
     SETUP CONTROLS
  ======================================================== */

  function setupLayerControls() {
    if (initialized) {
      return;
    }

    const checkboxes = getCheckboxes();

    if (!checkboxes.length) {
      console.warn("⚠️ No command map layer checkboxes found.");

      return;
    }

    initialized = true;

    checkboxes.forEach((checkbox) => {
      const layer = checkbox.dataset.layer;

      if (!layer) {
        return;
      }

      /* --------------------------------------------------
           INITIAL VISUAL STATE
        -------------------------------------------------- */

      updateCheckboxVisualState(checkbox);

      /* --------------------------------------------------
           INITIAL MAP STATE
        -------------------------------------------------- */

      applyLayerVisibility(layer, checkbox.checked);

      /* --------------------------------------------------
           CHANGE EVENT
        -------------------------------------------------- */

      checkbox.addEventListener("change", () => {
        const visible = checkbox.checked;

        console.log(
          `🎚️ Command layer ${layer}:`,
          visible ? "VISIBLE" : "HIDDEN",
        );

        applyLayerVisibility(layer, visible);

        updateCheckboxVisualState(checkbox);
      });
    });

    console.log("✅ Map layer controls connected:", checkboxes.length);
  }

  /* ========================================================
     REFRESH CONTROLS
     
     Useful after dynamic UI rendering.
  ======================================================== */

  function refresh() {
    const checkboxes = getCheckboxes();

    checkboxes.forEach((checkbox) => {
      updateCheckboxVisualState(checkbox);

      applyLayerVisibility(checkbox.dataset.layer, checkbox.checked);
    });
  }

  /* ========================================================
     SET LAYER
     
     Allows other Command Center modules to control
     layers programmatically.
  ======================================================== */

  function setLayer(layer, visible) {
    const checkbox = document.querySelector(
      `.layer-option input[data-layer="${layer}"]`,
    );

    if (checkbox) {
      checkbox.checked = Boolean(visible);

      updateCheckboxVisualState(checkbox);
    }

    applyLayerVisibility(layer, visible);
  }

  /* ========================================================
     GET LAYER STATE
  ======================================================== */

  function getLayerState() {
    const state = {};

    getCheckboxes().forEach((checkbox) => {
      if (checkbox.dataset.layer) {
        state[checkbox.dataset.layer] = checkbox.checked;
      }
    });

    return state;
  }

  /* ========================================================
     GLOBAL COMPATIBILITY
  ======================================================== */

  window.setCommandMapLayerVisibility = function (layer, visible) {
    setLayer(layer, visible);
  };

  /* ========================================================
     PUBLIC API
  ======================================================== */

  window.CommandCenterLayers = {
    initialize: setupLayerControls,

    refresh,

    setLayer,

    getLayerState,
  };

  /* ========================================================
     INITIALIZE
  ======================================================== */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLayerControls);
  } else {
    setupLayerControls();
  }
})();

console.log("✅ Command Center Layer Controller Ready");
