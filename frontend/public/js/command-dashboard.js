"use strict";

console.log("📊 Command Dashboard Loaded");

const CommandDashboard = (() => {

  const API =
    window.COMMAND_API_BASE ||
    "http://localhost:4000/api";

  function requireLocation() {
    const location =
      CommandCenterData.getState().location;

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      throw new Error(
        "Operational location has not been selected."
      );
    }

    return {
      lat,
      lng,
    };
  }

  async function loadIncidents() {
    console.log(
      "📡 Loading incidents..."
    );

    const response =
      await commandApi.getIncidents();

    console.log(
      "📥 Incidents API:",
      response
    );

    const data =
      Array.isArray(response?.data)
        ? response.data
        : commandArray(
            response,
            ["incidents"]
          );

    CommandCenterData.setIncidents(
      data
    );

    return data;
  }

  async function loadMissions() {
    console.log(
      "📡 Loading missions..."
    );

    const response =
      await commandApi.getMissions();

    console.log(
      "📥 Missions API:",
      response
    );

    const data =
      Array.isArray(response?.data)
        ? response.data
        : commandArray(
            response,
            ["missions"]
          );

    CommandCenterData.setMissions(
      data
    );

    return data;
  }

  async function loadResources() {
    console.log(
      "📡 Loading resources..."
    );

    const response =
      await commandApi.getResources();

    console.log(
      "📥 Resources API:",
      response
    );

    const data =
      Array.isArray(response?.data)
        ? response.data
        : commandArray(
            response,
            ["resources"]
          );

    CommandCenterData.setResources(
      data
    );

    return data;
  }

  async function loadSOS() {
    console.log(
      "📡 Loading SOS..."
    );

    const response =
      await commandApi.getSOS();

    console.log(
      "📥 SOS API:",
      response
    );

    const data =
      Array.isArray(response?.data)
        ? response.data
        : commandArray(
            response,
            ["sos", "requests"]
          );

    CommandCenterData.setSOS(
      data
    );

    return data;
  }

  async function loadMapResources() {
    const { lat, lng } =
      requireLocation();

    const endpoint =
      `/map/resources?lat=${encodeURIComponent(
        lat
      )}&lng=${encodeURIComponent(
        lng
      )}`;

    console.log(
      "📡 GET",
      `${API}${endpoint}`
    );

    const response =
      await commandApiRequest(
        endpoint,
        {
          method: "GET",
        }
      );

    console.log(
      "📥 Map Resources API:",
      response
    );

    const resources =
      response?.resources || {};

    CommandCenterData.setMapResources(
      resources
    );

    return resources;
  }

  async function loadAll() {
    // NEVER load dashboard data without location.
    const location =
      requireLocation();

    console.log(
      "🚀 Loading Command Center data for:",
      location
    );

    CommandCenterData.setLoading(
      true
    );

    try {
      const results =
        await Promise.allSettled([
          loadIncidents(),
          loadMissions(),
          loadResources(),
          loadSOS(),
          loadMapResources(),
        ]);

      const names = [
        "incidents",
        "missions",
        "resources",
        "sos",
        "map resources",
      ];

      results.forEach(
        (result, index) => {
          if (
            result.status === "rejected"
          ) {
            console.error(
              `❌ ${names[index]} failed:`,
              result.reason
            );
          }
        }
      );

      CommandCenterData.calculateStats();

      console.log(
        "✅ Command Center data loaded",
        CommandCenterData.getState()
      );

      return CommandCenterData.getState();

    } finally {
      CommandCenterData.setLoading(
        false
      );
    }
  }

  return {
    API,
    loadIncidents,
    loadMissions,
    loadResources,
    loadSOS,
    loadMapResources,
    loadAll,
  };

})();

window.CommandDashboard =
  CommandDashboard;

console.log(
  "✅ Command Dashboard Ready"
);