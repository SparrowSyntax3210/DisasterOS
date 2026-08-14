// ==========================================================
// CONFIG
// ==========================================================

const API = "http://localhost:4000/api";

// ======================================================
// GLOBAL STATE
// ======================================================

let map = null;

let predictionData = null;
let resourcesData = null;

// Leaflet layers
let markerLayers = {};
let zoneLayers = [];
let selectedMarker = null;

// Selected Location
let selectedLat = null;
let selectedLng = null;
let selectedPlaceName = "";

// Search debounce
let searchTimer = null;

// ==========================================================
// DOM
// ==========================================================

const heroSection = document.getElementById("heroSection");
const loadingScreen = document.getElementById("loadingScreen");
const dashboardSection = document.getElementById("dashboardSection");

const placeInput = document.getElementById("placeInput");
const predictBtn = document.getElementById("predictBtn");
const liveBtn = document.getElementById("liveLocationBtn");
const placeSuggestions = document.getElementById("placeSuggestions");

const loadingLogs = document.getElementById("loadingLogs");

const riskText = document.getElementById("riskText");
const probabilityText = document.getElementById("probabilityText");

const weatherCard = document.getElementById("weatherCard");
const recommendations = document.getElementById("recommendations");

const hospitalCount = document.getElementById("hospitalCount");
const shelterCount = document.getElementById("shelterCount");
const policeCount = document.getElementById("policeCount");
const fireCount = document.getElementById("fireCount");

const confidenceValue = document.getElementById("confidenceValue");
const confidenceFill = document.getElementById("confidenceProgress");
const historyContainer = document.getElementById("history");

const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ==========================================================
// CLOCK
// ==========================================================

// ==========================================================
// HOME BUTTON
// ==========================================================

const resetBtn = document.getElementById("resetBtn");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    // hide dashboard
    dashboardSection.classList.add("hidden");

    // show hero
    heroSection.style.display = "";

    // hide loading if active
    loadingScreen.classList.add("hidden");

    // clear selected location

    selectedLat = null;
    selectedLng = null;
    selectedPlaceName = "";

    // clear input

    if (placeInput) {
      placeInput.value = "";
    }

    // remove map

    if (map) {
      map.remove();

      map = null;
    }
  });
}

// ==========================================================
// CENTER MAP BUTTON
// ==========================================================

const locateBtn = document.getElementById("locateBtn");

if (locateBtn) {
  locateBtn.addEventListener("click", () => {
    if (!map) {
      alert("Map not initialized.");

      return;
    }

    if (selectedLat === null || selectedLng === null) {
      alert("No location selected.");

      return;
    }

    map.flyTo([selectedLat, selectedLng], 13, {
      animate: true,
      duration: 1.2,
    });
  });
}

const currentTime = document.getElementById("currentTime");

function updateClock() {
  if (!currentTime) return;

  currentTime.innerText =
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST";
}

updateClock();
setInterval(updateClock, 1000);

// ==========================================================
// LOADING STEPS
// ==========================================================

const loadingSteps = [
  "Initializing DisasterOS Engine...",
  "Loading Weather API...",
  "Loading Terrain Data...",
  "Scanning Nearby Rivers...",
  "Fetching Rainfall...",
  "Collecting Satellite Data...",
  "Locating Hospitals...",
  "Locating Shelters...",
  "Locating Police Stations...",
  "Locating Fire Stations...",
  "Running Flood Prediction Model...",
  "Generating Risk Zones...",
  "Calculating Preparedness...",
  "Generating AI Recommendations...",
  "Preparing Dashboard...",
];

// ==========================================================
// LOADING TERMINAL
// ==========================================================

async function runLoading() {
  loadingLogs.innerHTML = "";

  for (const step of loadingSteps) {
    const line = document.createElement("p");

    line.textContent = "✔ " + step;

    loadingLogs.appendChild(line);

    loadingLogs.scrollTop = loadingLogs.scrollHeight;

    await new Promise((r) => setTimeout(r, 220));
  }
}

// ==========================================================
// LIVE LOCATION
// ==========================================================

