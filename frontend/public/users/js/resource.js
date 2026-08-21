// =========================================================
// DISASTEROS RESOURCES
// Nearby emergency resources - NO MAP MARKERS
// =========================================================

(function () {
  "use strict";

  console.log("🏥 DisasterOS Resources JS loading...");

  // =======================================================
  // STATE
  // =======================================================

  let initialized = false;
  let loading = false;

  let activeCategory = "all";

  let resourceData = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    shelters: [],
    schools: [],
  };

  // =======================================================
  // CATEGORY CONFIG
  // =======================================================

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

  // =======================================================
  // API
  // =======================================================

  function getAPI() {
    return window.API || window.API_BASE || "http://localhost:4000";
  }

  // =======================================================
  // LOCATION
  // =======================================================

  function getLocation() {
    /*
     * Prefer dashboard location.
     */

    if (
      window.currentLocation &&
      window.currentLocation.latitude !== null &&
      window.currentLocation.latitude !== undefined &&
      window.currentLocation.longitude !== null &&
      window.currentLocation.longitude !== undefined
    ) {
      return window.currentLocation;
    }

    /*
     * Fallback to DisasterOS dashboard.
     */

    if (window.DisasterOSDashboard && window.DisasterOSDashboard.location) {
      return window.DisasterOSDashboard.location;
    }

    /*
     * Final fallback.
     */

    if (
      window.dashboardLocation &&
      window.dashboardLocation.latitude !== null &&
      window.dashboardLocation.longitude !== null
    ) {
      return window.dashboardLocation;
    }

    return null;
  }

  // =======================================================
  // INITIALIZE
  // =======================================================

  function initResourcesOverlay() {
    console.log("🏥 Initializing DisasterOS Resources...");

    if (!initialized) {
      initialized = true;

      bindControls();
    }

    const location = getLocation();

    if (location) {
      loadResources();
    } else {
      console.warn(
        "⚠ Resources: location not available yet. Waiting for dashboard.",
      );

      showResourceLoading("Waiting for your location...");
    }
  }

  // =======================================================
  // CONTROLS
  // =======================================================

  function bindControls() {
    // -------------------------------------------------------
    // CATEGORY FILTERS
    // -------------------------------------------------------

    document.querySelectorAll(".resource-filter").forEach((button) => {
      button.addEventListener("click", function () {
        document.querySelectorAll(".resource-filter").forEach((btn) => {
          btn.classList.remove("active");
        });

        this.classList.add("active");

        activeCategory = this.dataset.category || "all";

        console.log("🔎 Resource category:", activeCategory);

        renderResources();
      });
    });

    // -------------------------------------------------------
    // REFRESH
    // -------------------------------------------------------

    const refreshButton = document.getElementById("resourcesRefresh");

    if (refreshButton) {
      refreshButton.addEventListener("click", async () => {
        if (loading) {
          return;
        }

        refreshButton.disabled = true;

        try {
          await loadResources();
        } finally {
          refreshButton.disabled = false;
        }
      });
    }
  }

  // =======================================================
  // LOAD RESOURCES
  // =======================================================

  async function loadResources() {
    if (loading) {
      console.log("⏳ Resource request already running...");
      return;
    }

    const location = getLocation();

    if (
      !location ||
      location.latitude === null ||
      location.latitude === undefined ||
      location.longitude === null ||
      location.longitude === undefined
    ) {
      console.warn("⚠ Resources: location unavailable");

      showResourceError("Location unavailable. Please allow location access.");

      return;
    }

    loading = true;

    showResourceLoading("Finding nearby emergency resources...");

    try {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error("Invalid location coordinates");
      }

      console.log("📍 Loading resources near:", latitude, longitude);

      const url =
        `${getAPI()}/api/map/resources` +
        `?lat=${encodeURIComponent(latitude)}` +
        `&lng=${encodeURIComponent(longitude)}`;

      console.log("🌐 Resource API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Resource API returned HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log("📦 Raw resource response:", result);

      if (!result || result.success === false) {
        throw new Error(result?.message || "Unable to load nearby resources");
      }

      /*
       * Support all common backend response formats.
       */

      const rawResources =
        result.resources ||
        result.data?.resources ||
        result.data ||
        result.results ||
        {};

      resourceData = normalizeResources(rawResources);

      console.log("✅ Normalized resources:", resourceData);

      console.log("🏥 Hospitals:", resourceData.hospitals.length);

      console.log("👮 Police:", resourceData.policeStations.length);

      console.log("🚒 Fire:", resourceData.fireStations.length);

      console.log("💊 Pharmacies:", resourceData.pharmacies.length);

      console.log("🏠 Shelters:", resourceData.shelters.length);

      console.log("🏫 Schools:", resourceData.schools.length);

      renderSummary();

      renderResources();

      /*
       * Make resources available to other DisasterOS
       * components.
       */

      window.DisasterOSResources = {
        data: resourceData,
        category: activeCategory,
        location: location,
      };

      /*
       * Notify other components.
       */

      window.dispatchEvent(
        new CustomEvent("disasterOSResourcesReady", {
          detail: {
            location,
            resources: resourceData,
          },
        }),
      );
    } catch (error) {
      console.error("❌ Resources Error:", error);

      resourceData = {
        hospitals: [],
        policeStations: [],
        fireStations: [],
        pharmacies: [],
        shelters: [],
        schools: [],
      };

      renderSummary();

      showResourceError("Unable to load nearby resources.");
    } finally {
      loading = false;
    }
  }

  // =======================================================
  // NORMALIZE RESOURCES
  // =======================================================

  function normalizeResources(resources) {
    /*
     * Some APIs return:
     *
     * {
     *   hospitals: [],
     *   policeStations: []
     * }
     *
     * Some return:
     *
     * {
     *   hospitals: {
     *      places: []
     *   }
     * }
     *
     * Handle both.
     */

    if (!resources || typeof resources !== "object") {
      return createEmptyResourceData();
    }

    return {
      hospitals: normalizeResourceArray(resources.hospitals),

      policeStations: normalizeResourceArray(
        resources.policeStations || resources.police,
      ),

      fireStations: normalizeResourceArray(
        resources.fireStations || resources.fire,
      ),

      pharmacies: normalizeResourceArray(
        resources.pharmacies || resources.pharmacy,
      ),

      shelters: normalizeResourceArray(resources.shelters || resources.shelter),

      schools: normalizeResourceArray(resources.schools || resources.school),
    };
  }

  // =======================================================
  // NORMALIZE RESOURCE ARRAY
  // =======================================================

  function normalizeResourceArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    /*
     * Geoapify / backend wrapper:
     *
     * {
     *   places: [...]
     * }
     */

    if (value && Array.isArray(value.places)) {
      return value.places;
    }

    /*
     * Some APIs:
     *
     * {
     *   features: [...]
     * }
     */

    if (value && Array.isArray(value.features)) {
      return value.features;
    }

    /*
     * Single object.
     */

    if (value && typeof value === "object") {
      return [value];
    }

    return [];
  }

  // =======================================================
  // EMPTY RESOURCE DATA
  // =======================================================

  function createEmptyResourceData() {
    return {
      hospitals: [],
      policeStations: [],
      fireStations: [],
      pharmacies: [],
      shelters: [],
      schools: [],
    };
  }

  // =======================================================
  // SUMMARY
  // =======================================================

  function renderSummary() {
    Object.entries(categoryConfig).forEach(([category, config]) => {
      const resources = resourceData[category] || [];

      setText(config.countId, resources.length);
    });

    const total = Object.values(resourceData).reduce(
      (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
      0,
    );

    setText("resourceTotalCount", total);

    console.log("📊 Resource summary:", {
      total,
      hospitals: resourceData.hospitals.length,
      police: resourceData.policeStations.length,
      fire: resourceData.fireStations.length,
      pharmacies: resourceData.pharmacies.length,
      shelters: resourceData.shelters.length,
      schools: resourceData.schools.length,
    });
  }

  // =======================================================
  // RENDER RESOURCES
  // =======================================================

  function renderResources() {
    const list = document.getElementById("resourceList");

    if (!list) {
      console.warn("⚠ #resourceList not found");

      return;
    }

    let groups = [];

    // -------------------------------------------------------
    // ALL
    // -------------------------------------------------------

    if (activeCategory === "all") {
      groups = Object.keys(categoryConfig);
    }

    // -------------------------------------------------------
    // SPECIFIC CATEGORY
    // -------------------------------------------------------
    else if (categoryConfig[activeCategory]) {
      groups = [activeCategory];
    }

    list.innerHTML = "";

    let totalRendered = 0;

    // =======================================================
    // RENDER EACH CATEGORY
    // =======================================================

    groups.forEach((category) => {
      const config = categoryConfig[category];

      const resources = Array.isArray(resourceData[category])
        ? resourceData[category]
        : [];

      if (!resources.length) {
        return;
      }

      /*
       * When "all" is selected, add a category heading.
       */

      if (activeCategory === "all") {
        const heading = document.createElement("div");

        heading.className = "resource-category-heading";

        heading.innerHTML = `
          <span class="resource-category-icon">
            ${config.icon}
          </span>

          <strong>
            ${escapeHTML(config.name)}
          </strong>

          <span class="resource-category-count">
            ${resources.length}
          </span>
        `;

        list.appendChild(heading);
      }

      // -----------------------------------------------------
      // RESOURCES
      // -----------------------------------------------------

      resources.forEach((resource) => {
        const element = createResourceElement(resource, category, config);

        list.appendChild(element);

        totalRendered++;
      });
    });

    // =======================================================
    // EMPTY
    // =======================================================

    if (totalRendered === 0) {
      const categoryName =
        activeCategory === "all"
          ? "resources"
          : categoryConfig[activeCategory]?.name?.toLowerCase() || "resources";

      list.innerHTML = `
        <div class="empty-state">

          <span>⌂</span>

          <p>
            No nearby ${escapeHTML(categoryName)} found
          </p>

        </div>
      `;
    }

    updateResultCount(totalRendered);

    console.log(`📋 Rendered ${totalRendered} resources`);
  }

  // =======================================================
  // CREATE RESOURCE ELEMENT
  // =======================================================

  function createResourceElement(resource, category, config) {
    const element = document.createElement("div");

    element.className = "full-resource-item";

    /*
     * IMPORTANT:
     *
     * Geoapify may return:
     *
     * {
     *   name,
     *   address,
     *   formatted,
     *   distance
     * }
     *
     * OR:
     *
     * {
     *   properties: {
     *      name,
     *      address_line1,
     *      address_line2,
     *      formatted
     *   }
     * }
     *
     * So use getResourceName()
     * and getResourceAddress().
     */

    const name = getResourceName(resource, config);

    const address = getResourceAddress(resource, config);

    const distance = formatDistance(getResourceDistance(resource));

    const coordinates = getResourceCoordinates(resource);

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

    /*
     * Optional:
     * clicking a resource can expose its coordinates
     * to other DisasterOS components.
     */

    element.addEventListener("click", () => {
      console.log("📍 Resource selected:", resource);

      if (coordinates) {
        window.dispatchEvent(
          new CustomEvent("disasterOSResourceSelected", {
            detail: {
              resource,
              category,
              coordinates,
            },
          }),
        );
      }
    });

    return element;
  }

  // =======================================================
  // RESOURCE NAME
  // =======================================================

  function getResourceName(resource, config) {
    if (!resource) {
      return config.name;
    }

    const properties = resource.properties || {};

    /*
     * Most common fields.
     */

    const name =
      resource.name ||
      resource.title ||
      properties.name ||
      properties.name_en ||
      properties.official_name ||
      properties.operator ||
      resource.display_name;

    if (name && String(name).trim()) {
      return String(name).trim();
    }

    /*
     * Geoapify sometimes returns
     * address_line1 as the identifiable
     * place name when name is unavailable.
     */

    if (properties.address_line1 && String(properties.address_line1).trim()) {
      return String(properties.address_line1).trim();
    }

    return config.name;
  }

  // =======================================================
  // RESOURCE ADDRESS
  // =======================================================

  function getResourceAddress(resource, config) {
    if (!resource) {
      return config.name;
    }

    const properties = resource.properties || {};

    /*
     * Prefer a complete formatted address.
     */

    const formatted = resource.formatted || properties.formatted;

    if (formatted && String(formatted).trim()) {
      return String(formatted).trim();
    }

    /*
     * Standard address fields.
     */

    const directAddress =
      resource.address || resource.location || properties.address;

    if (directAddress && typeof directAddress === "string") {
      return directAddress;
    }

    /*
     * Build address from Geoapify fields.
     */

    const parts = [
      properties.address_line1,
      properties.address_line2,
      properties.street,
      properties.housenumber,
      properties.city,
      properties.state,
      properties.postcode,
      properties.country,
    ]
      .filter(
        (value) =>
          value !== undefined && value !== null && String(value).trim() !== "",
      )
      .map((value) => String(value).trim());

    /*
     * Remove duplicate values.
     */

    const uniqueParts = [...new Set(parts)];

    if (uniqueParts.length) {
      return uniqueParts.join(", ");
    }

    return "Address unavailable";
  }

  // =======================================================
  // RESOURCE DISTANCE
  // =======================================================

  function getResourceDistance(resource) {
    if (!resource) {
      return null;
    }

    const properties = resource.properties || {};

    return (
      resource.distance ??
      properties.distance ??
      resource.distanceMeters ??
      properties.distanceMeters ??
      null
    );
  }

  // =======================================================
  // RESOURCE COORDINATES
  // =======================================================

  function getResourceCoordinates(resource) {
    if (!resource) {
      return null;
    }

    const properties = resource.properties || {};

    let latitude =
      resource.latitude ??
      resource.lat ??
      properties.latitude ??
      properties.lat;

    let longitude =
      resource.longitude ??
      resource.lng ??
      resource.lon ??
      properties.longitude ??
      properties.lng ??
      properties.lon;

    /*
     * Geoapify GeoJSON:
     *
     * geometry.coordinates = [lng, lat]
     */

    if (
      (latitude === undefined || longitude === undefined) &&
      resource.geometry &&
      Array.isArray(resource.geometry.coordinates)
    ) {
      const coordinates = resource.geometry.coordinates;

      if (coordinates.length >= 2) {
        longitude = coordinates[0];

        latitude = coordinates[1];
      }
    }

    latitude = Number(latitude);
    longitude = Number(longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }

  // =======================================================
  // RESULT COUNT
  // =======================================================

  function updateResultCount(count) {
    setText("resourceResultCount", count);

    const title = document.getElementById("resourceResultTitle");

    if (!title) {
      return;
    }

    if (activeCategory === "all") {
      title.textContent = "Nearby Resources";
    } else {
      title.textContent = categoryConfig[activeCategory]?.name || "Resources";
    }
  }

  // =======================================================
  // DISTANCE
  // =======================================================

  function formatDistance(distance) {
    if (distance === undefined || distance === null || distance === "") {
      return "";
    }

    const value = Number(distance);

    if (Number.isNaN(value) || value < 0) {
      return "";
    }

    if (value < 1000) {
      return `${Math.round(value)} m away`;
    }

    return `${(value / 1000).toFixed(1)} km away`;
  }

  // =======================================================
  // LOADING
  // =======================================================

  function showResourceLoading(message) {
    const list = document.getElementById("resourceList");

    if (!list) {
      return;
    }

    list.innerHTML = `
      <div class="loading-state">

        <span>⟳</span>

        <p>
          ${escapeHTML(message)}
        </p>

      </div>
    `;
  }

  // =======================================================
  // ERROR
  // =======================================================

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

    updateResultCount(0);
  }

  // =======================================================
  // SET TEXT
  // =======================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = String(value);
    }
  }

  // =======================================================
  // ESCAPE HTML
  // =======================================================

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

  // =======================================================
  // PUBLIC API
  // =======================================================

  window.initResourcesOverlay = initResourcesOverlay;

  window.refreshResources = loadResources;

  window.DisasterOSResources = {
    get data() {
      return resourceData;
    },

    get category() {
      return activeCategory;
    },

    refresh: loadResources,

    showCategory(category) {
      if (category !== "all" && !categoryConfig[category]) {
        console.warn("⚠ Unknown resource category:", category);

        return;
      }

      activeCategory = category;

      /*
       * Synchronize filter buttons.
       */

      document.querySelectorAll(".resource-filter").forEach((button) => {
        button.classList.toggle(
          "active",
          (button.dataset.category || "all") === category,
        );
      });

      renderResources();
    },
  };

  // =======================================================
  // AUTO INITIALIZATION
  // =======================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResourcesOverlay);
  } else {
    initResourcesOverlay();
  }

  // =======================================================
  // DASHBOARD DATA READY
  // =======================================================

  window.addEventListener("disasterOSDataReady", (event) => {
    console.log("📡 Dashboard data ready → Resources");

    /*
     * Dashboard has now guaranteed that
     * currentLocation exists.
     */

    if (event.detail?.location) {
      window.currentLocation = {
        latitude: event.detail.location.latitude,

        longitude: event.detail.location.longitude,
      };
    }

    loadResources();
  });

  // =======================================================
  // LOCATION UPDATED
  // =======================================================

  window.addEventListener("disasterOSLocationChanged", () => {
    console.log("📍 Location changed → refreshing resources");

    loadResources();
  });

  console.log("✅ DisasterOS resources.js loaded");
})();
