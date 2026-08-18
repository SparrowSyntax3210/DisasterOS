// ==========================================================
// DISASTEROS COMMAND CENTER
// LOCATION GATE / LOCATION SELECTION
// ==========================================================

console.log("Command Center Location JS Loaded");

// ==========================================================
// API
// ==========================================================

const COMMAND_LOCATION_API = "http://localhost:4000/api";
const COMMAND_API = "http://localhost:4000/api";

// ==========================================================
// GLOBAL LOCATION STATE
// ==========================================================

window.commandLocation = {
  lat: null,
  lng: null,
  name: "",
  source: null,
};

let commandData = {
  incidents: [],
  sos: [],
  missions: [],
  teams: [],
  resources: [],
  zones: [],
};

let commandDataLoading = false;

let commandLatitude = null;
let commandLongitude = null;

// ==========================================================
// STATUS MESSAGE
// ==========================================================

function setCommandLocationStatus(message, type = "normal") {
  if (!commandLocationStatus) {
    return;
  }

  commandLocationStatus.textContent = message || "";

  commandLocationStatus.className = "command-location-status";

  if (type === "error") {
    commandLocationStatus.classList.add("error");
  }

  if (type === "success") {
    commandLocationStatus.classList.add("success");
  }

  if (type === "loading") {
    commandLocationStatus.classList.add("loading");
  }
}

// ==========================================================
// DISABLE / ENABLE LOCATION BUTTONS
// ==========================================================

function setLocationButtonsLoading(loading) {
  if (commandLocationSearchBtn) {
    commandLocationSearchBtn.disabled = loading;

    commandLocationSearchBtn.textContent = loading
      ? "Loading..."
      : "Load Location";
  }

  if (commandLiveLocationBtn) {
    commandLiveLocationBtn.disabled = loading;

    commandLiveLocationBtn.textContent = loading
      ? "Detecting..."
      : "📍 Use Current Location";
  }
}

// ==========================================================
// SAVE LOCATION
// ==========================================================

function setCommandLocation(lat, lng, name = "", source = "search") {
  lat = Number(lat);
  lng = Number(lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid location coordinates.");
  }

  window.commandLocation = {
    lat,
    lng,
    name: name || "Selected Location",
    source,
  };

  console.log("Command Center location:", window.commandLocation);

  return window.commandLocation;
}

