/* =========================================================
   DISASTEROS - LIVE WEATHER
   ========================================================= */

const WEATHER_API_BASE = "http://localhost:4000/api";

/* =========================================================
   DOM
   ========================================================= */

const weatherLoading = document.getElementById("weatherLoading");

const weatherError = document.getElementById("weatherError");

const weatherContent = document.getElementById("weatherContent");

const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");

/* =========================================================
   WEATHER ELEMENTS
   ========================================================= */

const weatherLocationName = document.getElementById("weatherLocationName");

const weatherCoordinates = document.getElementById("weatherCoordinates");

const temperatureValue = document.getElementById("temperatureValue");

const weatherCondition = document.getElementById("weatherCondition");

const weatherIcon = document.getElementById("weatherIcon");

const feelsLike = document.getElementById("feelsLike");

const humidity = document.getElementById("humidity");

const windSpeed = document.getElementById("windSpeed");

const rainfall = document.getElementById("rainfall");

const pressure = document.getElementById("pressure");

const visibility = document.getElementById("visibility");

const weatherRiskTitle = document.getElementById("weatherRiskTitle");

const weatherRiskDescription = document.getElementById(
  "weatherRiskDescription",
);

const weatherUpdatedAt = document.getElementById("weatherUpdatedAt");

/* =========================================================
   LOCATION STORAGE
   ========================================================= */

/*
   IMPORTANT:

   We do NOT hardcode Delhi or any other location.

   This module uses the location selected in your
   previous location module.

   It supports the common storage names so it can
   work with your existing dashboard.
*/

function getSavedLocation() {
  const possibleKeys = [
    "userLocation",
    "selectedLocation",
    "currentLocation",
    "disasterOSLocation",
    "location",
  ];

  for (const key of possibleKeys) {
    const stored = localStorage.getItem(key);

    if (!stored) continue;

    try {
      const location = JSON.parse(stored);

      const latitude = Number(location.latitude ?? location.lat);

      const longitude = Number(
        location.longitude ?? location.lng ?? location.lon,
      );

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
          latitude,
          longitude,
          name: location.name || location.address || "Selected Location",
        };
      }
    } catch (error) {
      console.warn(`Unable to parse ${key}`, error);
    }
  }

  return null;
}

/* =========================================================
   LOAD WEATHER
   ========================================================= */

async function loadLiveWeather() {
  hideError();

  showLoading();

  const location = getSavedLocation();

  /* -------------------------------------------------------
       LOCATION CHECK
       ------------------------------------------------------- */

  if (!location) {
    showError(
      "Location is not selected. Please go to the Location page and select your location first.",
    );

    return;
  }

  /* -------------------------------------------------------
       DISPLAY LOCATION
       ------------------------------------------------------- */

  weatherLocationName.textContent = location.name;

  weatherCoordinates.textContent = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;

  /* -------------------------------------------------------
       API REQUEST
       ------------------------------------------------------- */

  const url =
    `${WEATHER_API_BASE}/predictions/weather/live` +
    `?latitude=${encodeURIComponent(location.latitude)}` +
    `&longitude=${encodeURIComponent(location.longitude)}`;

  console.log("🌦️ Weather API:", url);

  try {
    const response = await fetch(url);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to fetch weather.");
    }

    if (!result.success) {
      throw new Error(result.message || "Weather API returned an error.");
    }

    console.log("🌦️ Weather response:", result);

    renderWeather(result.data);
  } catch (error) {
    console.error("Weather Error:", error);

    showError(error.message || "Unable to load live weather data.");
  }
}

/* =========================================================
   RENDER WEATHER
   ========================================================= */

function renderWeather(weather) {
  if (!weather) {
    throw new Error("Weather data is empty.");
  }

  /*
       The exact structure depends on
       weather.service.js.

       These helpers allow common naming
       conventions.
    */

  const temperature = getValue(weather, [
    "temperature",
    "temp",
    "current.temperature",
    "current.temp",
  ]);

  const condition = getValue(weather, [
    "condition",
    "weather",
    "description",
    "current.condition",
  ]);

  const feels = getValue(weather, [
    "feelsLike",
    "feels_like",
    "current.feelsLike",
    "current.feels_like",
  ]);

  const humidityValue = getValue(weather, ["humidity", "current.humidity"]);

  const wind = getValue(weather, [
    "windSpeed",
    "wind_speed",
    "wind.speed",
    "current.windSpeed",
  ]);

  const rain = getValue(weather, [
    "rainfall",
    "rain",
    "rainfall.mm",
    "current.rainfall",
  ]);

  const pressureValue = getValue(weather, [
    "pressure",
    "pressure_hpa",
    "current.pressure",
  ]);

  const visibilityValue = getValue(weather, [
    "visibility",
    "current.visibility",
  ]);

  /* -------------------------------------------------------
       UPDATE UI
       ------------------------------------------------------- */

  temperatureValue.textContent = formatNumber(temperature);

  weatherCondition.textContent = formatText(condition);

  feelsLike.textContent = formatNumber(feels);

  humidity.textContent = formatNumber(humidityValue);

  windSpeed.textContent = formatNumber(wind);

  rainfall.textContent = formatNumber(rain);

  pressure.textContent = formatNumber(pressureValue);

  visibility.textContent = formatNumber(visibilityValue);

  /* -------------------------------------------------------
       WEATHER ICON
       ------------------------------------------------------- */

  weatherIcon.textContent = getWeatherIcon(condition);

  /* -------------------------------------------------------
       DISASTER ASSESSMENT
       ------------------------------------------------------- */

  generateWeatherAssessment(weather);

  /* -------------------------------------------------------
       UPDATED TIME
       ------------------------------------------------------- */

  weatherUpdatedAt.textContent = new Date().toLocaleString();

  showContent();
}

