// =========================================================
// DISASTEROS LIVE MAP
// =========================================================

(function () {
  let map = null;
  let markers = [];
  let initialized = false;
  let resourceData = {};

  const categoryNames = {
    hospitals: "Hospitals",
    policeStations: "Police Stations",
    fireStations: "Fire Stations",
    pharmacies: "Pharmacies",
    shelters: "Shelters",
    schools: "Schools",
  };

  // =========================================================
  // GET DASHBOARD DATA
  // =========================================================

  function getDashboard() {
    return window.DisasterOSDashboard || null;
  }

  function getLocation() {
    const dashboard = getDashboard();

    if (!dashboard) {
      return null;
    }

    return dashboard.location || null;
  }

  // =========================================================
  // API
  // =========================================================

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  // =========================================================
  // INIT
  // =========================================================

  async function initMapOverlay() {
    console.log("🗺 Initializing DisasterOS Live Map...");

    const location = getLocation();

    if (
      !location ||
      location.latitude === null ||
      location.longitude === null
    ) {
      console.warn("⚠ Map location is not available yet.");

      return;
    }

    console.log("📍 Map location:", location);

    if (!initialized) {
      initialized = true;

      createMap();

      bindControls();
    }

    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 150);

    await loadResources();
  }

  // =========================================================
  // CREATE MAP
  // =========================================================

  function createMap() {
    const location = getLocation();

    if (!location) {
      return;
    }

    if (map) {
      return;
    }

    map = L.map("liveMap").setView(
      [Number(location.latitude), Number(location.longitude)],
      13,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // =====================================================
    // USER LOCATION
    // =====================================================

    L.marker([Number(location.latitude), Number(location.longitude)])
      .addTo(map)
      .bindPopup("<strong>Your Location</strong>");
  }

  // =========================================================
  // LOAD ALL RESOURCES
  // =========================================================

  async function loadResources() {
    const location = getLocation();

    if (
      !location ||
      location.latitude === null ||
      location.longitude === null
    ) {
      return;
    }

    try {
      console.log("📡 Fetching nearby resources...");

      const response = await fetch(
        `${getAPI()}/api/map/resources?lat=${encodeURIComponent(
          location.latitude,
        )}&lng=${encodeURIComponent(location.longitude)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Unable to load resources");
      }

      resourceData = result.resources || result.data || {};

      console.log("🏥 Nearby resources:", resourceData);

      renderResourceTotals();

      /*
       * Default category
       */
      const activeButton = document.querySelector(".map-filter.active");

      const category = activeButton?.dataset.category || "hospitals";

      renderCategory(category);
    } catch (error) {
      console.error("❌ Map Resources Error:", error);

      resourceData = {};

      renderResourceTotals();

      renderCategory("hospitals");
    }
  }

  // =========================================================
  // RESOURCE TOTALS
  // =========================================================

  function renderResourceTotals() {
    const categories = Object.keys(categoryNames);

    let total = 0;

    categories.forEach((category) => {
      const places = Array.isArray(resourceData[category])
        ? resourceData[category]
        : [];

      total += places.length;

      /*
       * Supports IDs such as:
       *
       * hospitalCount
       * policeCount
       * fireCount
       * pharmacyCount
       * shelterCount
       * schoolCount
       */

      const possibleIds = {
        hospitals: ["hospitalCount", "hospitalsCount", "mapHospitalCount"],

        policeStations: [
          "policeCount",
          "policeStationsCount",
          "mapPoliceCount",
        ],

        fireStations: ["fireCount", "fireStationsCount", "mapFireCount"],

        pharmacies: ["pharmacyCount", "pharmaciesCount", "mapPharmacyCount"],

        shelters: ["shelterCount", "sheltersCount", "mapShelterCount"],

        schools: ["schoolCount", "schoolsCount", "mapSchoolCount"],
      };

      (possibleIds[category] || []).forEach((id) => {
        setText(id, places.length);
      });
    });

    /*
     * Optional overall resource counter
     */

    setText("mapTotalResources", total);
  }

  // =========================================================
  // CONTROLS
  // =========================================================

  function bindControls() {
    document.querySelectorAll(".map-filter").forEach((button) => {
      button.addEventListener("click", function () {
        document.querySelectorAll(".map-filter").forEach((btn) => {
          btn.classList.remove("active");
        });

        this.classList.add("active");

        renderCategory(this.dataset.category);
      });
    });

    const refresh = document.getElementById("mapRefresh");

    if (refresh) {
      refresh.addEventListener("click", async () => {
        refresh.disabled = true;

        try {
          await loadResources();
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
      return;
    }

    clearMarkers();

    const places = Array.isArray(resourceData[category])
      ? resourceData[category]
      : [];

    console.log(`📍 Rendering ${category}:`, places.length);

    const title = document.getElementById("mapResultTitle");

    const count = document.getElementById("mapResultCount");

    const list = document.getElementById("mapResultList");

    // =====================================================
    // HEADER
    // =====================================================

    if (title) {
      title.textContent = categoryNames[category] || category;
    }

    if (count) {
      count.textContent = places.length;
    }

    // =====================================================
    // EMPTY STATE
    // =====================================================

    if (list) {
      list.innerHTML = "";

      if (places.length === 0) {
        list.innerHTML = `
          <div class="map-empty-state">
            <strong>
              No ${escapeHTML(categoryNames[category] || category)} found
            </strong>

            <p>
              No nearby resources were found.
            </p>
          </div>
        `;

        return;
      }
    }

    // =====================================================
    // MARKERS + SIDE PANEL
    // =====================================================

    places.forEach((place, index) => {
      const marker = addMarker(place, category, index);

      if (list) {
        const item = createResultItem(place, category, marker);

        list.appendChild(item);
      }
    });
  }

  // =========================================================
  // CREATE SIDE PANEL ITEM
  // =========================================================

  function createResultItem(place, category, marker) {
    const item = document.createElement("div");

    item.className = "map-result-item";

    const name = place.name || categoryNames[category] || "Unknown resource";

    const address = place.address || "Address unavailable";

    const distance = formatDistance(place.distance);

    item.innerHTML = `
      <div class="map-result-content">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <p>
          ${escapeHTML(address)}
        </p>

        <span class="map-distance">
          ${distance}
        </span>

      </div>
    `;

    // =====================================================
    // CLICK SIDE PANEL ITEM
    // =====================================================

    item.addEventListener("click", () => {
      focusPlace(place, marker);

      document.querySelectorAll(".map-result-item").forEach((element) => {
        element.classList.remove("active");
      });

      item.classList.add("active");
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

    const lat = Number(place.latitude);

    const lng = Number(place.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn("⚠ Invalid resource coordinates:", place);

      return null;
    }

    const marker = L.marker([lat, lng]).addTo(map);

    const name = place.name || categoryNames[category] || "Unknown resource";

    const address = place.address || "Address unavailable";

    const distance = formatDistance(place.distance);

    // =====================================================
    // POPUP
    // =====================================================

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

    // =====================================================
    // MARKER CLICK
    // =====================================================

    marker.on("click", () => {
      console.log("📍 Resource selected:", place);

      highlightSidePanelItem(index);
    });

    markers.push(marker);

    return marker;
  }

  // =========================================================
  // FOCUS RESOURCE
  // =========================================================

  function focusPlace(place, marker) {
    const lat = Number(place.latitude);

    const lng = Number(place.longitude);

    if (!map || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    map.setView([lat, lng], 16, {
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
    markers.forEach((marker) => {
      if (map && marker) {
        map.removeLayer(marker);
      }
    });

    markers = [];
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatDistance(distance) {
    const value = Number(distance);

    if (Number.isNaN(value) || value <= 0) {
      return "Distance unavailable";
    }

    if (value < 1000) {
      return `${Math.round(value)} m away`;
    }

    return `${(value / 1000).toFixed(1)} km away`;
  }

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
  // EXPOSE
  // =========================================================

  window.initMapOverlay = initMapOverlay;

  /*
   * Make resource data accessible to other
   * DisasterOS components if required.
   */

  window.DisasterOSMap = {
    get resources() {
      return resourceData;
    },

    get map() {
      return map;
    },

    refresh: loadResources,

    showCategory: renderCategory,
  };

  console.log("✅ DisasterOS map.js loaded");

  // =========================================================
  // AUTO INITIALIZATION
  // =========================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initMapOverlay();
    });
  } else {
    initMapOverlay();
  }

  window.addEventListener("disasterOSDataReady", () => {
    console.log("📡 Dashboard data ready → initializing map");

    initMapOverlay();
  });
})();