async function commandFetch(url, options = {}) {
  const response = await fetch(url, options);

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid response received from server.");
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Server request failed with status ${response.status}`,
    );
  }

  return data;
}

// ==========================================================
// BACKEND GEOCODING
// ==========================================================

async function geocodeCommandLocation(place) {
  const query = place.trim();

  if (!query) {
    throw new Error("Enter a location.");
  }

  const res = await fetch(
    `${COMMAND_LOCATION_API}/map/geocode?location=${encodeURIComponent(query)}`,
  );

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Location not found.");
  }

  const item = data.location;

  if (!item || !item.latitude || !item.longitude) {
    throw new Error("Invalid location data received.");
  }

  return {
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    name: item.name || query,
  };
}

async function tryRoutes(routes) {
  let lastError = null;

  for (const route of routes) {
    try {
      const result = await commandFetch(route);

      return result;
    } catch (error) {
      lastError = error;

      console.warn("Route failed:", route, error.message);
    }
  }

  throw lastError || new Error("No valid API route found.");
}

// ==========================================================
// SEARCH LOCATION
// ==========================================================

async function searchCommandLocation() {
  if (!commandLocationInput) {
    console.error("commandLocationInput not found.");

    return;
  }

  const place = commandLocationInput.value.trim();

  if (!place) {
    setCommandLocationStatus("Enter a city, district or village.", "error");

    commandLocationInput.focus();

    return;
  }

  setLocationButtonsLoading(true);

  setCommandLocationStatus("Finding operational location...", "loading");

  try {
    const result = await geocodeCommandLocation(place);

    setCommandLocation(result.lat, result.lng, result.name, "search");

    commandLocationInput.value = result.name;

    setCommandLocationStatus(`Location loaded: ${result.name}`, "success");

    // ------------------------------------------------------
    // OPEN COMMAND CENTER
    // ------------------------------------------------------

    await openCommandCenter();
  } catch (error) {
    console.error("Command location error:", error);

    setCommandLocationStatus(
      error.message || "Unable to find this location.",
      "error",
    );
  } finally {
    setLocationButtonsLoading(false);
  }
}

async function loadSOS(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/sos?${locationQuery}`,
    `${COMMAND_API}/emergency/sos?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

// ==========================================================
// CURRENT LOCATION
// ==========================================================

async function useCommandCurrentLocation() {
  if (!navigator.geolocation) {
    setCommandLocationStatus(
      "Geolocation is not supported by this browser.",
      "error",
    );

    return;
  }

  setLocationButtonsLoading(true);

  setCommandLocationStatus("Detecting your current location...", "loading");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;

        const lng = position.coords.longitude;

        // --------------------------------------------------
        // Reverse geocoding is optional.
        // We already have valid coordinates.
        // --------------------------------------------------

        let name = "Current Location";

        try {
          const reverse = await reverseGeocodeCommandLocation(lat, lng);

          if (reverse?.name) {
            name = reverse.name;
          }
        } catch (error) {
          console.warn("Reverse geocoding failed:", error);
        }

        setCommandLocation(lat, lng, name, "live");

        if (commandLocationInput) {
          commandLocationInput.value = name;
        }

        setCommandLocationStatus(
          `Current location detected: ${name}`,
          "success",
        );

        await openCommandCenter();
      } catch (error) {
        console.error("Current location processing failed:", error);

        setCommandLocationStatus(
          error.message || "Unable to use current location.",
          "error",
        );
      } finally {
        setLocationButtonsLoading(false);
      }
    },

    (error) => {
      console.error("Geolocation error:", error);

      let message = "Unable to detect your current location.";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message =
            "Location permission was denied. Please allow location access.";
          break;

        case error.POSITION_UNAVAILABLE:
          message = "Your current location is unavailable.";
          break;

        case error.TIMEOUT:
          message = "Location detection timed out. Please try again.";
          break;
      }

      setCommandLocationStatus(message, "error");

      setLocationButtonsLoading(false);
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  );
}
async function reverseGeocodeCommandLocation(lat, lng) {
  const url = `${COMMAND_LOCATION_API}/map/geocode?location=${encodeURIComponent(
    `${lat},${lng}`,
  )}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const data = await response.json();

  if (!data?.success || !data?.location) {
    throw new Error("Reverse geocoding returned no location.");
  }

  const location = data.location;

  return {
    name: location.name || location.display_name || "Current Location",

    lat: Number(location.latitude ?? location.lat ?? lat),

    lng: Number(location.longitude ?? location.lng ?? location.lon ?? lng),
  };
}

async function loadIncidents(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/incidents?${locationQuery}`,
    `${COMMAND_API}/incident?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

async function loadMissions(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/missions?${locationQuery}`,
    `${COMMAND_API}/mission?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}
async function loadTeams(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/teams?${locationQuery}`,
    `${COMMAND_API}/responders?${locationQuery}`,
    `${COMMAND_API}/volunteers?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

async function loadCommandResources(locationQuery) {
  const possibleRoutes = [
    `${COMMAND_API}/map/resources?${locationQuery}`,
    `${COMMAND_API}/resources?${locationQuery}`,
  ];

  return await tryRoutes(possibleRoutes);
}

function normalizeArray(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.incidents)) {
    return data.incidents;
  }

  if (Array.isArray(data?.sos)) {
    return data.sos;
  }

  if (Array.isArray(data?.missions)) {
    return data.missions;
  }

  if (Array.isArray(data?.teams)) {
    return data.teams;
  }

  if (Array.isArray(data?.resources)) {
    return data.resources;
  }

  return [];
}

// ==========================================================
// OPEN COMMAND CENTER
// ==========================================================

