"use strict";

console.log("📍 Command Center Location Loaded");

const CommandCenterLocation = (() => {
  let currentLocation = null;
  let initialized = false;

  const DEFAULT_ZOOM = 12.8;

  function getElements() {
    return {
      gate: document.getElementById("commandLocationGate"),
      main: document.getElementById("commandCenter"),

      input: document.getElementById("commandLocationInput"),
      searchBtn: document.getElementById("commandLocationSearchBtn"),
      liveBtn: document.getElementById("commandLiveLocationBtn"),
      status: document.getElementById("commandLocationStatus"),
    };
  }

  function setStatus(message, type = "") {
    const { status } = getElements();

    if (!status) return;

    status.textContent = message || "";
    status.className =
      `command-location-status ${type}`.trim();
  }

  function validateCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    if (lat < -90 || lat > 90) {
      return null;
    }

    if (lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };
  }

  async function activateLocation(
    latitude,
    longitude,
    name = null,
    source = "unknown"
  ) {
    const coordinates =
      validateCoordinates(latitude, longitude);

    if (!coordinates) {
      throw new Error(
        "Invalid location coordinates."
      );
    }

    const { lat, lng } = coordinates;

    currentLocation = {
      lat,
      lng,
      name: name || null,
      source,
    };

    console.log(
      "📍 Operational location selected:",
      currentLocation
    );

    // Update central store.
    CommandCenterData.setLocation(
      currentLocation
    );

    // Expose location globally for compatibility.
    window.commandLocation =
      currentLocation;

    // Update coordinates UI.
    const mapLat =
      document.getElementById("mapLat");

    const mapLng =
      document.getElementById("mapLng");

    if (mapLat) {
      mapLat.textContent =
        lat.toFixed(6);
    }

    if (mapLng) {
      mapLng.textContent =
        lng.toFixed(6);
    }

    // Initialize / move map.
    if (window.CommandCenterMap) {
      window.CommandCenterMap.initialize(
        lat,
        lng
      );
    }

    // Hide gate.
    const { gate, main } =
      getElements();

    if (gate) {
      gate.style.display = "none";
    }

    if (main) {
      main.style.display = "block";
    }

    setStatus("");

    // Give browser a frame to render the map.
    requestAnimationFrame(() => {
      if (
        window.CommandCenterMap &&
        typeof window.CommandCenterMap.invalidateSize ===
          "function"
      ) {
        window.CommandCenterMap.invalidateSize();
      }
    });

    // Load ALL operational data only AFTER
    // a location has been selected.
    if (window.CommandDashboard) {
      await window.CommandDashboard.loadAll();
    }

    return currentLocation;
  }

  async function searchLocation() {
    const { input, searchBtn } =
      getElements();

    const place =
      input?.value?.trim();

    if (!place) {
      setStatus(
        "Please enter a city, district or village.",
        "error"
      );

      input?.focus();

      return;
    }

    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = "Searching...";
    }

    setStatus(
      `Searching for "${place}"...`,
      "loading"
    );

    try {
      if (
        !window.commandApi ||
        typeof window.commandApi.geocode !==
          "function"
      ) {
        throw new Error(
          "Geocoding API is unavailable."
        );
      }

      console.log(
        "🔎 Geocoding location:",
        place
      );

      const response =
        await window.commandApi.geocode(
          place
        );

      console.log(
        "📍 Geocoding response:",
        response
      );

      const location =
        extractGeocodedLocation(response);

      if (!location) {
        throw new Error(
          `Location "${place}" could not be found.`
        );
      }

      await activateLocation(
        location.lat,
        location.lng,
        location.name || place,
        "search"
      );

    } catch (error) {
      console.error(
        "❌ Location search failed:",
        error
      );

      setStatus(
        error.message ||
          "Unable to find this location.",
        "error"
      );

    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent =
          "Load Location";
      }
    }
  }

  function extractGeocodedLocation(response) {
    if (!response) return null;

    // Common backend response:
    // { success: true, data: [...] }

    const candidates = [];

    if (Array.isArray(response)) {
      candidates.push(...response);
    }

    if (Array.isArray(response.data)) {
      candidates.push(...response.data);
    }

    if (Array.isArray(response.results)) {
      candidates.push(...response.results);
    }

    if (response.data && !Array.isArray(response.data)) {
      candidates.push(response.data);
    }

    if (response.result) {
      candidates.push(response.result);
    }

    if (response.location) {
      candidates.push(response.location);
    }

    for (const item of candidates) {
      if (!item) continue;

      const lat = Number(
        item.lat ??
        item.latitude ??
        item.properties?.lat
      );

      const lng = Number(
        item.lng ??
        item.lon ??
        item.longitude ??
        item.properties?.lon
      );

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        return {
          lat,
          lng,
          name:
            item.name ||
            item.display_name ||
            item.formatted ||
            item.properties?.formatted ||
            null,
        };
      }
    }

    // Direct object fallback.
    const lat = Number(
      response.lat ??
      response.latitude
    );

    const lng = Number(
      response.lng ??
      response.lon ??
      response.longitude
    );

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      return {
        lat,
        lng,
        name:
          response.name ||
          response.display_name ||
          null,
      };
    }

    return null;
  }

  function useCurrentLocation() {
    const { liveBtn } =
      getElements();

    if (
      !navigator.geolocation
    ) {
      setStatus(
        "Geolocation is not supported by this browser.",
        "error"
      );

      return;
    }

    if (liveBtn) {
      liveBtn.disabled = true;
      liveBtn.textContent =
        "📍 Detecting Location...";
    }

    setStatus(
      "Getting your current location...",
      "loading"
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await activateLocation(
            position.coords.latitude,
            position.coords.longitude,
            null,
            "live"
          );

        } catch (error) {
          console.error(
            "❌ Current location activation failed:",
            error
          );

          setStatus(
            error.message,
            "error"
          );
        } finally {
          if (liveBtn) {
            liveBtn.disabled = false;
            liveBtn.textContent =
              "📍 Use Current Location";
          }
        }
      },

      (error) => {
        console.error(
          "❌ Geolocation error:",
          error
        );

        let message =
          "Unable to get your current location.";

        if (error.code === 1) {
          message =
            "Location permission was denied. Please allow location access.";
        } else if (error.code === 2) {
          message =
            "Your current location could not be determined.";
        } else if (error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setStatus(
          message,
          "error"
        );

        if (liveBtn) {
          liveBtn.disabled = false;
          liveBtn.textContent =
            "📍 Use Current Location";
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function initialize() {
    if (initialized) return;

    initialized = true;

    const {
      gate,
      main,
      input,
      searchBtn,
      liveBtn,
    } = getElements();

    // IMPORTANT:
    // Command Center starts LOCKED.
    if (gate) {
      gate.style.display = "flex";
    }

    if (main) {
      main.style.display = "none";
    }

    // Search button.
    searchBtn?.addEventListener(
      "click",
      searchLocation
    );

    // Enter key.
    input?.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          searchLocation();
        }
      }
    );

    // Current location.
    liveBtn?.addEventListener(
      "click",
      useCurrentLocation
    );

    console.log(
      "✅ Location gate ready — waiting for user selection"
    );
  }

  function getLocation() {
    return currentLocation;
  }

  function hasLocation() {
    return Boolean(
      currentLocation &&
      Number.isFinite(currentLocation.lat) &&
      Number.isFinite(currentLocation.lng)
    );
  }

  return {
    initialize,
    activateLocation,
    searchLocation,
    useCurrentLocation,
    getLocation,
    hasLocation,
  };
})();

window.CommandCenterLocation =
  CommandCenterLocation;

console.log(
  "✅ Command Center Location Ready"
);