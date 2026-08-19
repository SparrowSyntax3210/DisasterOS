"use strict";

console.log("🚀 Command API Loaded");

/* ==========================================================
   BASE URL
========================================================== */

function getCommandBaseURL() {
  let base =
    window.COMMAND_API_BASE ||
    window.COMMAND_API_URL ||
    "http://localhost:4000/api";

  base = String(base).trim();

  return base.replace(/\/+$/, "");
}

const COMMAND_API_BASE = getCommandBaseURL();

window.COMMAND_API_BASE = COMMAND_API_BASE;

console.log("🌐 API BASE:", COMMAND_API_BASE);

/* ==========================================================
   URL BUILDER
========================================================== */

function commandApiUrl(path = "") {
  if (!path) {
    return COMMAND_API_BASE;
  }

  path = String(path).trim();

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  path = path.replace(/^\/+/, "");

  if (path.startsWith("api/")) {
    path = path.substring(4);
  }

  return `${COMMAND_API_BASE}/${path}`;
}

/* ==========================================================
   AUTH TOKEN
========================================================== */

function getCommandAuthToken() {
  const keys = [
    "token",
    "authToken",
    "accessToken",
    "jwt",
    "userToken",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
}

/* ==========================================================
   HEADERS
========================================================== */

function getCommandAuthHeaders() {
  const headers = {
    Accept: "application/json",
  };

  const token = getCommandAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* ==========================================================
   REQUEST
========================================================== */

async function commandApiRequest(path, options = {}) {
  const url = commandApiUrl(path);

  console.log(
    `🌐 COMMAND API ${options.method || "GET"}:`,
    url,
  );

  const requestOptions = {
    method: options.method || "GET",

    /*
     * IMPORTANT:
     * Your backend uses Express sessions.
     * Without this, browser cookies won't be sent.
     */
    credentials: "include",

    ...options,

    headers: {
      ...getCommandAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, requestOptions);

    const contentType =
      response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        data = text || null;
      } catch {
        data = null;
      }
    }

    console.log("📥 API RESPONSE:", {
      url,
      status: response.status,
      ok: response.ok,
      data,
    });

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        data?.msg ||
        `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error("❌ COMMAND API REQUEST FAILED:", {
      url,
      error: error.message,
    });

    throw error;
  }
}

/* ==========================================================
   GET
========================================================== */

async function commandApiGet(path, params = {}) {
  let url = commandApiUrl(path);

  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  return commandApiRequest(url, {
    method: "GET",
  });
}

/* ==========================================================
   POST
========================================================== */

async function commandApiPost(path, body = {}) {
  return commandApiRequest(path, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PUT
========================================================== */

async function commandApiPut(path, body = {}) {
  return commandApiRequest(path, {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PATCH
========================================================== */

async function commandApiPatch(path, body = {}) {
  return commandApiRequest(path, {
    method: "PATCH",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   DELETE
========================================================== */

async function commandApiDelete(path) {
  return commandApiRequest(path, {
    method: "DELETE",
  });
}

/* ==========================================================
   LOCATION
========================================================== */

function getCommandLocationParams() {
  const location =
    window.CommandCenterLocation?.getLocation?.();

  if (!location) {
    return {};
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return {};
  }

  return {
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  };
}

/* ==========================================================
   API METHODS
========================================================== */

const commandApi = {
  getIncidents() {
    return commandApiGet("/incidents", getCommandLocationParams());
  },

  getSOS() {
    return commandApiGet("/sos", getCommandLocationParams());
  },

  getMissions() {
    return commandApiGet("/missions", getCommandLocationParams());
  },

  getTeams() {
    return commandApiGet("/teams", getCommandLocationParams());
  },

  getResources() {
    return commandApiGet("/resources", getCommandLocationParams());
  },

  getReports() {
    return commandApiGet("/reports", getCommandLocationParams());
  },

  getField() {
    return commandApiGet("/field", getCommandLocationParams());
  },

  getUsers() {
    return commandApiGet("/users", getCommandLocationParams());
  },

  getPredictions() {
    return commandApiGet(
      "/predictions",
      getCommandLocationParams(),
    );
  },

  geocode(place) {
    return commandApiGet("/map/geocode", {
      place,
    });
  },

  reverseGeocode(lat, lng) {
    return commandApiGet("/map/geocode", {
      lat,
      lng,
    });
  },

  createMission(data) {
    return commandApiPost("/missions", data);
  },

  getMission(id) {
    return commandApiGet(`/missions/${id}`);
  },

  updateMission(id, data) {
    return commandApiPut(`/missions/${id}`, data);
  },

  deleteMission(id) {
    return commandApiDelete(`/missions/${id}`);
  },
};

/* ==========================================================
   EXPORT
========================================================== */

window.commandApiUrl = commandApiUrl;
window.commandApiRequest = commandApiRequest;
window.commandApiGet = commandApiGet;
window.commandApiPost = commandApiPost;
window.commandApiPut = commandApiPut;
window.commandApiPatch = commandApiPatch;
window.commandApiDelete = commandApiDelete;

window.getCommandAuthToken = getCommandAuthToken;
window.getCommandAuthHeaders = getCommandAuthHeaders;

window.commandApi = commandApi;

console.log("✅ commandApi ready");