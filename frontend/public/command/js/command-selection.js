"use strict";

console.log("🎯 Command Selection Loaded");

const CommandCenterSelection = (() => {
  let selected = {
    type: null,
    id: null,
    item: null,
  };

  function getId(item) {
    if (typeof window.commandEntityId === "function") {
      return window.commandEntityId(item);
    }

    return (
      item?._id ||
      item?.id ||
      item?.incidentId ||
      item?.sosId ||
      item?.missionId ||
      null
    );
  }

  function findItem(type, id, state) {
    const list = state?.[type];

    if (!Array.isArray(list)) {
      return null;
    }

    return list.find((item) => String(getId(item)) === String(id)) || null;
  }

  function select(type, id) {
    const state = CommandCenterData.getState();

    const item = findItem(type, id, state);

    if (!item) {
      console.warn("⚠️ Selection target not found:", type, id);

      return null;
    }

    selected = {
      type,
      id,
      item,
    };

    console.log("🎯 Command entity selected:", selected);

    focusMap(item);

    highlightElement(type, id);

    return item;
  }

  function focusMap(item) {
    if (!window.CommandCenterMap) {
      return;
    }

    const coordinates =
      typeof window.commandCoordinates === "function"
        ? window.commandCoordinates(item)
        : null;

    if (
      !coordinates ||
      !Number.isFinite(Number(coordinates.lat)) ||
      !Number.isFinite(Number(coordinates.lng))
    ) {
      return;
    }

    if (typeof window.CommandCenterMap.focusLocation === "function") {
      window.CommandCenterMap.focusLocation(
        Number(coordinates.lat),
        Number(coordinates.lng),
      );
    }
  }

  function highlightElement(type, id) {
    document.querySelectorAll("[data-id]").forEach((element) => {
      element.classList.remove("command-selected");
    });

    const selector = `[data-id="${CSS.escape(String(id))}"]`;

    document.querySelectorAll(selector).forEach((element) => {
      element.classList.add("command-selected");
    });
  }

  function clear() {
    selected = {
      type: null,
      id: null,
      item: null,
    };

    document.querySelectorAll(".command-selected").forEach((element) => {
      element.classList.remove("command-selected");
    });
  }

  function getSelected() {
    return selected;
  }

  function bindListClicks() {
    document.addEventListener("click", (event) => {
      const item = event.target.closest(
        ".incident-item, .mission-item, .sos-item",
      );

      if (!item) return;

      const id = item.dataset.id;

      if (!id) return;

      let type = null;

      if (item.classList.contains("incident-item")) {
        type = "incidents";
      }

      if (item.classList.contains("mission-item")) {
        type = "missions";
      }

      if (item.classList.contains("sos-item")) {
        type = "sos";
      }

      if (type) {
        select(type, id);
      }
    });
  }

  function initialize() {
    bindListClicks();

    console.log("✅ Command Selection Ready");
  }

  return {
    initialize,
    select,
    clear,
    getSelected,
  };
})();

window.CommandCenterSelection = CommandCenterSelection;

console.log("✅ Command Selection Engine Ready");