if (liveBtn) {
  liveBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    liveBtn.disabled = true;
    liveBtn.innerText = "Detecting...";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        selectedLat = position.coords.latitude;
        selectedLng = position.coords.longitude;
        selectedPlaceName = "Current Location";

        try {
          await startPrediction();
        } catch (error) {
          console.error(error);
        } finally {
          liveBtn.disabled = false;
          liveBtn.innerText = "Use Live Location";
        }
      },

      (error) => {
        console.error(error);

        alert("Unable to detect your current location.");

        liveBtn.disabled = false;
        liveBtn.innerText = "Use Live Location";
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

// ==========================================================
// GEOCODE USING BACKEND API
// ==========================================================

async function geocode(place) {

  const query = place.trim();

  if (!query) {
    throw new Error("Enter a location.");
  }

  const res = await fetch(
    `${API}/map/geocode?location=${encodeURIComponent(query)}`
  );

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(
      data.message || "Location not found."
    );
  }


  const item = data.location;


  if (
    !item ||
    !item.latitude ||
    !item.longitude
  ) {
    throw new Error("Invalid location data received.");
  }


  return {
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    name: item.name || query,
  };
}

// ==========================================================
// PREDICT BUTTON
// ==========================================================

predictBtn.addEventListener("click", async () => {
  try {
    if (selectedLat === null || selectedLng === null) {
      const place = placeInput.value.trim();

      if (!place) {
        alert("Enter a location.");

        return;
      }

      predictBtn.disabled = true;

      predictBtn.innerText = "Finding...";

      const result = await geocode(place);

      selectedLat = Number(result.lat);

      selectedLng = Number(result.lng);

      selectedPlaceName = result.name || place;

      placeInput.value = selectedPlaceName;
    }

    await startPrediction();
  } catch (err) {
    console.error(err);

    alert(err.message || "Prediction failed.");

    predictBtn.disabled = false;

    predictBtn.innerText = "Predict Area";
  }
});

// ==========================================================
// START PREDICTION
// ==========================================================

async function startPrediction() {
  heroSection.style.display = "none";

  loadingScreen.classList.remove("hidden");

  dashboardSection.classList.add("hidden");

  predictBtn.disabled = true;

  predictBtn.innerText = "Predicting...";

  try {
    const loadingPromise = runLoading();

    const predictionPromise = fetch(API + "/predictions/predict", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        latitude: selectedLat,
        longitude: selectedLng,
      }),
    });

    const resourcePromise = fetch(
      API + `/map/resources?lat=${selectedLat}&lng=${selectedLng}`,
    );

    const [predictionResponse, resourceResponse] = await Promise.all([
      predictionPromise,
      resourcePromise,
    ]);

    predictionData = await predictionResponse.json();

    resourcesData = await resourceResponse.json();

    if (!predictionData.success) {
      throw new Error(predictionData.message || "Prediction failed.");
    }

    if (!resourcesData.success) {
      throw new Error(resourcesData.message || "Resource lookup failed.");
    }

    /*
     * Wait for terminal animation
     */

    await loadingPromise;

    loadingScreen.classList.add("hidden");

    dashboardSection.classList.remove("hidden");

    initializeMap();

    setTimeout(() => {
      if (!map) return;

      map.invalidateSize(true);

      renderDashboard();

      renderResources();

      renderMarkers();

      renderZones();

      fitDashboardMap();
    }, 300);

    saveHistory();
  } catch (error) {
    console.error("Prediction Error:", error);

    loadingScreen.classList.add("hidden");

    dashboardSection.classList.add("hidden");

    heroSection.style.display = "";

    alert(error.message || "Something went wrong.");
  } finally {
    predictBtn.disabled = false;

    predictBtn.innerText = "Predict Area";
  }
}

// ==========================================================
// MAP
// ==========================================================

