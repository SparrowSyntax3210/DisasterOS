/* =========================================================
   DISASTEROS — RESOURCES MODULE
   Number: 6
   Backend:
   GET /api/resources
   GET /api/resources/:id
   POST /api/resources
   PATCH /api/resources/:id
   DELETE /api/resources/:id

   Map resources:
   GET /api/map/resources?lat=&lng=
   ========================================================= */

(() => {
  "use strict";

  const API_BASE_URL =
    window.APP_CONFIG?.API_BASE_URL ||
    "http://localhost:4000/api";

  const LOCATION_KEY = "disasterOS_location";

  let resources = [];
  let mapResources = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    schools: [],
    shelters: []
  };

  let currentFilter = "ALL";

  // =========================================================
  // DOM READY
  // =========================================================

  document.addEventListener("DOMContentLoaded", () => {
    initResourcesModule();
  });

  async function initResourcesModule() {
    injectResourcesPage();

    setupEvents();

    const location = getSavedLocation();

    if (!location) {
      showLocationRequired();
      return;
    }

    updateLocationUI(location);

    await Promise.all([
      loadResources(),
      loadNearbyMapResources(location)
    ]);

    renderAll();
  }

  // =========================================================
  // LOCATION
  // =========================================================

  function getSavedLocation() {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);

      if (!saved) return null;

      const location = JSON.parse(saved);

      if (
        location.latitude === undefined ||
        location.longitude === undefined
      ) {
        return null;
      }

      return {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        name:
          location.name ||
          location.address ||
          "Selected Location"
      };
    } catch (error) {
      console.error("Location read error:", error);
      return null;
    }
  }

  function updateLocationUI(location) {
    const locationText =
      document.getElementById("resourcesLocation");

    if (locationText) {
      locationText.textContent =
        `${location.name} • ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
    }
  }

  function showLocationRequired() {
    const container =
      document.getElementById("resourcesContent");

    if (!container) return;

    container.innerHTML = `
      <div class="resource-location-warning">
        <div class="warning-icon">📍</div>

        <h2>Location Required</h2>

        <p>
          Please select your disaster response location first.
          Resources will be loaded around your selected location.
        </p>

        <button
          class="resource-primary-btn"
          id="goToLocationBtn"
        >
          Select Location
        </button>
      </div>
    `;

    document
      .getElementById("goToLocationBtn")
      ?.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
  }

  // =========================================================
  // API HELPER
  // =========================================================

  async function apiRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          `Request failed with status ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // =========================================================
  // LOAD DATABASE RESOURCES
  // =========================================================

  async function loadResources() {
    try {
      showLoading();

      const response = await apiRequest(
        `${API_BASE_URL}/resources`
      );

      resources = response.data || [];

      updateDatabaseResourceCount();

    } catch (error) {
      console.error("Could not load resources:", error);

      resources = [];

      showToast(
        "Unable to load managed resources.",
        "error"
      );
    }
  }

  // =========================================================
  // LOAD NEARBY MAP RESOURCES
  // =========================================================

  async function loadNearbyMapResources(location) {
    try {
      const url =
        `${API_BASE_URL}/map/resources` +
        `?lat=${encodeURIComponent(location.latitude)}` +
        `&lng=${encodeURIComponent(location.longitude)}`;

      const response = await apiRequest(url);

      mapResources = {
        hospitals: response.resources?.hospitals || [],
        policeStations:
          response.resources?.policeStations || [],
        fireStations:
          response.resources?.fireStations || [],
        pharmacies:
          response.resources?.pharmacies || [],
        schools:
          response.resources?.schools || [],
        shelters:
          response.resources?.shelters || []
      };

    } catch (error) {
      console.error(
        "Could not load nearby resources:",
        error
      );

      mapResources = {
        hospitals: [],
        policeStations: [],
        fireStations: [],
        pharmacies: [],
        schools: [],
        shelters: []
      };

      showToast(
        "Nearby resource data unavailable.",
        "error"
      );
    }
  }

  // =========================================================
  // NORMALIZE MAP RESOURCE DATA
  // =========================================================

  function normalizeNearbyResources() {
    const normalized = [];

    const groups = [
      {
        key: "hospitals",
        type: "HOSPITAL",
        label: "Hospitals"
      },
      {
        key: "policeStations",
        type: "POLICE",
        label: "Police Stations"
      },
      {
        key: "fireStations",
        type: "FIRE",
        label: "Fire Stations"
      },
      {
        key: "pharmacies",
        type: "PHARMACY",
        label: "Pharmacies"
      },
      {
        key: "schools",
        type: "SCHOOL",
        label: "Schools"
      },
      {
        key: "shelters",
        type: "SHELTER",
        label: "Shelters"
      }
    ];

    groups.forEach(group => {
      const list = mapResources[group.key] || [];

      list.forEach(item => {
        normalized.push({
          id:
            item.place_id ||
            item.id ||
            cryptoRandomId(),

          name:
            item.name ||
            item.address_line1 ||
            "Unnamed Resource",

          type: group.type,

          category: group.label,

          latitude:
            Number(
              item.lat ??
              item.latitude ??
              item.geometry?.coordinates?.[1]
            ),

          longitude:
            Number(
              item.lon ??
              item.lng ??
              item.longitude ??
              item.geometry?.coordinates?.[0]
            ),

          address:
            item.address_line1 ||
            item.formatted ||
            item.address ||
            "Address unavailable",

          phone:
            item.phone ||
            item.contact?.phone ||
            null,

          source: "NEARBY"
        });
      });
    });

    return normalized;
  }

  // =========================================================
  // COMBINE RESOURCES
  // =========================================================

  function getAllDisplayResources() {
    const nearby = normalizeNearbyResources();

    const managed = resources.map(resource => ({
      ...resource,
      source: "MANAGED",
      name:
        resource.name ||
        resource.title ||
        "Unnamed Resource",

      type:
        resource.type ||
        "OTHER"
    }));

    return [...managed, ...nearby];
  }

  // =========================================================
  // RENDER
  // =========================================================

  function renderAll() {
    renderStats();
    renderCategoryCards();
    renderResourceList();
  }

  function renderStats() {
    const all = getAllDisplayResources();

    const total =
      document.getElementById("resourceTotal");

    const hospitals =
      document.getElementById("resourceHospitals");

    const police =
      document.getElementById("resourcePolice");

    const emergency =
      document.getElementById("resourceEmergency");

    if (total) {
      total.textContent = all.length;
    }

    if (hospitals) {
      hospitals.textContent =
        all.filter(r =>
          normalizeType(r.type) === "HOSPITAL"
        ).length;
    }

    if (police) {
      police.textContent =
        all.filter(r =>
          normalizeType(r.type) === "POLICE"
        ).length;
    }

    if (emergency) {
      emergency.textContent =
        all.filter(r =>
          ["FIRE", "AMBULANCE", "EMERGENCY"].includes(
            normalizeType(r.type)
          )
        ).length;
    }
  }

  // =========================================================
  // CATEGORY CARDS
  // =========================================================

  function renderCategoryCards() {
    const container =
      document.getElementById("resourceCategories");

    if (!container) return;

    const all = getAllDisplayResources();

    const categories = [
      {
        type: "HOSPITAL",
        title: "Hospitals",
        icon: "🏥"
      },
      {
        type: "POLICE",
        title: "Police",
        icon: "🚔"
      },
      {
        type: "FIRE",
        title: "Fire Stations",
        icon: "🚒"
      },
      {
        type: "PHARMACY",
        title: "Pharmacies",
        icon: "💊"
      },
      {
        type: "SHELTER",
        title: "Shelters",
        icon: "🏠"
      },
      {
        type: "SCHOOL",
        title: "Schools",
        icon: "🏫"
      }
    ];

    container.innerHTML = categories
      .map(category => {
        const count = all.filter(
          resource =>
            normalizeType(resource.type) ===
            category.type
        ).length;

        return `
          <button
            class="resource-category-card ${
              currentFilter === category.type
                ? "active"
                : ""
            }"
            data-resource-filter="${category.type}"
          >
            <span class="resource-category-icon">
              ${category.icon}
            </span>

            <span class="resource-category-title">
              ${category.title}
            </span>

            <span class="resource-category-count">
              ${count}
            </span>
          </button>
        `;
      })
      .join("");
  }

  // =========================================================
  // RESOURCE LIST
  // =========================================================

  function renderResourceList() {
    const container =
      document.getElementById("resourceList");

    if (!container) return;

    let list = getAllDisplayResources();

    if (currentFilter !== "ALL") {
      list = list.filter(
        resource =>
          normalizeType(resource.type) ===
          currentFilter
      );
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="resource-empty">
          <div class="resource-empty-icon">📭</div>
          <h3>No resources found</h3>
          <p>
            There are no resources available for this
            category around the selected location.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = list
      .map(resource => createResourceCard(resource))
      .join("");
  }

  function createResourceCard(resource) {
    const type = normalizeType(resource.type);

    const iconMap = {
      HOSPITAL: "🏥",
      POLICE: "🚔",
      FIRE: "🚒",
      PHARMACY: "💊",
      SHELTER: "🏠",
      SCHOOL: "🏫",
      AMBULANCE: "🚑",
      OTHER: "📦"
    };

    const icon = iconMap[type] || "📦";

    const coordinatesValid =
      Number.isFinite(resource.latitude) &&
      Number.isFinite(resource.longitude);

    return `
      <article class="resource-card">

        <div class="resource-card-icon">
          ${icon}
        </div>

        <div class="resource-card-content">

          <div class="resource-card-header">
            <div>
              <span class="resource-type">
                ${escapeHTML(type)}
              </span>

              <h3>
                ${escapeHTML(resource.name)}
              </h3>
            </div>

            <span class="resource-source ${
              resource.source === "MANAGED"
                ? "managed"
                : "nearby"
            }">
              ${
                resource.source === "MANAGED"
                  ? "MANAGED"
                  : "NEARBY"
              }
            </span>
          </div>

          <p class="resource-address">
            📍 ${escapeHTML(
              resource.address ||
              "Address unavailable"
            )}
          </p>

          ${
            resource.status
              ? `
                <span class="resource-status">
                  ${escapeHTML(resource.status)}
                </span>
              `
              : ""
          }

          <div class="resource-card-actions">

            ${
              coordinatesValid
                ? `
                  <button
                    class="resource-action-btn navigate-btn"
                    data-lat="${resource.latitude}"
                    data-lng="${resource.longitude}"
                  >
                    Navigate
                  </button>
                `
                : ""
            }

            ${
              resource.phone
                ? `
                  <a
                    class="resource-action-btn call-btn"
                    href="tel:${escapeHTML(resource.phone)}"
                  >
                    Call
                  </a>
                `
                : ""
            }

          </div>

        </div>

      </article>
    `;
  }

  // =========================================================
  // EVENTS
  // =========================================================

  function setupEvents() {
    document.addEventListener("click", event => {
      const category =
        event.target.closest(
          "[data-resource-filter]"
        );

      if (category) {
        currentFilter =
          category.dataset.resourceFilter;

        renderCategoryCards();
        renderResourceList();

        return;
      }

      const navigateBtn =
        event.target.closest(".navigate-btn");

      if (navigateBtn) {
        const lat =
          Number(navigateBtn.dataset.lat);

        const lng =
          Number(navigateBtn.dataset.lng);

        openNavigation(lat, lng);
      }

      const refreshBtn =
        event.target.closest("#refreshResourcesBtn");

      if (refreshBtn) {
        refreshResources();
      }

      const allBtn =
        event.target.closest("#showAllResourcesBtn");

      if (allBtn) {
        currentFilter = "ALL";

        renderCategoryCards();
        renderResourceList();
      }
    });

    const search =
      document.getElementById("resourceSearch");

    if (search) {
      search.addEventListener("input", () => {
        searchResources(search.value);
      });
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  function searchResources(query) {
    const container =
      document.getElementById("resourceList");

    if (!container) return;

    const value =
      query.trim().toLowerCase();

    let list = getAllDisplayResources();

    if (currentFilter !== "ALL") {
      list = list.filter(
        resource =>
          normalizeType(resource.type) ===
          currentFilter
      );
    }

    if (value) {
      list = list.filter(resource => {
        const searchable = `
          ${resource.name}
          ${resource.type}
          ${resource.address}
        `.toLowerCase();

        return searchable.includes(value);
      });
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="resource-empty">
          <div class="resource-empty-icon">🔎</div>
          <h3>No matching resources</h3>
          <p>
            Try another search term or category.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = list
      .map(resource => createResourceCard(resource))
      .join("");
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  function openNavigation(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      showToast(
        "Invalid destination coordinates.",
        "error"
      );

      return;
    }

    const location = getSavedLocation();

    let url;

    if (location) {
      url =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${location.latitude},${location.longitude}` +
        `&destination=${lat},${lng}`;
    } else {
      url =
        `https://www.google.com/maps/search/?api=1` +
        `&query=${lat},${lng}`;
    }

    window.open(url, "_blank");
  }

  // =========================================================
  // REFRESH
  // =========================================================

  async function refreshResources() {
    const location = getSavedLocation();

    if (!location) {
      showLocationRequired();
      return;
    }

    const button =
      document.getElementById("refreshResourcesBtn");

    if (button) {
      button.classList.add("loading");
      button.disabled = true;
    }

    await Promise.all([
      loadResources(),
      loadNearbyMapResources(location)
    ]);

    renderAll();

    if (button) {
      button.classList.remove("loading");
      button.disabled = false;
    }

    showToast(
      "Resources refreshed successfully.",
      "success"
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  function showLoading() {
    const container =
      document.getElementById("resourceList");

    if (!container) return;

    container.innerHTML = `
      <div class="resource-loading">
        <div class="resource-spinner"></div>
        <p>Scanning nearby emergency resources...</p>
      </div>
    `;
  }

  // =========================================================
  // COUNTERS
  // =========================================================

  function updateDatabaseResourceCount() {
    const element =
      document.getElementById(
        "managedResourceCount"
      );

    if (element) {
      element.textContent = resources.length;
    }
  }

  // =========================================================
  // TYPE NORMALIZATION
  // =========================================================

  function normalizeType(type) {
    if (!type) return "OTHER";

    const normalized =
      String(type)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    const aliases = {
      HOSPITALS: "HOSPITAL",
      POLICE_STATION: "POLICE",
      POLICE_STATIONS: "POLICE",
      FIRE_STATION: "FIRE",
      FIRE_STATIONS: "FIRE",
      PHARMACIES: "PHARMACY",
      SHELTERS: "SHELTER",
      SCHOOLS: "SCHOOL"
    };

    return aliases[normalized] || normalized;
  }

  // =========================================================
  // HTML SAFETY
  // =========================================================

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cryptoRandomId() {
    return (
      "resource-" +
      Math.random()
        .toString(36)
        .substring(2, 11)
    );
  }

  // =========================================================
  // TOAST
  // =========================================================

  function showToast(message, type = "info") {
    let container =
      document.getElementById("resourceToastContainer");

    if (!container) {
      container = document.createElement("div");

      container.id =
        "resourceToastContainer";

      container.className =
        "resource-toast-container";

      document.body.appendChild(container);
    }

    const toast =
      document.createElement("div");

    toast.className =
      `resource-toast ${type}`;

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hide");

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  window.DisasterOSResources = {
    refresh: refreshResources,

    reload: initResourcesModule,

    getResources: () =>
      getAllDisplayResources()
  };
})();