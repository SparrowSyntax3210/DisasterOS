"use strict";

/* ==========================================================
   DISASTEROS COMMAND CENTER
   UTILITY FUNCTIONS
   ========================================================== */

console.log("Command Utils Loaded");

/* ==========================================================
   SAFE VALUE
   ========================================================== */

function commandValue(value, fallback = "--") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value;
}

/* ==========================================================
   NUMBER
   ========================================================== */

function commandNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/* ==========================================================
   COORDINATES
   ========================================================== */

function getCommandLatitude(item) {
  if (!item) {
    return null;
  }

  const value =
    item.latitude ??
    item.lat ??
    item.location?.latitude ??
    item.location?.lat ??
    item.coordinates?.latitude ??
    item.coordinates?.lat;

  const latitude = Number(value);

  return Number.isFinite(latitude) ? latitude : null;
}

function getCommandLongitude(item) {
  if (!item) {
    return null;
  }

  const value =
    item.longitude ??
    item.lng ??
    item.lon ??
    item.location?.longitude ??
    item.location?.lng ??
    item.location?.lon ??
    item.coordinates?.longitude ??
    item.coordinates?.lng ??
    item.coordinates?.lon;

  const longitude = Number(value);

  return Number.isFinite(longitude) ? longitude : null;
}

function hasCommandCoordinates(item) {
  return (
    getCommandLatitude(item) !== null && getCommandLongitude(item) !== null
  );
}

/* ==========================================================
   ID
   ========================================================== */

function getCommandId(item) {
  if (!item) {
    return null;
  }

  return (
    item._id ??
    item.id ??
    item.ID ??
    item.incidentId ??
    item.missionId ??
    item.teamId ??
    item.userId ??
    null
  );
}

/* ==========================================================
   ARRAY NORMALIZATION
   ========================================================== */

function ensureCommandArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && Array.isArray(value.data)) {
    return value.data;
  }

  if (value && Array.isArray(value.results)) {
    return value.results;
  }

  if (value && Array.isArray(value.items)) {
    return value.items;
  }

  if (value && Array.isArray(value.records)) {
    return value.records;
  }

  return [];
}

/* ==========================================================
   HTML ESCAPE
   ========================================================== */

function escapeCommandHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   DATE
   ========================================================== */

function formatCommandDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("en-IN");
}

/* ==========================================================
   TIME
   ========================================================== */

function formatCommandTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ==========================================================
   DATE + TIME
   ========================================================== */

function formatCommandDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-IN");
}

/* ==========================================================
   TIME AGO
   ========================================================== */

function commandTimeAgo(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

/* ==========================================================
   STATUS NORMALIZATION
   ========================================================== */

function normalizeCommandStatus(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/* ==========================================================
   SEVERITY
   ========================================================== */

function normalizeCommandSeverity(value) {
  const severity = String(value ?? "")
    .trim()
    .toUpperCase();

  if (["CRITICAL", "EXTREME"].includes(severity)) {
    return "CRITICAL";
  }

  if (severity === "HIGH") {
    return "HIGH";
  }

  if (severity === "MEDIUM" || severity === "MODERATE") {
    return "MEDIUM";
  }

  return "LOW";
}

/* ==========================================================
   COLLECTION UPSERT
   ========================================================== */

function upsertCommandItem(collection, item) {
  if (!Array.isArray(collection)) {
    return collection;
  }

  const id = getCommandId(item);

  if (!id) {
    collection.push(item);
    return collection;
  }

  const index = collection.findIndex(
    (existing) => String(getCommandId(existing)) === String(id),
  );

  if (index === -1) {
    collection.push(item);
  } else {
    collection[index] = {
      ...collection[index],
      ...item,
    };
  }

  return collection;
}

/* ==========================================================
   REMOVE BY ID
   ========================================================== */

function removeCommandItem(collection, id) {
  if (!Array.isArray(collection)) {
    return collection;
  }

  return collection.filter((item) => String(getCommandId(item)) !== String(id));
}

/* ==========================================================
   EXPORTS
   ========================================================== */

window.commandValue = commandValue;

window.commandNumber = commandNumber;

window.getCommandLatitude = getCommandLatitude;

window.getCommandLongitude = getCommandLongitude;

window.hasCommandCoordinates = hasCommandCoordinates;

window.getCommandId = getCommandId;

window.ensureCommandArray = ensureCommandArray;

window.escapeCommandHtml = escapeCommandHtml;

window.formatCommandDate = formatCommandDate;

window.formatCommandTime = formatCommandTime;

window.formatCommandDateTime = formatCommandDateTime;

window.commandTimeAgo = commandTimeAgo;

window.normalizeCommandStatus = normalizeCommandStatus;

window.normalizeCommandSeverity = normalizeCommandSeverity;

window.upsertCommandItem = upsertCommandItem;

window.removeCommandItem = removeCommandItem;

console.log("✅ Command Center utilities initialized");