function initializeMap() {
  if (map) {
    map.remove();
    map = null;
  }

  map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
  }).setView([selectedLat, selectedLng], 12.8);

  // =====================================================
  // CUSTOM PANES
  // =====================================================

  map.createPane("riskZones");
  map.getPane("riskZones").style.zIndex = 350;

  map.createPane("resourceMarkers");
  map.getPane("resourceMarkers").style.zIndex = 650;

  map.createPane("currentLocation");
  map.getPane("currentLocation").style.zIndex = 800;

  // =====================================================
  // DARK TACTICAL BASEMAP
  // =====================================================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

  // =====================================================
  // CURRENT LOCATION
  // =====================================================

  const currentIcon = L.divIcon({
    className: "current-location-wrapper",

    html: `
            <div class="current-location-pulse">
                <div class="current-location-core"></div>
            </div>
        `,

    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  L.marker([selectedLat, selectedLng], {
    icon: currentIcon,
    pane: "currentLocation",
    zIndexOffset: 5000,
  }).addTo(map).bindPopup(`
        <div class="resource-popup">
            <strong>📍 Current Location</strong>
        </div>
    `);

  setTimeout(() => {
    map.invalidateSize(true);
  }, 300);
}

// ==========================================================
// RENDER DASHBOARD
// ==========================================================

function renderDashboard() {
  if (!predictionData || !predictionData.data) return;

  const data = predictionData.data;

  const prediction = data.prediction || {};
  const weather = data.weather || {};

  // -------------------------------
  // Risk
  // -------------------------------

  if (riskText) {
    riskText.textContent = prediction.risk || "--";
  }

  const probability = Number(prediction.probability || 0);

  if (probabilityText) {
    probabilityText.textContent = probability + "% Probability";
  }

  // -------------------------------
  // Progress Bar
  // -------------------------------

  const riskProgress = document.getElementById("riskProgress");

  if (riskProgress) {
    riskProgress.style.width = probability + "%";

    let color = "#16a34a";

    if (probability >= 75) color = "#ef4444";
    else if (probability >= 50) color = "#f59e0b";

    riskProgress.style.background = color;
  }

  // -------------------------------
  // Weather
  // -------------------------------

  if (weatherCard) {
    weatherCard.innerHTML = `
        <div class="weather-grid">

            <div>
                <strong>Temperature</strong>
                <p>${weather.temperature ?? "--"} °C</p>
            </div>

            <div>
                <strong>Humidity</strong>
                <p>${weather.humidity ?? "--"}%</p>
            </div>

            <div>
                <strong>Rainfall</strong>
                <p>${weather.rainfall ?? 0} mm</p>
            </div>

            <div>
                <strong>Wind</strong>
                <p>${weather.windSpeed ?? "--"} km/h</p>
            </div>

        </div>
    `;
  }

  // -------------------------------
  // Recommendations
  // -------------------------------

  if (recommendations) {
    recommendations.innerHTML = "";

    (prediction.recommendations || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      recommendations.appendChild(li);
    });
  }

  // -------------------------------
  // Confidence
  // -------------------------------

  const confidence = Math.min(98, Math.max(70, probability + 10));

  if (confidenceValue) {
    confidenceValue.textContent = confidence + "%";
  }

  const confidenceProgress = document.getElementById("confidenceProgress");

  if (confidenceProgress) {
    confidenceProgress.style.width = confidence + "%";
  }
}

// ==========================================================
// RESOURCE COUNTS
// ==========================================================

function renderResources() {
  if (!resourcesData?.resources) return;

  const resources = resourcesData.resources;

  hospitalCount.textContent = resources.hospitals?.length || 0;
  shelterCount.textContent = resources.shelters?.length || 0;
  policeCount.textContent = resources.policeStations?.length || 0;
  fireCount.textContent = resources.fireStations?.length || 0;
}
// ==========================================================
// MAP MARKERS
// ==========================================================

function createResourceIcon(type){

const colors={
hospital:"#ff3b30",
shelter:"#4ea8ff",
police:"#00d26a",
fire:"#ff9800",
pharmacy:"#ff4f9a",
school:"#ffd54f"
};

const emojis={
hospital:"🏥",
shelter:"🏠",
police:"🚓",
fire:"🚒",
pharmacy:"💊",
school:"🏫"
};

return L.divIcon({

className:"",

html:`

<div style="
width:18px;
height:18px;
border-radius:50%;
background:${colors[type]};
display:flex;
align-items:center;
justify-content:center;
box-shadow:0 0 12px ${colors[type]};
border:2px solid white;
font-size:10px;
">

${emojis[type]}

</div>

`,

iconSize:[18,18],
iconAnchor:[9,9]

});

}

function renderMarkers() {
  /*
   * Remove previous marker layers
   */

  Object.values(markerLayers).forEach((markers) => {
    if (!Array.isArray(markers)) return;

    markers.forEach((marker) => {
      if (map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
  });

  markerLayers = {
    hospital: [],
    shelter: [],
    police: [],
    fire: [],
    pharmacy: [],
    school: [],
  };

  if (!resourcesData?.resources) {
    return;
  }

  const resources = resourcesData.resources;

  const mapping = {
    hospital: resources.hospitals || [],

    shelter: resources.shelters || [],

    police: resources.policeStations || [],

    fire: resources.fireStations || [],

    pharmacy: resources.pharmacies || [],

    school: resources.schools || [],
  };

  Object.entries(mapping).forEach(([type, places]) => {
    places.forEach((place) => {
      const lat = Number(place.latitude ?? place.lat);

      const lng = Number(place.longitude ?? place.lng ?? place.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: createResourceIcon(type),

        pane: "resourceMarkers",

        zIndexOffset: 1000,
      });

      marker.bindPopup(`
                    <div class="resource-popup">

                        <strong>
                            ${escapeHtml(place.name || type.toUpperCase())}
                        </strong>

                        <br>

                        <span>
                            ${type.toUpperCase()}
                        </span>

                    </div>
                `);

      marker.addTo(map);

      markerLayers[type].push(marker);
    });
  });
}

function addMarkers(list, emoji, key) {
  if (!Array.isArray(list)) return;

  const layer = L.layerGroup();

  list.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    L.marker([item.latitude, item.longitude])

      .bindPopup(`<b>${emoji} ${item.name || key}</b>`)

      .addTo(layer);
  });

  layer.addTo(map);

  markerLayers[key] = layer;
}

