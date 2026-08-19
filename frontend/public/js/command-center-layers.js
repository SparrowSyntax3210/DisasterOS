"use strict";

console.log("🎚️ Command Center Layers Loaded");

document.addEventListener(
  "DOMContentLoaded",
  () => {
    document
      .querySelectorAll(
        ".layer-option input[data-layer]",
      )
      .forEach((checkbox) => {
        checkbox.addEventListener(
          "change",
          () => {
            const layer =
              checkbox.dataset.layer;

            window.setCommandMapLayerVisibility(
              layer,
              checkbox.checked,
            );
          },
        );
      });
  },
);

console.log(
  "✅ Command Layer Controls Ready",
);