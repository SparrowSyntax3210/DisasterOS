// =========================================================
// DISASTEROS LIVE MAP
// =========================================================

(function () {
  "use strict";

  console.log("🗺 Loading DisasterOS Live Map...");

  // =========================================================
  // STATE
  // =========================================================

  let map = null;

  let markers = [];

  let userLocationMarker = null;

  let initialized = false;

  let resourceData = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    shelters: [],
    schools: [],
  };

  let currentCategory = "hospitals";

  // =========================================================
  // CATEGORY NAMES
  // =========================================================

  const categoryNames = {
    hospitals: "Hospitals",
    policeStations: "Police Stations",
    fireStations: "Fire Stations",
    pharmacies: "Pharmacies",
    shelters: "Shelters",
    schools: "Schools",
  };

  // =========================================================
  // GET DASHBOARD
  // =========================================================

  function getDashboard() {
    return window.DisasterOSDashboard || null;
  }

  // =========================================================
  // GET LOCATION
  // =========================================================

  function getLocation() {
    const dashboard = getDashboard();

    if (!dashboard) {
      return null;
    }

    return dashboard.location || null;
  }

  // =========================================================
  // INIT
  // =========================================================

  async function initMapOverlay() {
    console.log("🗺 Initializing Live Map...");

    const location = getLocation();

    if (
      !location ||
      !isValidCoordinate(location.latitude) ||
      !isValidCoordinate(location.longitude)
    ) {
      console.warn("⚠️ Map waiting for dashboard location...");

      return;
    }

    // -------------------------------------------------------
    // CREATE MAP
    // -------------------------------------------------------

    if (!initialized) {
      createMap();

      bindControls();

      initialized = true;
    }

    // -------------------------------------------------------
    // UPDATE USER LOCATION
    // -------------------------------------------------------

    updateUserLocation(location);

    // -------------------------------------------------------
    // INVALIDATE SIZE
    // -------------------------------------------------------

    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 150);

    // -------------------------------------------------------
    // USE DASHBOARD RESOURCE DATA
    // -------------------------------------------------------

    const dashboard = getDashboard();

    if (dashboard && dashboard.resources) {
      setResources(dashboard.resources);
    }
  }

  // =========================================================
  // CREATE MAP
  // =========================================================

  function createMap() {
    const location = getLocation();

    if (
      !location ||
      !isValidCoordinate(location.latitude) ||
      !isValidCoordinate(location.longitude)
    ) {
      return;
    }

    const mapElement = document.getElementById("liveMap");

    if (!mapElement) {
      console.warn("⚠️ #liveMap element not found");

      return;
    }

    if (map) {
      return;
    }

    map = L.map(mapElement).setView(
      [Number(location.latitude), Number(location.longitude)],
      13,
    );

    // =======================================================
    // OPENSTREETMAP
    // =======================================================

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,

      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // =======================================================
    // USER LOCATION
    // =======================================================

    updateUserLocation(location);

    console.log("✅ Map created");
  }

  // =========================================================
  // UPDATE USER LOCATION
  // =========================================================

  function updateUserLocation(location) {
    if (
      !map ||
      !location ||
      !isValidCoordinate(location.latitude) ||
      !isValidCoordinate(location.longitude)
    ) {
      return;
    }

    const lat = Number(location.latitude);

    const lng = Number(location.longitude);

    // -------------------------------------------------------
    // EXISTING MARKER
    // -------------------------------------------------------

    if (userLocationMarker) {
      userLocationMarker.setLatLng([lat, lng]);
    } else {
      userLocationMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("<strong>Your Location</strong>");
    }

    // -------------------------------------------------------
    // MOVE MAP
    // -------------------------------------------------------

    map.setView([lat, lng], map.getZoom() || 13, {
      animate: true,
    });
  }

  // =========================================================
  // SET RESOURCES
  // =========================================================

  function setResources(resources) {
    resourceData = normalizeResources(resources);

    console.log("📦 Map received resources:", resourceData);

    renderResourceTotals();

    renderCategory(currentCategory);
  }

  // =========================================================
  // NORMALIZE RESOURCES
  // =========================================================

  function normalizeResources(resources) {
    if (!resources || typeof resources !== "object") {
      return createEmptyResources();
    }

    return {
      hospitals: normalizeResourceArray(resources.hospitals),

      policeStations: normalizeResourceArray(
        resources.policeStations || resources.police,
      ),

      fireStations: normalizeResourceArray(
        resources.fireStations || resources.fire,
      ),

      pharmacies: normalizeResourceArray(resources.pharmacies),

      shelters: normalizeResourceArray(resources.shelters),

      schools: normalizeResourceArray(resources.schools),
    };
  }

  // =========================================================
  // EMPTY RESOURCES
  // =========================================================

  function createEmptyResources() {
    return {
      hospitals: [],
      policeStations: [],
      fireStations: [],
      pharmacies: [],
      shelters: [],
      schools: [],
    };
  }

  // =========================================================
  // NORMALIZE RESOURCE ARRAY
  // =========================================================

  function normalizeResourceArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (value && Array.isArray(value.places)) {
      return value.places;
    }

    if (value && Array.isArray(value.results)) {
      return value.results;
    }

    return [];
  }

  // =========================================================
  // RESOURCE TOTALS
  // =========================================================

  function renderResourceTotals() {
    const possibleIds = {
      hospitals: ["hospitalCount", "hospitalsCount", "mapHospitalCount"],

      policeStations: ["policeCount", "policeStationsCount", "mapPoliceCount"],

      fireStations: ["fireCount", "fireStationsCount", "mapFireCount"],

      pharmacies: ["pharmacyCount", "pharmaciesCount", "mapPharmacyCount"],

      shelters: ["shelterCount", "sheltersCount", "mapShelterCount"],

      schools: ["schoolCount", "schoolsCount", "mapSchoolCount"],
    };

    let total = 0;

    Object.keys(categoryNames).forEach((category) => {
      const places = normalizeResourceArray(resourceData[category]);

      total += places.length;

      (possibleIds[category] || []).forEach((id) => {
        setText(id, places.length);
      });
    });

    setText("mapTotalResources", total);

    console.log("📊 Map resource totals:", {
      hospitals: resourceData.hospitals.length,

      police: resourceData.policeStations.length,

      fire: resourceData.fireStations.length,

      pharmacies: resourceData.pharmacies.length,

      shelters: resourceData.shelters.length,

      schools: resourceData.schools.length,

      total,
    });
  }

  // =========================================================
  // CONTROLS
  // =========================================================

  function bindControls() {
    // -------------------------------------------------------
    // CATEGORY BUTTONS
    // -------------------------------------------------------

    document.querySelectorAll(".map-filter").forEach((button) => {
      /*
       * Prevent duplicate listeners.
       */
      if (button.dataset.mapBound === "true") {
        return;
      }

      button.dataset.mapBound = "true";

      button.addEventListener("click", () => {
        const category = button.dataset.category;

        if (!category || !categoryNames[category]) {
          console.warn("⚠️ Invalid map category:", category);

          return;
        }

        currentCategory = category;

        document.querySelectorAll(".map-filter").forEach((btn) => {
          btn.classList.toggle("active", btn === button);
        });

        renderCategory(category);
      });
    });

    // -------------------------------------------------------
    // REFRESH
    // -------------------------------------------------------

    const refresh = document.getElementById("mapRefresh");

    if (refresh && refresh.dataset.mapBound !== "true") {
      refresh.dataset.mapBound = "true";

      refresh.addEventListener("click", async () => {
        refresh.disabled = true;

        try {
          /*
           * Ask dashboard to refresh.
           *
           * Dashboard will:
           *
           * 1. Get location
           * 2. Fetch resources
           * 3. Dispatch resources-ready event
           * 4. Map receives updated data
           */
          const dashboard = getDashboard();

          if (dashboard && typeof dashboard.refresh === "function") {
            await dashboard.refresh();
          } else {
            console.warn("⚠️ Dashboard refresh API unavailable");
          }
        } catch (error) {
          console.error("❌ Map refresh error:", error);
        } finally {
          refresh.disabled = false;
        }
      });
    }
  }

  // =========================================================
  // RENDER CATEGORY
  // =========================================================

  function renderCategory(category) {
    if (!map) {
      console.warn("⚠️ Cannot render category: map unavailable");

      return;
    }

    if (!categoryNames[category]) {
      category = "hospitals";
    }

    currentCategory = category;

    // -------------------------------------------------------
    // CLEAR OLD MARKERS
    // -------------------------------------------------------

    clearMarkers();

    // -------------------------------------------------------
    // GET PLACES
    // -------------------------------------------------------

    const places = normalizeResourceArray(resourceData[category]);

    console.log(`📍 Rendering ${category}: ${places.length}`);

    const title = document.getElementById("mapResultTitle");

    const count = document.getElementById("mapResultCount");

    const list = document.getElementById("mapResultList");

    // -------------------------------------------------------
    // HEADER
    // -------------------------------------------------------

    if (title) {
      title.textContent = categoryNames[category];
    }

    if (count) {
      count.textContent = String(places.length);
    }

    // -------------------------------------------------------
    // CLEAR SIDE PANEL
    // -------------------------------------------------------

    if (list) {
      list.innerHTML = "";
    }

    // -------------------------------------------------------
    // EMPTY
    // -------------------------------------------------------

    if (places.length === 0) {
      if (list) {
        list.innerHTML = `
          <div class="map-empty-state">

            <strong>
              No ${escapeHTML(categoryNames[category])} found
            </strong>

            <p>
              No nearby resources were found.
            </p>

          </div>
        `;
      }

      return;
    }

    // -------------------------------------------------------
    // MARKERS + LIST
    // -------------------------------------------------------

    places.forEach((place, index) => {
      const marker = addMarker(place, category, index);

      if (list && marker) {
        const item = createResultItem(place, category, marker, index);

        list.appendChild(item);
      }
    });
  }

  // =========================================================
  // CREATE SIDE ITEM
  // =========================================================

  function createResultItem(place, category, marker, index) {
    const item = document.createElement("div");

    item.className = "map-result-item";

    item.dataset.index = String(index);

    const name = getPlaceName(place, category);

    const address = getPlaceAddress(place);

    const distance = formatDistance(getPlaceDistance(place));

    item.innerHTML = `
      <div class="map-result-content">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <p>
          ${escapeHTML(address)}
        </p>

        <span class="map-distance">
          ${escapeHTML(distance)}
        </span>

      </div>
    `;

    item.addEventListener("click", () => {
      focusPlace(place, marker);

      highlightSidePanelItem(index);
    });

    return item;
  }

  // =========================================================
  // ADD MARKER
  // =========================================================

  function addMarker(place, category, index) {
    if (!map) {
      return null;
    }

    const coordinates = getPlaceCoordinates(place);

    if (!coordinates) {
      console.warn("⚠️ Invalid resource coordinates:", place);

      return null;
    }

    const { latitude, longitude } = coordinates;

    const marker = L.marker([latitude, longitude]).addTo(map);

    const name = getPlaceName(place, category);

    const address = getPlaceAddress(place);

    const distance = formatDistance(getPlaceDistance(place));

    marker.bindPopup(`
      <div class="resource-popup">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <br>

        <small>
          ${escapeHTML(address)}
        </small>

        <br>

        <small>
          ${escapeHTML(distance)}
        </small>

      </div>
    `);

    marker.on("click", () => {
      console.log("📍 Resource selected:", place);

      highlightSidePanelItem(index);
    });

    marker._disasterOSIndex = index;

    markers.push(marker);

    return marker;
  }

  // =========================================================
  // FOCUS PLACE
  // =========================================================

  function focusPlace(place, marker) {
    if (!map) {
      return;
    }

    const coordinates = getPlaceCoordinates(place);

    if (!coordinates) {
      return;
    }

    const { latitude, longitude } = coordinates;

    map.setView([latitude, longitude], 16, {
      animate: true,
    });

    if (marker) {
      marker.openPopup();
    }
  }

  // =========================================================
  // HIGHLIGHT SIDE PANEL
  // =========================================================

  function highlightSidePanelItem(index) {
    const items = document.querySelectorAll(".map-result-item");

    items.forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === index);
    });

    const selected = items[index];

    if (selected) {
      selected.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  // =========================================================
  // CLEAR MARKERS
  // =========================================================

  function clearMarkers() {
    if (!map) {
      markers = [];

      return;
    }

    markers.forEach((marker) => {
      if (marker) {
        map.removeLayer(marker);
      }
    });

    markers = [];
  }

  // =========================================================
  // PLACE NAME
  // =========================================================

  function getPlaceName(place, category) {
    return (
      place?.name ||
      place?.properties?.name ||
      categoryNames[category] ||
      "Unknown resource"
    );
  }

  // =========================================================
  // PLACE ADDRESS
  // =========================================================

  function getPlaceAddress(place) {
    return (
      place?.address ||
      place?.formatted ||
      place?.properties?.formatted ||
      place?.properties?.address_line1 ||
      place?.properties?.address_line2 ||
      "Address unavailable"
    );
  }

  // =========================================================
  // PLACE DISTANCE
  // =========================================================

  function getPlaceDistance(place) {
    return place?.distance ?? place?.properties?.distance ?? null;
  }

  // =========================================================
  // PLACE COORDINATES
  // =========================================================

  function getPlaceCoordinates(place) {
    if (!place) {
      return null;
    }

    // -------------------------------------------------------
    // Standard backend format
    // -------------------------------------------------------

    let latitude = place.latitude;

    let longitude = place.longitude;

    // -------------------------------------------------------
    // Alternative format
    // -------------------------------------------------------

    if (latitude === undefined || latitude === null) {
      latitude = place.lat;
    }

    if (longitude === undefined || longitude === null) {
      longitude = place.lng ?? place.lon;
    }

    // -------------------------------------------------------
    // Geoapify properties
    // -------------------------------------------------------

    if (latitude === undefined || longitude === undefined) {
      latitude = place.properties?.lat;

      longitude = place.properties?.lon ?? place.properties?.lng;
    }

    // -------------------------------------------------------
    // GeoJSON geometry
    // -------------------------------------------------------

    if (
      (latitude === undefined || latitude === null) &&
      Array.isArray(place.geometry?.coordinates)
    ) {
      const [geoLng, geoLat] = place.geometry.coordinates;

      longitude = geoLng;

      latitude = geoLat;
    }

    latitude = Number(latitude);

    longitude = Number(longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }

  // =========================================================
  // DISTANCE
  // =========================================================

  function formatDistance(distance) {
    const value = Number(distance);

    if (!Number.isFinite(value) || value < 0) {
      return "Distance unavailable";
    }

    if (value < 1000) {
      return `${Math.round(value)} m away`;
    }

    return `${(value / 1000).toFixed(1)} km away`;
  }

  // =========================================================
  // TEXT
  // =========================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value);
    }
  }

  // =========================================================
  // COORDINATE VALIDATION
  // =========================================================

  function isValidCoordinate(value) {
    return Number.isFinite(Number(value));
  }

  // =========================================================
  // ESCAPE HTML
  // =========================================================

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  window.initMapOverlay = initMapOverlay;

  window.DisasterOSMap = {
    get resources() {
      return resourceData;
    },

    get map() {
      return map;
    },

    refresh: async function () {
      const dashboard = getDashboard();

      if (dashboard && typeof dashboard.refresh === "function") {
        await dashboard.refresh();
      }
    },

    showCategory: renderCategory,
  };

  // =========================================================
  // DASHBOARD DATA READY
  // =========================================================

  window.addEventListener("disasterOSDataReady", (event) => {
    console.log("📡 Dashboard data ready → updating map");

    const detail = event.detail || {};

    if (detail.location) {
      updateUserLocation(detail.location);
    }

    if (detail.resources) {
      setResources(detail.resources);
    }

    initMapOverlay();
  });

  // =========================================================
  // RESOURCES READY
  // =========================================================

  window.addEventListener("disasterOSResourcesReady", (event) => {
    console.log("📡 Resources ready → updating map markers");

    const detail = event.detail || {};

    if (detail.location) {
      updateUserLocation(detail.location);
    }

    if (detail.resources) {
      setResources(detail.resources);
    }
  });

  // =========================================================
  // DOM READY
  // =========================================================

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initMapOverlay();
      },
      {
        once: true,
      },
    );
  } else {
    initMapOverlay();
  }

  console.log("✅ DisasterOS map.js loaded");
})();