async function loadCommandCenterData() {
  if (commandDataLoading) {
    return commandData;
  }

  const location = window.commandLocation;

  if (
    !location ||
    !Number.isFinite(Number(location.lat)) ||
    !Number.isFinite(Number(location.lng))
  ) {
    throw new Error("Select an operational location first.");
  }

  commandDataLoading = true;

  try {
    console.log("🔄 Loading Command Center data...");

    const locationQuery =
      `lat=${encodeURIComponent(Number(location.lat))}` +
      `&lng=${encodeURIComponent(Number(location.lng))}`;

    const requests = {
      incidents: loadIncidents(locationQuery),
      sos: loadSOS(locationQuery),
      missions: loadMissions(locationQuery),
      teams: loadTeams(locationQuery),
      resources: loadCommandResources(locationQuery),
    };

    const results = await Promise.allSettled(Object.values(requests));

    const keys = Object.keys(requests);

    results.forEach((result, index) => {
      const key = keys[index];

      if (result.status === "fulfilled") {
        commandData[key] = normalizeArray(result.value);
      } else {
        console.warn(`⚠️ Failed to load ${key}:`, result.reason);

        commandData[key] = [];
      }
    });

    console.log("✅ Command Center data loaded:", commandData);

    return commandData;
  } finally {
    commandDataLoading = false;
  }
}

async function openCommandCenter() {
  const location = window.commandLocation;

  console.log("🚀 openCommandCenter called");
  console.log("📍 Selected location:", location);

  if (!location || location.lat === null || location.lng === null) {
    throw new Error("Select an operational location first.");
  }

  // Hide gate
  if (commandLocationGate) {
    commandLocationGate.classList.add("hidden");
    commandLocationGate.style.display = "none";
  }

  // Show Command Center
  if (commandCenter) {
    commandCenter.style.display = "block";
  }

  console.log("✅ Command Center container opened");

  // Notify other files
  window.dispatchEvent(
    new CustomEvent("commandLocationReady", {
      detail: location,
    }),
  );

  // Load data
  if (typeof window.loadCommandCenterData === "function") {
    console.log("📡 Loading command center data");

    await window.loadCommandCenterData();
  } else {
    console.warn("⚠️ loadCommandCenterData() not found");
  }

  // Update UI
  if (typeof window.updateCommandLocationUI === "function") {
    window.updateCommandLocationUI();
  }

  console.log("✅ Command Center opened successfully");
}

// ==========================================================
// RETURN TO LOCATION SELECTION
// ==========================================================

function showCommandLocationGate() {
  if (commandCenter) {
    commandCenter.style.display = "none";
  }

  if (commandLocationGate) {
    commandLocationGate.classList.remove("hidden");

    commandLocationGate.style.display = "";
  }

  setCommandLocationStatus("");

  if (commandLocationInput) {
    commandLocationInput.value = "";
  }

  window.commandLocation = {
    lat: null,
    lng: null,
    name: "",
    source: null,
  };

  window.dispatchEvent(new CustomEvent("commandLocationReset"));
}

// ==========================================================
// SEARCH BUTTON
// ==========================================================

if (commandLocationSearchBtn) {
  commandLocationSearchBtn.addEventListener("click", searchCommandLocation);
  console.log("Location Btn clicked");
} else {
  console.error("❌ Load Location button not found.");
}

// ==========================================================
// ENTER KEY SEARCH
// ==========================================================

if (commandLocationInput) {
  commandLocationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      searchCommandLocation();
    }
  });
}

// ==========================================================
// LIVE LOCATION BUTTON
// ==========================================================

if (commandLiveLocationBtn) {
  commandLiveLocationBtn.addEventListener("click", useCommandCurrentLocation);
  console.log("Btn clicked ");
} else {
  console.error("❌ Current Location button not found.");
}

// ==========================================================
// EXPORTS
// ==========================================================

window.searchCommandLocation = searchCommandLocation;

window.useCommandCurrentLocation = useCommandCurrentLocation;

window.setCommandLocation = setCommandLocation;

window.openCommandCenter = openCommandCenter;

window.showCommandLocationGate = showCommandLocationGate;

window.geocodeCommandLocation = geocodeCommandLocation;

// ==========================================================
// INITIAL STATE
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Keep Command Center hidden
  // until a location is selected.

  if (commandCenter) {
    commandCenter.style.display = "none";
  }

  if (commandLocationGate) {
    commandLocationGate.style.display = "";
  }

  console.log("📍 Command Center location gate ready.");
});