// ==========================================================
// RISK ZONES
// ==========================================================

function getZoneColor(risk) {
  risk = String(risk || "").toUpperCase();

  if (risk === "EXTREME" || risk === "CRITICAL") {
    return {
      stroke: "#ff2525",
      fill: "#ff2020",
    };
  }

  if (risk === "HIGH") {
    return {
      stroke: "#ff3535",
      fill: "#ff2525",
    };
  }

  if (risk === "MEDIUM") {
    return {
      stroke: "#ff9d00",
      fill: "#ff9d00",
    };
  }

  return {
    stroke: "#00a957",
    fill: "#00b957",
  };
}

function generateIrregularPolygon(lat, lng, radius, seed = 1) {
  /*
   * Convert radius from meters
   * to approximate latitude/longitude degrees.
   */

  const latRadius = radius / 111320;

  const lngRadius = radius / (111320 * Math.cos((lat * Math.PI) / 180));

  const shape=[
[0.00,1.00],
[0.42,0.82],
[0.90,0.55],
[1.05,0.05],
[0.70,-0.65],
[0.25,-1.05],
[-0.55,-0.92],
[-0.95,-0.35],
[-0.85,0.42],
[-0.30,0.95]
];

  return shape.map(([x, y], index) => {
    /*
     * deterministic variation
     * so zones don't look identical
     */

    const variation = 0.86 + Math.sin(index * 17 + seed * 9) * 0.08;

    return [lat + y * latRadius * variation, lng + x * lngRadius * variation];
  });
}

function renderZones() {
  // Remove old zones
  zoneLayers.forEach((layer) => {
    if (map && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });

  zoneLayers = [];

  const zones = predictionData?.data?.zones;

  if (!Array.isArray(zones) || zones.length === 0) {
    console.warn("No risk zones received from API.");
    return;
  }

  zones.forEach((zone, index) => {
    const lat = Number(zone.latitude ?? zone.lat ?? selectedLat);

    const lng = Number(zone.longitude ?? zone.lng ?? zone.lon ?? selectedLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const risk = String(zone.risk || "LOW").toUpperCase();

    let radius;

    if (risk === "EXTREME" || risk === "CRITICAL") {
      radius = Number(zone.radius) || 4000;
    } else if (risk === "HIGH") {
      radius = Number(zone.radius) || 3500;
    } else if (risk === "MEDIUM") {
      radius = Number(zone.radius) || 4500;
    } else {
      radius = Number(zone.radius) || 5500;
    }

    const colors = getZoneColor(risk);

    const polygonPoints = generateIrregularPolygon(
      lat,
      lng,
      radius,
      index + 10,
    );

    const polygon = L.polygon(polygonPoints, {
      pane: "riskZones",

      color: colors.stroke,

      weight:
risk==="EXTREME"?4:
risk==="HIGH"?3:2,

      opacity: 0.9,

      fillColor: colors.fill,

      fillOpacity:
        risk === "EXTREME" || risk === "CRITICAL"
          ? 0.62
          : risk === "HIGH"
            ? 0.48
            : risk === "MEDIUM"
              ? 0.30
              : 0.18,

      className: `risk-zone risk-${risk.toLowerCase()}`,
    });

    polygon.addTo(map);
    polygon.bringToBack();

    // =================================================
    // HOVER
    // =================================================

    polygon.on("mouseover", function () {
      this.setStyle({
        fillOpacity: risk === "HIGH" ? 0.48 : 0.35,

        weight: 3,
      });
    });

    polygon.on("mouseout", function () {
      this.setStyle({
        fillOpacity:
          risk === "EXTREME" || risk === "CRITICAL"
            ? 0.42
            : risk === "HIGH"
              ? 0.36
              : risk === "MEDIUM"
                ? 0.27
                : 0.2,

        weight: risk === "HIGH" ? 2.5 : 2,
      });
    });

    // =================================================
    // POPUP
    // =================================================

    polygon.bindPopup(`
            <div class="zone-popup">

                <div
                    class="zone-popup-title"
                    style="color:${colors.stroke}"
                >
                    ${risk} RISK ZONE
                </div>

                <div class="zone-popup-row">
                    <span>Area</span>
                    <strong>
                        ${escapeHtml(zone.name || "Affected Area")}
                    </strong>
                </div>

                <div class="zone-popup-row">
                    <span>Probability</span>
                    <strong>
                        ${zone.probability ?? "--"}%
                    </strong>
                </div>

                <div class="zone-popup-row">
                    <span>Radius</span>
                    <strong>
                        ${(radius / 1000).toFixed(1)} km
                    </strong>
                </div>

            </div>
        `);

    zoneLayers.push(polygon);
  });
}

function showZoneInformation(zone) {
  const popupRisk = document.getElementById("popupRisk");

  const popupArea = document.getElementById("popupArea");

  const popupPopulation = document.getElementById("popupPopulation");

  if (popupRisk) {
    popupRisk.innerText = `${zone.risk || "UNKNOWN"} RISK ZONE`;
  }

  if (popupArea) {
    popupArea.innerText = `Area: ${zone.name || "Affected Area"}`;
  }

  if (popupPopulation) {
    popupPopulation.innerText = `Probability: ${zone.probability ?? "--"}%`;
  }
}

// ==========================================================
// FILTER BUTTONS
// ==========================================================

const layerButtons = document.querySelectorAll(".layer-btn");

layerButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    layerButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const selected = btn.dataset.layer;

    Object.entries(markerLayers).forEach(([type, markers]) => {
      markers.forEach((marker) => {
        if (!marker) return;

        const shouldShow = selected === "all" || selected === type;

        if (shouldShow) {
          if (!map.hasLayer(marker)) {
            marker.addTo(map);
          }
        } else {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        }
      });
    });
  });
});

