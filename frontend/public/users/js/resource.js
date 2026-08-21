// =========================================================
// DISASTEROS RESOURCES
// Nearby emergency resources - NO MAP MARKERS
// =========================================================

(function () {
  let initialized = false;

  let resourceData = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    shelters: [],
    schools: [],
  };

  let activeCategory = "all";

  // =====================================================
  // API
  // =====================================================

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  // =====================================================
  // LOCATION
  // =====================================================

  function getLocation() {
    return window.currentLocation || null;
  }

  // =====================================================
  // CATEGORY CONFIG
  // =====================================================

  const categoryConfig = {
    hospitals: {
      name: "Hospitals",
      icon: "🏥",
      countId: "resourceHospitalCount",
    },

    policeStations: {
      name: "Police Stations",
      icon: "👮",
      countId: "resourcePoliceCount",
    },

    fireStations: {
      name: "Fire Stations",
      icon: "🚒",
      countId: "resourceFireCount",
    },

    pharmacies: {
      name: "Pharmacies",
      icon: "💊",
      countId: "resourcePharmacyCount",
    },

    shelters: {
      name: "Shelters",
      icon: "🏠",
      countId: "resourceShelterCount",
    },

    schools: {
      name: "Schools",
      icon: "🏫",
      countId: "resourceSchoolCount",
    },
  };

  // =====================================================
  // INIT
  // =====================================================

  function initResourcesOverlay() {
    console.log("🏥 Initializing Resources view...");

    if (!initialized) {
      initialized = true;

      bindControls();
    }

    loadResources();
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  function bindControls() {
    // ---------------------------------------------
    // Category filters
    // ---------------------------------------------

    document.querySelectorAll(".resource-filter").forEach((button) => {
      button.addEventListener("click", function () {
        document
          .querySelectorAll(".resource-filter")
          .forEach((btn) => btn.classList.remove("active"));

        this.classList.add("active");

        activeCategory = this.dataset.category || "all";

        renderResources();
      });
    });

    // ---------------------------------------------
    // Refresh
    // ---------------------------------------------

    const refresh = document.getElementById("resourcesRefresh");

    if (refresh) {
      refresh.addEventListener("click", loadResources);
    }
  }

  // =====================================================
  // LOAD RESOURCES
  // =====================================================

  async function loadResources() {
    const location = getLocation();

    if (
      !location ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      console.warn("⚠ Resources: location unavailable");

      showResourceError("Location unavailable");

      return;
    }

    const list = document.getElementById("resourceList");

    if (list) {
      list.innerHTML = `
        <div class="loading-state">
          <span>⟳</span>
          <p>Finding nearby resources...</p>
        </div>
      `;
    }

    try {
      console.log(
        "📍 Loading resources near:",
        location.latitude,
        location.longitude,
      );

      const response = await fetch(
        `${getAPI()}/api/map/resources?lat=${encodeURIComponent(
          location.latitude,
        )}&lng=${encodeURIComponent(location.longitude)}`,
      );

      if (!response.ok) {
        throw new Error(`Resource API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Unable to load resources");
      }

      resourceData = normalizeResources(result.resources || result.data || {});

      console.log("🏥 Nearby resources:", resourceData);

      renderSummary();

      renderResources();
    } catch (error) {
      console.error("❌ Resources Error:", error);

      showResourceError("Unable to load nearby resources");
    }
  }

  // =====================================================
  // NORMALIZE RESOURCE DATA
  // =====================================================

  function normalizeResources(resources) {
    return {
      hospitals: Array.isArray(resources.hospitals) ? resources.hospitals : [],

      policeStations: Array.isArray(resources.policeStations)
        ? resources.policeStations
        : [],

      fireStations: Array.isArray(resources.fireStations)
        ? resources.fireStations
        : [],

      pharmacies: Array.isArray(resources.pharmacies)
        ? resources.pharmacies
        : [],

      shelters: Array.isArray(resources.shelters) ? resources.shelters : [],

      schools: Array.isArray(resources.schools) ? resources.schools : [],
    };
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  function renderSummary() {
    Object.entries(categoryConfig).forEach(([category, config]) => {
      setText(config.countId, resourceData[category]?.length || 0);
    });

    const total = Object.values(resourceData).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    setText("resourceTotalCount", total);
  }

  // =====================================================
  // RENDER RESOURCES
  // =====================================================

  function renderResources() {
    const list = document.getElementById("resourceList");

    if (!list) {
      return;
    }

    let groups = [];

    // ---------------------------------------------
    // ALL
    // ---------------------------------------------

    if (activeCategory === "all") {
      groups = Object.keys(categoryConfig);
    } else if (categoryConfig[activeCategory]) {
      groups = [activeCategory];
    }

    list.innerHTML = "";

    let totalRendered = 0;

    groups.forEach((category) => {
      const config = categoryConfig[category];

      const resources = resourceData[category] || [];

      if (!resources.length) {
        return;
      }

      resources.forEach((resource) => {
        const element = createResourceElement(resource, category, config);

        list.appendChild(element);

        totalRendered++;
      });
    });

    // ---------------------------------------------
    // EMPTY
    // ---------------------------------------------

    if (totalRendered === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span>⌂</span>

          <p>
            No nearby ${
              activeCategory === "all"
                ? "resources"
                : categoryConfig[activeCategory]?.name.toLowerCase() ||
                  "resources"
            }
            found
          </p>
        </div>
      `;
    }

    updateResultCount(totalRendered);
  }

  // =====================================================
  // RESOURCE CARD
  // =====================================================

  function createResourceElement(resource, category, config) {
    const element = document.createElement("div");

    element.className = "full-resource-item";

    const name = resource.name || resource.title || "Unnamed Resource";

    const address =
      resource.address ||
      resource.formatted ||
      resource.location ||
      config.name;

    const distance = formatDistance(resource.distance);

    element.innerHTML = `
      <div class="resource-item-icon">
        ${config.icon}
      </div>

      <div class="resource-item-content">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <p>
          ${escapeHTML(address)}
        </p>

        <div class="resource-item-meta">

          <span>
            ${escapeHTML(config.name)}
          </span>

          ${
            distance
              ? `
                <span>
                  ${escapeHTML(distance)}
                </span>
              `
              : ""
          }

        </div>

      </div>
    `;

    return element;
  }

  // =====================================================
  // RESULT COUNT
  // =====================================================

  function updateResultCount(count) {
    setText("resourceResultCount", count);

    const title = document.getElementById("resourceResultTitle");

    if (title) {
      if (activeCategory === "all") {
        title.textContent = "Nearby Resources";
      } else {
        title.textContent = categoryConfig[activeCategory]?.name || "Resources";
      }
    }
  }

  // =====================================================
  // DISTANCE
  // =====================================================

  function formatDistance(distance) {
    if (distance === undefined || distance === null || distance === "") {
      return "";
    }

    const value = Number(distance);

    if (Number.isNaN(value)) {
      return "";
    }

    if (value < 1000) {
      return `${Math.round(value)} m away`;
    }

    return `${(value / 1000).toFixed(1)} km away`;
  }

  // =====================================================
  // ERROR
  // =====================================================

  function showResourceError(message) {
    const list = document.getElementById("resourceList");

    if (!list) {
      return;
    }

    list.innerHTML = `
      <div class="empty-state">

        <span>⚠</span>

        <p>
          ${escapeHTML(message)}
        </p>

      </div>
    `;
  }

  // =====================================================
  // SET TEXT
  // =====================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

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

  // =====================================================
  // EXPOSE
  // =====================================================

  window.initResourcesOverlay = initResourcesOverlay;

  // Optional external refresh
  window.refreshResources = loadResources;

  console.log("✅ DisasterOS resources.js loaded");
})();
