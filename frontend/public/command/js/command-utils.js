"use strict";

console.log("🛠️ Command Utils Loaded");

/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeCommandHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   NUMBER
========================================================== */

function commandNumber(value, fallback = null) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/* ==========================================================
   ARRAY NORMALIZER
========================================================== */

function commandArray(response, keys = []) {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  return [];
}

/* ==========================================================
   ENTITY ID
========================================================== */

function commandEntityId(item) {
  if (!item) return null;

  const id =
    item._id ??
    item.id ??
    item.incidentId ??
    item.sosId ??
    item.missionId ??
    item.teamId ??
    item.resourceId ??
    item.userId ??
    item.deviceId;

  return id != null ? String(id) : null;
}

/* ==========================================================
   COORDINATES
========================================================== */

function commandCoordinates(item) {
  if (!item) {
    return {
      lat: null,
      lng: null,
    };
  }

  const properties = item.properties || {};
  const geometry = item.geometry?.coordinates;

  const lat = commandNumber(
    item.latitude ??
      item.lat ??
      item.location?.latitude ??
      item.location?.lat ??
      properties.latitude ??
      properties.lat ??
      geometry?.[1],
  );

  const lng = commandNumber(
    item.longitude ??
      item.lng ??
      item.lon ??
      item.location?.longitude ??
      item.location?.lng ??
      item.location?.lon ??
      properties.longitude ??
      properties.lng ??
      geometry?.[0],
  );

  return {
    lat,
    lng,
  };
}

/* ==========================================================
   STATUS
========================================================== */

function commandIsActive(item) {
  const status = String(item?.status || "")
    .trim()
    .toLowerCase();

  return ![
    "resolved",
    "closed",
    "completed",
    "cancelled",
    "canceled",
    "rejected",
  ].includes(status);
}

/* ==========================================================
   TYPE
========================================================== */

function commandItemType(item, fallback = "") {
  return String(
    item?.type ||
      item?.category ||
      item?.resourceType ||
      item?.incidentType ||
      fallback,
  )
    .trim()
    .toLowerCase();
}

/* ==========================================================
   PUBLIC
========================================================== */

window.escapeCommandHTML = escapeCommandHTML;
window.commandNumber = commandNumber;
window.commandArray = commandArray;
window.commandEntityId = commandEntityId;
window.commandCoordinates = commandCoordinates;
window.commandIsActive = commandIsActive;
window.commandItemType = commandItemType;

console.log("✅ Command Utils Ready");