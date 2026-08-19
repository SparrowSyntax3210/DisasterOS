"use strict";

console.log("🎯 Create Mission Loaded");

let selectedCommandOperation =
  null;

/* ==========================================================
   SELECT OPERATION
========================================================== */

function selectCommandOperation(
  item,
  type,
) {
  selectedCommandOperation = {
    item,
    type,
  };

  const panel =
    document.getElementById(
      "selectedPanel",
    );

  if (!panel) return;

  panel.classList.remove(
    "hidden",
  );

  const title =
    item.title ||
    item.name ||
    item.subject ||
    item.type ||
    "Operation";

  const status =
    item.status ||
    "ACTIVE";

  const severity =
    item.severity ||
    item.priority ||
    "MEDIUM";

  const description =
    item.description ||
    item.message ||
    "No description available.";

  const location =
    item.address ||
    item.formatted ||
    item.area ||
    item.locationName ||
    "Operational Area";

  const typeElement =
    document.getElementById(
      "selectedType",
    );

  const titleElement =
    document.getElementById(
      "selectedTitle",
    );

  const statusElement =
    document.getElementById(
      "selectedStatus",
    );

  const severityElement =
    document.getElementById(
      "selectedSeverity",
    );

  const descriptionElement =
    document.getElementById(
      "selectedDescription",
    );

  const locationElement =
    document.getElementById(
      "selectedLocation",
    );

  if (typeElement)
    typeElement.textContent =
      type;

  if (titleElement)
    titleElement.textContent =
      title;

  if (statusElement)
    statusElement.textContent =
      status;

  if (severityElement)
    severityElement.textContent =
      severity;

  if (descriptionElement)
    descriptionElement.textContent =
      description;

  if (locationElement)
    locationElement.textContent =
      location;
}

/* ==========================================================
   CLOSE
========================================================== */

function closeSelectedOperation() {
  selectedCommandOperation =
    null;

  const panel =
    document.getElementById(
      "selectedPanel",
    );

  panel?.classList.add(
    "hidden",
  );
}

/* ==========================================================
   CREATE MISSION
========================================================== */

async function createMissionFromSelection() {
  if (
    !selectedCommandOperation
  ) {
    alert(
      "Select an operation first.",
    );

    return;
  }

  const item =
    selectedCommandOperation.item;

  const lat =
    Number(
      item.latitude ??
        item.lat ??
        item.location?.latitude ??
        item.location?.lat,
    );

  const lng =
    Number(
      item.longitude ??
        item.lng ??
        item.location?.longitude ??
        item.location?.lng,
    );

  const payload = {
    title:
      `Mission - ${
        item.title ||
        item.name ||
        item.type ||
        "Emergency"
      }`,

    description:
      item.description ||
      item.message ||
      "Emergency response mission",

    latitude: lat,
    longitude: lng,

    incidentId:
      item._id ||
      item.id ||
      item.incidentId ||
      null,

    priority:
      item.severity ||
      item.priority ||
      "HIGH",

    status: "PENDING",
  };

  try {
    console.log(
      "🎯 Creating mission:",
      payload,
    );

    const response =
      await window.commandApi.createMission(
        payload,
      );

    console.log(
      "✅ Mission created:",
      response,
    );

    closeSelectedOperation();

    await window.refreshCommandCenterData();

    alert(
      "Mission created successfully.",
    );
  } catch (error) {
    console.error(
      "❌ Mission creation failed:",
      error,
    );

    alert(
      error.message ||
        "Unable to create mission.",
    );
  }
}

/* ==========================================================
   EVENTS
========================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    document
      .getElementById(
        "closeSelected",
      )
      ?.addEventListener(
        "click",
        closeSelectedOperation,
      );

    document
      .getElementById(
        "createMissionBtn",
      )
      ?.addEventListener(
        "click",
        createMissionFromSelection,
      );
  },
);

/* ==========================================================
   EXPORT
========================================================== */

window.selectCommandOperation =
  selectCommandOperation;

window.closeSelectedOperation =
  closeSelectedOperation;

window.createMissionFromSelection =
  createMissionFromSelection;

console.log(
  "✅ Mission System Ready",
);