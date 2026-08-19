"use strict";

console.log("🎚️ Command Center Layers Loaded");

(() => {

  function setupLayerControls() {

    const checkboxes =
      document.querySelectorAll(
        ".layer-option input[data-layer]"
      );

    if (!checkboxes.length) {
      console.warn(
        "⚠️ No command map layer checkboxes found."
      );
      return;
    }

    checkboxes.forEach(checkbox => {

      const layer =
        checkbox.dataset.layer;

      // Initial state
      if (
        window.CommandCenterMap &&
        typeof window.CommandCenterMap
          .setLayerVisibility === "function"
      ) {

        window.CommandCenterMap
          .setLayerVisibility(
            layer,
            checkbox.checked
          );
      }

      checkbox.addEventListener(
        "change",
        () => {

          const visible =
            checkbox.checked;

          console.log(
            `🎚️ ${layer}:`,
            visible
              ? "ON"
              : "OFF"
          );

          if (
            window.CommandCenterMap &&
            typeof window.CommandCenterMap
              .setLayerVisibility === "function"
          ) {

            window.CommandCenterMap
              .setLayerVisibility(
                layer,
                visible
              );
          }

          checkbox
            .closest(".layer-option")
            ?.classList.toggle(
              "layer-disabled",
              !visible
            );
        }
      );
    });

    console.log(
      "✅ Map layer controls connected:",
      checkboxes.length
    );
  }

  // Global compatibility function.
  window.setCommandMapLayerVisibility =
    function(layer, visible) {

      if (
        window.CommandCenterMap &&
        typeof window.CommandCenterMap
          .setLayerVisibility === "function"
      ) {

        window.CommandCenterMap
          .setLayerVisibility(
            layer,
            visible
          );
      }
    };

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      setupLayerControls
    );

  } else {

    setupLayerControls();
  }

})();