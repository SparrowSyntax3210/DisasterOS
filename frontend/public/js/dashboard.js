// =========================================================
// DISASTEROS CITIZEN DASHBOARD
// =========================================================

(function () {
  "use strict";

  console.log("🚀 Loading DisasterOS Citizen Dashboard...");

  // =========================================================
  // GLOBAL STATE
  // =========================================================

  let dashboardLocation = {
    latitude: null,
    longitude: null,
  };

  let predictionData = null;
  let weatherData = null;
  let resourcesData = null;

  // =========================================================
  // DOM
  // =========================================================

  const locationText = document.getElementById("locationText");
  const userName = document.getElementById("userName");
  const lastUpdated = document.getElementById("lastUpdated");

  const riskLevel = document.getElementById("riskLevel");
  const riskProbability = document.getElementById("riskProbability");
  const riskProgress = document.getElementById("riskProgress");

  const temperature = document.getElementById("temperature");
  const weatherCondition = document.getElementById("weatherCondition");
  const weatherLocation = document.getElementById("weatherLocation");
  const humidity = document.getElementById("humidity");
  const windSpeed = document.getElementById("windSpeed");

  const alertCount = document.getElementById("alertCount");

  const hospitalCount = document.getElementById("hospitalCount");
  const fireCount = document.getElementById("fireCount");
  const policeCount = document.getElementById("policeCount");
  const shelterCount = document.getElementById("shelterCount");

  const pharmacyCount = document.getElementById("pharmacyCount");
  const schoolCount = document.getElementById("schoolCount");

  const recentAlerts = document.getElementById("recentAlerts");

  const notificationButton = document.getElementById("notificationButton");

  const locationButton = document.getElementById("locationButton");

  // =========================================================
  // INITIALIZE
  // =========================================================

  document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 DisasterOS Citizen Dashboard initialized");

    loadUser();

    await initializeDashboard();
  });

  // =========================================================
  // USER
  // =========================================================

  function loadUser() {
    const possibleKeys = ["user", "authUser", "currentUser", "loggedInUser"];

    let storedUser = null;

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        storedUser = JSON.parse(value);
      } catch {
        storedUser = {
          name: value,
        };
      }

      if (storedUser) {
        break;
      }
    }

    if (storedUser) {
      window.currentUser = storedUser;

      if (userName) {
        userName.textContent =
          storedUser.name ||
          storedUser.username ||
          storedUser.fullName ||
          storedUser.email ||
          "Citizen";
      }
    } else if (userName) {
      userName.textContent = "Citizen";
    }
  }

  // =========================================================
  // DASHBOARD INITIALIZATION
  // =========================================================

  async function initializeDashboard(options = {}) {
    const useExistingLocation = options.useExistingLocation === true;

    try {
      setDashboardLoading(true);

      // -------------------------------------------------------
      // LOCATION
      // -------------------------------------------------------

      if (
        !useExistingLocation ||
        dashboardLocation.latitude === null ||
        dashboardLocation.longitude === null
      ) {
        dashboardLocation = await getCurrentLocation();
      }

      if (
        !dashboardLocation ||
        dashboardLocation.latitude === null ||
        dashboardLocation.longitude === null
      ) {
        throw new Error("Unable to determine current location");
      }

      // -------------------------------------------------------
      // GLOBAL LOCATION
      // -------------------------------------------------------

      window.currentLocation = {
        latitude: Number(dashboardLocation.latitude),
        longitude: Number(dashboardLocation.longitude),
      };

      console.log("📍 Dashboard location:", window.currentLocation);

      updateLocationUI();

      // -------------------------------------------------------
      // LOAD DATA
      // -------------------------------------------------------

      await Promise.all([
        loadPrediction(),
        loadWeather(),
        loadResources(),
        loadAlerts(),
      ]);

      // -------------------------------------------------------
      // UPDATED TIME
      // -------------------------------------------------------

      updateLastUpdated();

      // -------------------------------------------------------
      // DATA READY EVENT
      // -------------------------------------------------------

      window.dispatchEvent(
        new CustomEvent("disasterOSDataReady", {
          detail: {
            location: {
              ...dashboardLocation,
            },

            prediction: predictionData,

            weather: weatherData,

            resources: resourcesData,
          },
        }),
      );

      console.log("📡 disasterOSDataReady dispatched");
    } catch (error) {
      console.error("❌ Dashboard initialization failed:", error);

      showDashboardError(error?.message || "Dashboard initialization failed");
    } finally {
      setDashboardLoading(false);
    }
  }

  // =========================================================
  // LOCATION UI
  // =========================================================

  function updateLocationUI() {
    if (!locationText) {
      return;
    }

    if (
      dashboardLocation.latitude === null ||
      dashboardLocation.longitude === null
    ) {
      locationText.textContent = "Location unavailable";

      return;
    }

    locationText.textContent = formatCoordinates(
      dashboardLocation.latitude,
      dashboardLocation.longitude,
    );
  }

  // =========================================================
  // PREDICTION
  // =========================================================

  async function loadPrediction() {
    if (!hasValidLocation()) {
      return;
    }

    try {
      const response = await getPrediction(
        dashboardLocation.latitude,
        dashboardLocation.longitude,
      );

      if (!response || response.success === false) {
        throw new Error(response?.message || "Prediction failed");
      }

      predictionData = response.data || response.prediction || response;

      console.log("🤖 Prediction:", predictionData);

      renderPrediction();
    } catch (error) {
      console.error("❌ Prediction error:", error);

      predictionData = null;

      if (riskLevel) {
        riskLevel.textContent = "UNAVAILABLE";

        riskLevel.style.color = "var(--text-muted)";
      }

      if (riskProbability) {
        riskProbability.textContent = "Probability unavailable";
      }

      if (riskProgress) {
        riskProgress.style.width = "0%";
      }
    }
  }

  // =========================================================
  // RENDER PREDICTION
  // =========================================================

  function renderPrediction() {
    if (!predictionData) {
      return;
    }

    const prediction = predictionData.prediction || predictionData || {};

    const risk = String(
      prediction.risk || prediction.riskLevel || "LOW",
    ).toUpperCase();

    let probability = Number(
      prediction.probability ?? prediction.riskProbability ?? 0,
    );

    if (!Number.isFinite(probability)) {
      probability = 0;
    }

    probability = Math.min(100, Math.max(0, probability));

    if (riskLevel) {
      riskLevel.textContent = risk;
    }

    if (riskProbability) {
      riskProbability.textContent = `${probability}% probability`;
    }

    if (riskProgress) {
      riskProgress.style.width = `${probability}%`;

      if (risk === "EXTREME" || risk === "CRITICAL") {
        riskProgress.style.background = "var(--danger)";

        if (riskLevel) {
          riskLevel.style.color = "var(--danger)";
        }
      } else if (risk === "HIGH") {
        riskProgress.style.background = "var(--warning)";

        if (riskLevel) {
          riskLevel.style.color = "var(--warning)";
        }
      } else {
        riskProgress.style.background = "var(--accent)";

        if (riskLevel) {
          riskLevel.style.color = "var(--accent)";
        }
      }
    }
  }

  // =========================================================
  // WEATHER
  // =========================================================

  async function loadWeather() {
    if (!hasValidLocation()) {
      return;
    }

    try {
      const response = await getLiveWeather(
        dashboardLocation.latitude,
        dashboardLocation.longitude,
      );

      if (!response || response.success === false) {
        throw new Error(response?.message || "Weather unavailable");
      }

      weatherData = response.data || response.weather || response;

      console.log("🌦 Weather:", weatherData);

      renderWeather();
    } catch (error) {
      console.error("❌ Weather error:", error);

      weatherData = null;

      if (weatherCondition) {
        weatherCondition.textContent = "Unavailable";
      }

      if (temperature) {
        temperature.textContent = "--";
      }

      if (humidity) {
        humidity.textContent = "--";
      }

      if (windSpeed) {
        windSpeed.textContent = "--";
      }
    }
  }

  // =========================================================
  // RENDER WEATHER
  // =========================================================

  function renderWeather() {
    if (!weatherData) {
      return;
    }

    const temperatureValue =
      weatherData.temperature ??
      weatherData.temp ??
      weatherData.temperatureCelsius ??
      "--";

    const humidityValue = weatherData.humidity ?? "--";

    const windValue =
      weatherData.windSpeed ??
      weatherData.wind_speed ??
      weatherData.wind ??
      "--";

    const condition =
      weatherData.condition ||
      weatherData.description ||
      weatherData.weather ||
      "Live conditions";

    if (temperature) {
      temperature.textContent = `${temperatureValue}°`;
    }

    if (humidity) {
      humidity.textContent = humidityValue;
    }

    if (windSpeed) {
      windSpeed.textContent = `${windValue} km/h`;
    }

    if (weatherCondition) {
      weatherCondition.textContent = condition;
    }

    if (weatherLocation) {
      weatherLocation.textContent = "Current location";
    }
  }

  // =========================================================
  // RESOURCES
  // =========================================================

  async function loadResources() {
    if (!hasValidLocation()) {
      console.warn("⚠️ Cannot load resources: location unavailable");

      return;
    }

    try {
      console.log("🌍 Loading nearby resources...");

      const response = await getMapResources(
        dashboardLocation.latitude,
        dashboardLocation.longitude,
      );

      console.log("📦 Raw resources API response:", response);

      if (!response || response.success === false) {
        throw new Error(response?.message || "Resources API failed");
      }

      const rawResources =
        response.resources ||
        response.data?.resources ||
        response.results ||
        response.data?.results ||
        response.data ||
        {};

      resourcesData = normalizeResources(rawResources);

      console.log("✅ Normalized resources:", resourcesData);

      renderResources();
    } catch (error) {
      console.error("❌ Resource error:", error);

      resourcesData = createEmptyResources();

      renderResources();

      /*
       * Resources failing should never
       * destroy the rest of the dashboard.
       */
    }
  }

  // =========================================================
  // NORMALIZE RESOURCES
  // =========================================================

  function normalizeResources(rawResources) {
    if (!rawResources || typeof rawResources !== "object") {
      return createEmptyResources();
    }

    return {
      hospitals: normalizeResourceArray(
        rawResources.hospitals || rawResources.hospital,
      ),

      policeStations: normalizeResourceArray(
        rawResources.policeStations ||
          rawResources.police ||
          rawResources.police_stations,
      ),

      fireStations: normalizeResourceArray(
        rawResources.fireStations ||
          rawResources.fire ||
          rawResources.fire_stations,
      ),

      pharmacies: normalizeResourceArray(
        rawResources.pharmacies || rawResources.pharmacy,
      ),

      schools: normalizeResourceArray(
        rawResources.schools || rawResources.school,
      ),

      shelters: normalizeResourceArray(
        rawResources.shelters || rawResources.shelter,
      ),
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
      schools: [],
      shelters: [],
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
  // RESOURCE COUNTS
  // =========================================================

  function renderResources() {
    if (!resourcesData) {
      resourcesData = createEmptyResources();
    }

    const hospitals = normalizeResourceArray(resourcesData.hospitals);

    const policeStations = normalizeResourceArray(resourcesData.policeStations);

    const fireStations = normalizeResourceArray(resourcesData.fireStations);

    const pharmacies = normalizeResourceArray(resourcesData.pharmacies);

    const schools = normalizeResourceArray(resourcesData.schools);

    const shelters = normalizeResourceArray(resourcesData.shelters);

    setResourceCount(hospitalCount, hospitals.length);

    setResourceCount(policeCount, policeStations.length);

    setResourceCount(fireCount, fireStations.length);

    setResourceCount(shelterCount, shelters.length);

    setResourceCount(pharmacyCount, pharmacies.length);

    setResourceCount(schoolCount, schools.length);

    // -------------------------------------------------------
    // GLOBAL RESOURCE OBJECT
    // -------------------------------------------------------

    window.dashboardResources = {
      hospitals,
      policeStations,
      fireStations,
      pharmacies,
      schools,
      shelters,
    };

    console.log("📊 Resource counts:", {
      hospitals: hospitals.length,
      police: policeStations.length,
      fire: fireStations.length,
      pharmacies: pharmacies.length,
      schools: schools.length,
      shelters: shelters.length,
    });

    // -------------------------------------------------------
    // RESOURCE READY EVENT
    // -------------------------------------------------------

    window.dispatchEvent(
      new CustomEvent("disasterOSResourcesReady", {
        detail: {
          location: {
            ...dashboardLocation,
          },

          resources: window.dashboardResources,
        },
      }),
    );

    console.log("📡 disasterOSResourcesReady dispatched");
  }

  // =========================================================
  // RESOURCE COUNT HELPER
  // =========================================================

  function setResourceCount(element, value) {
    if (!element) {
      return;
    }

    element.textContent = String(value);
  }

  // =========================================================
  // ALERTS / INCIDENTS
  // =========================================================

  async function loadAlerts() {
    try {
      const response = await getIncidents();

      if (!response || response.success === false) {
        throw new Error(response?.message || "Unable to load incidents");
      }

      let incidents =
        response.data || response.incidents || response.results || [];

      /*
       * Some APIs return:
       *
       * {
       *   data: {
       *      incidents: []
       *   }
       * }
       */

      if (
        incidents &&
        !Array.isArray(incidents) &&
        Array.isArray(incidents.incidents)
      ) {
        incidents = incidents.incidents;
      }

      console.log("🚨 Incidents:", incidents);

      renderAlerts(Array.isArray(incidents) ? incidents : []);
    } catch (error) {
      console.warn("⚠ Alerts unavailable:", error);

      renderAlerts([]);
    }
  }

  // =========================================================
  // RENDER ALERTS
  // =========================================================

  function renderAlerts(incidents) {
    if (!recentAlerts) {
      return;
    }

    if (!Array.isArray(incidents) || incidents.length === 0) {
      recentAlerts.innerHTML = `
        <div class="empty-state">
          <span>✓</span>
          <p>No recent alerts</p>
        </div>
      `;

      if (alertCount) {
        alertCount.textContent = "0";
      }

      return;
    }

    const sortedIncidents = [...incidents].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();

      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();

      return dateB - dateA;
    });

    const latest = sortedIncidents.slice(0, 4);

    if (alertCount) {
      alertCount.textContent = String(incidents.length);
    }

    recentAlerts.innerHTML = latest
      .map((incident) => {
        const severity = String(incident.severity || "MEDIUM").toUpperCase();

        const icon =
          severity === "CRITICAL" || severity === "HIGH" ? "🚨" : "⚠";

        return `
            <div class="alert-item">

              <div class="alert-icon">
                ${icon}
              </div>

              <div>

                <strong>
                  ${escapeHTML(incident.type || "Incident")}
                </strong>

                <p>
                  ${escapeHTML(
                    incident.description || "Emergency incident reported.",
                  )}
                </p>

                <time>
                  ${formatDate(incident.createdAt || incident.created_at)}
                </time>

              </div>

            </div>
          `;
      })
      .join("");
  }

  // =========================================================
  // LAST UPDATED
  // =========================================================

  function updateLastUpdated() {
    if (!lastUpdated) {
      return;
    }

    lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
  }

  // =========================================================
  // LOADING
  // =========================================================

  function setDashboardLoading(loading) {
    const cards = document.querySelectorAll(".info-card");

    cards.forEach((card) => {
      card.classList.toggle("loading", loading);
    });
  }

  // =========================================================
  // ERROR
  // =========================================================

  function showDashboardError(message) {
    console.error("Dashboard:", message);

    if (locationText) {
      locationText.textContent = "Using available data";
    }
  }

  // =========================================================
  // REFRESH
  // =========================================================

  async function refreshDashboard() {
    console.log("🔄 Refreshing DisasterOS dashboard...");

    /*
     * Request a fresh browser location.
     * This is intentional for a full refresh.
     */
    await initializeDashboard({
      useExistingLocation: false,
    });
  }

  // =========================================================
  // NOTIFICATION BUTTON
  // =========================================================

  if (notificationButton) {
    notificationButton.addEventListener("click", () => {
      window.location.href = "alerts.html";
    });
  }

  // =========================================================
  // LOCATION BUTTON
  // =========================================================

  if (locationButton) {
    locationButton.addEventListener("click", async () => {
      try {
        locationButton.disabled = true;

        if (locationText) {
          locationText.textContent = "Detecting...";
        }

        /*
         * Get location exactly once.
         */
        const newLocation = await getCurrentLocation();

        if (
          !newLocation ||
          newLocation.latitude === null ||
          newLocation.longitude === null
        ) {
          throw new Error("Location unavailable");
        }

        dashboardLocation = {
          latitude: Number(newLocation.latitude),
          longitude: Number(newLocation.longitude),
        };

        window.currentLocation = {
          ...dashboardLocation,
        };

        updateLocationUI();

        /*
         * IMPORTANT:
         *
         * Do NOT request location again.
         */
        await initializeDashboard({
          useExistingLocation: true,
        });
      } catch (error) {
        console.error("❌ Location refresh error:", error);

        if (locationText) {
          locationText.textContent = "Location unavailable";
        }
      } finally {
        locationButton.disabled = false;
      }
    });
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function hasValidLocation() {
    return (
      dashboardLocation &&
      Number.isFinite(Number(dashboardLocation.latitude)) &&
      Number.isFinite(Number(dashboardLocation.longitude))
    );
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCoordinates(latitude, longitude) {
    return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
  }

  function formatDate(date) {
    if (!date) {
      return "Recently";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Recently";
    }

    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =========================================================
  // PUBLIC DASHBOARD API
  // =========================================================

  window.DisasterOSDashboard = {
    refresh: refreshDashboard,

    get location() {
      return {
        ...dashboardLocation,
      };
    },

    get prediction() {
      return predictionData;
    },

    get weather() {
      return weatherData;
    },

    get resources() {
      return resourcesData;
    },

    isReady() {
      return (
        hasValidLocation() && predictionData !== null && weatherData !== null
      );
    },
  };

  // =========================================================
  // GLOBAL LOCATION
  // =========================================================

  Object.defineProperty(window, "dashboardLocation", {
    configurable: true,

    get() {
      return dashboardLocation;
    },
  });

  // =========================================================
  // DEBUG
  // =========================================================

  window.debugDisasterOSResources = function () {
    console.table({
      Hospitals: resourcesData?.hospitals?.length || 0,

      Police: resourcesData?.policeStations?.length || 0,

      Fire: resourcesData?.fireStations?.length || 0,

      Pharmacies: resourcesData?.pharmacies?.length || 0,

      Schools: resourcesData?.schools?.length || 0,

      Shelters: resourcesData?.shelters?.length || 0,
    });

    console.log("Full resources:", resourcesData);
  };

  console.log("✅ DisasterOS dashboard.js loaded");
})();
