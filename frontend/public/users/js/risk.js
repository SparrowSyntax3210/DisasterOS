(function () {
  let initialized = false;

  // =====================================================
  // INIT
  // =====================================================

  function initRiskOverlay() {
    console.log("📊 Initializing Risk view...");

    if (!initialized) {
      initialized = true;

      // Dashboard data becomes available
      window.addEventListener("disasterOSDataReady", renderRiskData);

      // Refresh button
      const refreshBtn = document.getElementById("riskRefresh");

      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          console.log("🔄 Refreshing Risk data...");
          renderRiskData();
        });
      }

      // AI prediction button
      const predictBtn = document.getElementById("riskPredictBtn");

      if (predictBtn) {
        predictBtn.addEventListener("click", () => {
          console.log("🤖 Showing latest prediction...");
          renderRiskData();
        });
      }
    }

    // IMPORTANT:
    // Read whatever dashboard.js already has.
    renderRiskData();
  }

  // =====================================================
  // READ DASHBOARD DATA
  // =====================================================

  function renderRiskData() {
    const dashboard = window.DisasterOSDashboard;

    if (!dashboard) {
      console.warn("⚠ DisasterOSDashboard not available yet.");
      return;
    }

    const location = dashboard.location;

    const weather = dashboard.weather;

    const prediction = dashboard.prediction;

    console.log("📊 Rendering Risk data...");

    console.log("📍 Risk location:", location);

    console.log("🌦 Risk weather:", weather);

    console.log("🤖 Risk prediction:", prediction);

    renderLocation(location);
    renderWeather(weather);
    renderPrediction(prediction);
  }

  // =====================================================
  // LOCATION
  // =====================================================

  function renderLocation(location) {
    const element = document.getElementById("riskLocation");

    if (!element) return;

    if (
      !location ||
      location.latitude === null ||
      location.longitude === null ||
      location.latitude === undefined ||
      location.longitude === undefined
    ) {
      element.textContent = "Location unavailable";

      return;
    }

    const lat = Number(location.latitude);

    const lng = Number(location.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      element.textContent = "Location unavailable";

      return;
    }

    element.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  // =====================================================
  // WEATHER
  // =====================================================

  function renderWeather(weather) {
    if (!weather) {
      setText("riskTemperature", "--");
      setText("riskHumidity", "--");
      setText("riskWind", "--");
      setText("riskRain", "--");
      setText("riskPrecipitation", "--");

      return;
    }

    const temperature = weather.temperature ?? weather.temp ?? "--";

    const humidity = weather.humidity ?? "--";

    const wind =
      weather.windSpeed ?? weather.wind_speed ?? weather.wind ?? "--";

    const rain =
      weather.rainfallIntensity ?? weather.rain ?? weather.rainfall ?? "--";

    const precipitation =
      weather.precipitationProbability ?? weather.precipitation ?? "--";

    setText("riskTemperature", formatNumber(temperature));

    setText("riskHumidity", formatNumber(humidity));

    setText("riskWind", formatNumber(wind));

    setText("riskRain", formatNumber(rain));

    setText("riskPrecipitation", formatNumber(precipitation));
  }

  // =====================================================
  // PREDICTION
  // =====================================================

  function renderPrediction(data) {
    if (!data) {
      setText("riskOverlayLevel", "--");

      setText("riskOverlayProbability", "Probability unavailable");

      setText("riskReason", "No prediction data is currently available.");

      return;
    }

    const prediction = data.prediction || {};

    const risk = String(prediction.risk || "LOW").toUpperCase();

    const probability = Number(prediction.probability || 0);

    // Risk level
    setText("riskOverlayLevel", risk);

    // Probability
    setText("riskOverlayProbability", `${probability}% probability`);

    // Progress
    const progress = document.getElementById("riskOverlayProgress");

    if (progress) {
      const percentage = Math.min(100, Math.max(0, probability));

      progress.style.width = `${percentage}%`;
    }

    // Reason
    setText(
      "riskReason",
      prediction.reason || "No additional analysis available.",
    );

    // Recommendations
    const recommendations = document.getElementById("riskRecommendations");

    if (recommendations) {
      recommendations.innerHTML = "";

      const items = Array.isArray(prediction.recommendations)
        ? prediction.recommendations
        : [];

      if (items.length === 0) {
        const li = document.createElement("li");

        li.textContent = "No specific recommendations available.";

        recommendations.appendChild(li);
      } else {
        items.forEach((item) => {
          const li = document.createElement("li");

          li.textContent = item;

          recommendations.appendChild(li);
        });
      }
    }

    renderRiskColor(risk);
  }

  // =====================================================
  // RISK COLOR
  // =====================================================

  function renderRiskColor(risk) {
    const element = document.getElementById("riskOverlayLevel");

    if (!element) return;

    if (risk === "EXTREME" || risk === "CRITICAL") {
      element.style.color = "var(--danger)";
    } else if (risk === "HIGH" || risk === "MEDIUM") {
      element.style.color = "var(--warning)";
    } else {
      element.style.color = "var(--accent)";
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatNumber(value) {
    if (value === undefined || value === null || value === "--") {
      return "--";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return number.toFixed(1);
  }

  // =====================================================
  // EXPOSE
  // =====================================================

  window.initRiskOverlay = initRiskOverlay;

  console.log("✅ DisasterOS risk.js loaded");

  // =====================================================
  // AUTO INIT
  // =====================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initRiskOverlay();
    });
  } else {
    initRiskOverlay();
  }
})();
