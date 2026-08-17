"use strict";

/* ==========================================================
   DISASTEROS COMMAND CENTER
   API / AUTHENTICATION HELPERS
   ========================================================== */

console.log("Command API Loaded");

/* ==========================================================
   API URL
   ========================================================== */

function commandApiUrl(path) {
  if (!path) {
    return COMMAND_API_BASE;
  }

  if (path.startsWith("http")) {
    return path;
  }

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return COMMAND_API_BASE + path;
}

/* ==========================================================
   AUTH TOKEN
   ========================================================== */

function getCommandAuthToken() {
  const possibleKeys = [
    "token",
    "authToken",
    "accessToken",
    "jwt",
    "userToken",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  return null;
}

/* ==========================================================
   AUTH HEADERS
   ========================================================== */

function getCommandAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getCommandAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* ==========================================================
   GENERIC REQUEST
   ========================================================== */

async function commandApiRequest(path, options = {}) {
  const url = commandApiUrl(path);

  const config = {
    ...options,

    headers: {
      ...getCommandAuthHeaders(),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/* ==========================================================
   GET
   ========================================================== */

async function commandApiGet(path, params = {}) {
  const url = new URL(commandApiUrl(path));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return commandApiRequest(url.toString(), {
    method: "GET",
  });
}

/* ==========================================================
   POST
   ========================================================== */

async function commandApiPost(path, body = {}) {
  return commandApiRequest(path, {
    method: "POST",

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PUT
   ========================================================== */

async function commandApiPut(path, body = {}) {
  return commandApiRequest(path, {
    method: "PUT",

    body: JSON.stringify(body),
  });
}

/* ==========================================================
   PATCH
   ========================================================== */

async function commandApiPatch(path, body = {}) {
  return commandApiRequest(path, {
    method: "PATCH",

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
   EXPORTS
   ========================================================== */

window.commandApiUrl = commandApiUrl;

window.getCommandAuthToken = getCommandAuthToken;

window.getCommandAuthHeaders = getCommandAuthHeaders;

window.commandApiRequest = commandApiRequest;

window.commandApiGet = commandApiGet;

window.commandApiPost = commandApiPost;

window.commandApiPut = commandApiPut;

window.commandApiPatch = commandApiPatch;

window.commandApiDelete = commandApiDelete;

console.log("✅ Command Center API initialized");
