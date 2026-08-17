// ==========================================================
// DISASTEROS COMMAND CENTER
// LOCATION GATE / LOCATION SELECTION
// ==========================================================

console.log("Command Center Location JS Loaded");

// ==========================================================
// API
// ==========================================================

const COMMAND_LOCATION_API = "http://localhost:4000/api";

// ==========================================================
// DOM
// ==========================================================

const commandLocationGate = document.getElementById("commandLocationGate");

const commandLocationInput = document.getElementById("commandLocationInput");

const commandLocationSearchBtn = document.getElementById(
  "commandLocationSearchBtn",
);

const commandLiveLocationBtn = document.getElementById(
  "commandLiveLocationBtn",
);

const commandLocationStatus = document.getElementById("commandLocationStatus");

const commandCenter = document.getElementById("commandCenter");

// ==========================================================
// GLOBAL LOCATION STATE
// ==========================================================

window.commandLocation = {
  lat: null,
  lng: null,
  name: "",
  source: null,
};

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

// ==========================================================
// BACKEND GEOCODING
// ==========================================================

async function geocodeCommandLocation(place) {
  const query = String(place || "").trim();

  if (!query) {
    throw new Error("Please enter a location.");
  }

  const url = `${COMMAND_LOCATION_API}/map/geocode?location=${encodeURIComponent(
    query,
  )}`;

  console.log("Geocoding Command Center location:", query);

  const response = await fetch(url);

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid response received from location service.");
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Location service returned ${response.status}.`,
    );
  }

  if (!data?.success) {
    throw new Error(data?.message || "Location could not be found.");
  }

  const location = data.location;

  if (!location) {
    throw new Error("No location data received.");
  }

  const lat = Number(location.latitude ?? location.lat);

  const lng = Number(location.longitude ?? location.lng ?? location.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error("Invalid geocode response:", data);

    throw new Error("Location service returned invalid coordinates.");
  }

  return {
    lat,
    lng,
    name: location.name || location.display_name || query,
  };
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

// ==========================================================
// OPTIONAL REVERSE GEOCODING
// ==========================================================
//
// We use the SAME backend geocoding route.
// If your backend does not support reverse lookup,
// the current location will simply remain
// "Current Location".
//
// ==========================================================

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

// ==========================================================
// OPEN COMMAND CENTER
// ==========================================================

async function openCommandCenter() {
  const location = window.commandLocation;

  if (!location || location.lat === null || location.lng === null) {
    throw new Error("Select an operational location first.");
  }

  console.log("Opening Command Center for:", location);

  // --------------------------------------------------------
  // Hide location gate
  // --------------------------------------------------------

  if (commandLocationGate) {
    commandLocationGate.classList.add("hidden");

    commandLocationGate.style.display = "none";
  }

  // --------------------------------------------------------
  // Show Command Center
  // --------------------------------------------------------

  if (commandCenter) {
    commandCenter.style.display = "block";
  }

  // --------------------------------------------------------
  // Notify other Command Center JS files
  // --------------------------------------------------------

  window.dispatchEvent(
    new CustomEvent("commandLocationReady", {
      detail: location,
    }),
  );

  // --------------------------------------------------------
  // Initialize / refresh map
  // --------------------------------------------------------

  if (typeof window.initializeCommandMap === "function") {
    window.initializeCommandMap(location.lat, location.lng);
  }

  // --------------------------------------------------------
  // Load operational data
  // --------------------------------------------------------

  if (typeof window.loadCommandCenterData === "function") {
    await window.loadCommandCenterData(location);
  }

  // --------------------------------------------------------
  // Update coordinate UI
  // --------------------------------------------------------

  if (typeof window.updateCommandLocationUI === "function") {
    window.updateCommandLocationUI();
  }

  console.log("Command Center opened successfully.");
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