/* =========================================================
   WEATHER ASSESSMENT
   ========================================================= */

function generateWeatherAssessment(weather) {
  const temperature = Number(
    getValue(weather, [
      "temperature",
      "temp",
      "current.temperature",
      "current.temp",
    ]),
  );

  const humidityValue = Number(
    getValue(weather, ["humidity", "current.humidity"]),
  );

  const rain = Number(
    getValue(weather, ["rainfall", "rain", "rainfall.mm", "current.rainfall"]),
  );

  let risk = "NORMAL";

  let description =
    "Current weather conditions appear stable. Continue monitoring local alerts.";

  /*
       This is only a frontend assessment.

       The actual AI flood prediction remains
       handled by:

       POST /api/predictions/predict
    */

  if (rain >= 50 || humidityValue >= 90) {
    risk = "HIGH WEATHER RISK";

    description =
      "Heavy rainfall or very high humidity detected. Monitor flood alerts and avoid vulnerable areas.";
  } else if (rain >= 20 || humidityValue >= 80) {
    risk = "MODERATE WEATHER RISK";

    description =
      "Elevated rainfall or humidity detected. Stay alert for changing conditions.";
  } else if (temperature >= 45) {
    risk = "EXTREME HEAT";

    description =
      "Extremely high temperature detected. Avoid prolonged outdoor exposure and stay hydrated.";
  }

  weatherRiskTitle.textContent = risk;

  weatherRiskDescription.textContent = description;
}

/* =========================================================
   WEATHER ICON
   ========================================================= */

function getWeatherIcon(condition) {
  if (!condition) {
    return "☁";
  }

  const text = String(condition).toLowerCase();

  if (text.includes("thunder") || text.includes("storm")) {
    return "⛈";
  }

  if (text.includes("rain") || text.includes("drizzle")) {
    return "🌧";
  }

  if (text.includes("snow")) {
    return "❄";
  }

  if (text.includes("clear") || text.includes("sun")) {
    return "☀";
  }

  if (text.includes("cloud")) {
    return "☁";
  }

  if (text.includes("mist") || text.includes("fog")) {
    return "🌫";
  }

  return "☁";
}

/* =========================================================
   NESTED VALUE HELPER
   ========================================================= */

function getValue(object, paths) {
  for (const path of paths) {
    const parts = path.split(".");

    let value = object;

    for (const part of parts) {
      if (value === null || value === undefined) {
        break;
      }

      value = value[part];
    }

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return "--";
}

/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(value) {
  if (value === undefined || value === null || value === "--" || value === "") {
    return "--";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return number.toFixed(1);
}

/* =========================================================
   FORMAT TEXT
   ========================================================= */

function formatText(value) {
  if (value === undefined || value === null || value === "--") {
    return "--";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* =========================================================
   UI STATE
   ========================================================= */

function showLoading() {
  weatherLoading.classList.remove("hidden");

  weatherContent.classList.add("hidden");
}

function showContent() {
  weatherLoading.classList.add("hidden");

  weatherContent.classList.remove("hidden");
}

function showError(message) {
  weatherLoading.classList.add("hidden");

  weatherContent.classList.add("hidden");

  weatherError.textContent = message;

  weatherError.classList.remove("hidden");
}

function hideError() {
  weatherError.classList.add("hidden");

  weatherError.textContent = "";
}

/* =========================================================
   REFRESH
   ========================================================= */

if (refreshWeatherBtn) {
  refreshWeatherBtn.addEventListener("click", loadLiveWeather);
}

/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /*
           Small delay makes sure the common
           dashboard/location module has already
           restored the selected location.
        */

  setTimeout(loadLiveWeather, 100);
});