const refreshBtn = document.getElementById("refreshBtn");

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    if (selectedLat == null || selectedLng == null) {
      alert("No location selected.");

      return;
    }

    await startPrediction();
  });
}

// ==========================================================
// HISTORY
// ==========================================================

function saveHistory() {
  if (!predictionData) {
    return;
  }

  let history = JSON.parse(localStorage.getItem("predictionHistory") || "[]");

  const prediction = predictionData.data?.prediction || {};

  history.unshift({
    place: selectedPlaceName || "Unknown Location",

    risk: prediction.risk || "--",

    probability: prediction.probability || 0,

    date: new Date().toLocaleString("en-IN"),
  });

  history = history.slice(0, 20);

  localStorage.setItem("predictionHistory", JSON.stringify(history));

  renderHistory();
}

function renderHistory() {
  if (!historyContainer) {
    return;
  }

  const history = JSON.parse(localStorage.getItem("predictionHistory") || "[]");

  historyContainer.innerHTML = "";

  if (!history.length) {
    historyContainer.innerHTML = `
            <div
                style="
                    color:#58758a;
                    font-size:11px;
                    padding:10px;
                "
            >
                No prediction history.
            </div>
        `;

    return;
  }

  history.forEach((item) => {
    historyContainer.innerHTML += `

            <div class="history-item">

                <h4>
                    ${escapeHtml(item.place)}
                </h4>

                <p>
                    ${escapeHtml(item.risk)}
                    Risk ·
                    ${item.probability}%
                </p>

                <small>
                    ${escapeHtml(item.date)}
                </small>

            </div>

        `;
  });
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem("predictionHistory");

    renderHistory();
  });
}

function fitDashboardMap() {
  if (!map) return;

  if (zoneLayers.length) {
    const zoneGroup = L.featureGroup(zoneLayers);

    map.fitBounds(zoneGroup.getBounds().pad(0.22), {
      maxZoom: 13,
      minZoom: 10,
      animate: true,
    });

    return;
  }

  map.setView([selectedLat, selectedLng], 11, {
    animate: true,
  });
}

// ==========================================================
// ERROR RECOVERY
// ==========================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.addEventListener("unhandledrejection", (e) => {
  console.error(e.reason);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    renderHistory();
  } catch (error) {
    console.error("History loading failed:", error);
  }
});

window.addEventListener("error", (e) => {
  console.error(e.error);
});

console.log("✅ DisasterOS Dashboard Loaded");
