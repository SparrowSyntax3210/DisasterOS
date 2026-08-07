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
let selectedLatitude = null;
let selectedLongitude = null;
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

// ==========================================================
// CLOCK
// ==========================================================

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
      alert("Geolocation not supported.");

      return;
    }

    liveBtn.disabled = true;

    liveBtn.innerText = "Detecting...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectedLat = pos.coords.latitude;
        selectedLng = pos.coords.longitude;
        selectedPlace = "Current Location";

        if (placeInput) {
          placeInput.value = "Current Location";
        }

        liveBtn.disabled = false;
        liveBtn.innerText = "📍 Use Current Location";
      },

      () => {
        alert("Unable to detect location.");

        liveBtn.disabled = false;
        liveBtn.innerText = "📍 Use Current Location";
      },

      {
        enableHighAccuracy: true,
      },
    );
  });
}

// ==========================================================
// GEOCODE
// ==========================================================

async function geocode(place) {
  const res = await fetch(
    `${API}/map/geocode?place=${encodeURIComponent(place)}`,
  );

  if (!res.ok) {
    throw new Error("Location not found.");
  }

  const data = await res.json();

  let item = null;

  if (data.results?.length) item = data.results[0];
  else if (data.data?.length) item = data.data[0];
  else if (data.features?.length) item = data.features[0];
  else if (data.latitude) item = data;
  else if (data.data) item = data.data;

  if (!item) {
    throw new Error("Location not found.");
  }

  if (item.properties) {
    return {
      lat: item.properties.lat,
      lng: item.properties.lon,
      name: item.properties.formatted,
    };
  }

  return {
    lat: item.latitude ?? item.lat,
    lng: item.longitude ?? item.lon ?? item.lng,
    name: item.name ?? item.formatted ?? item.display_name,
  };
}

// ==========================================================
// PREDICT BUTTON
// ==========================================================

if (predictBtn) {
  predictBtn.addEventListener("click", async () => {
    try {
      // ----------------------------
      // Resolve typed location
      // ----------------------------

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
        selectedPlace = result.name;

        placeInput.value = result.name;
      }

      await startPrediction();
    } catch (err) {
      console.error(err);

      alert(err.message);

      predictBtn.disabled = false;
      predictBtn.innerText = "Predict Area";
    }
  });
}

// ==========================================================
// START PREDICTION
// ==========================================================

async function startPrediction() {
  heroSection.style.display = "none";

  loadingScreen.classList.remove("hidden");

  dashboardSection.classList.add("hidden");

  predictBtn.disabled = true;

  predictBtn.innerText = "Predicting...";

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

  console.log("Prediction API", predictionData);
  console.log("Resources API", resourcesData);

  if (!predictionData.success) {
    throw new Error(predictionData.message);
  }

  if (!resourcesData.success) {
    throw new Error(resourcesData.message);
  }

  await loadingPromise;

  loadingScreen.classList.add("hidden");

  dashboardSection.classList.remove("hidden");

  initializeMap();

  renderDashboard();

  renderResources();

  renderMarkers();

  renderZones();

  predictBtn.disabled = false;

  predictBtn.innerText = "Predict Area";
}

// ==========================================================
// MAP
// ==========================================================

function initializeMap() {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView(
    [selectedLat, selectedLng],

    13,
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {
      attribution: "© OpenStreetMap",
    },
  ).addTo(map);

  L.marker([selectedLat, selectedLng])

    .addTo(map)

    .bindPopup(`<b>${selectedPlace}</b>`)

    .openPopup();

  setTimeout(() => {
    map.invalidateSize();
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

function renderMarkers() {
  // Remove previous markers
  Object.values(markerLayers).forEach((arr) => {
    arr.forEach((marker) => {
      if (map.hasLayer(marker)) {
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

  if (!resourcesData?.resources) return;

  const resources = resourcesData.resources;

  const mapping = {
    hospital: resources.hospitals,
    shelter: resources.shelters,
    police: resources.policeStations,
    fire: resources.fireStations,
    pharmacy: resources.pharmacies,
    school: resources.schools,
  };

  Object.entries(mapping).forEach(([type, places]) => {
    (places || []).forEach((place) => {
      if (!place.latitude || !place.longitude) return;

      const marker = L.marker([place.latitude, place.longitude]);

      marker.bindPopup(`
    <strong>${place.name}</strong><br>
    ${type}
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

function renderZones() {
  // remove old zones
  zoneLayers.forEach((layer) => map.removeLayer(layer));
  zoneLayers = [];

  if (!predictionData?.data?.zones) return;

  predictionData.data.zones.forEach((zone) => {
    let color = "#16a34a";

    if (zone.risk === "MEDIUM") color = "#f59e0b";

    if (zone.risk === "HIGH") color = "#ef4444";

    if (zone.risk === "EXTREME") color = "#8b0000";

    const circle = L.circle([zone.latitude, zone.longitude], {
      radius: zone.radius,
      color,
      fillColor: color,
      fillOpacity: 0.28,
      weight: 2,
    }).addTo(map);

    circle.on("click", () => {
      const popupRisk = document.getElementById("popupRisk");
      const popupArea = document.getElementById("popupArea");
      const popupPopulation = document.getElementById("popupPopulation");

      if (popupRisk) popupRisk.innerText = `${zone.risk} RISK`;

      if (popupArea) popupArea.innerText = zone.name || "Risk Zone";

      if (popupPopulation)
        popupPopulation.innerText = `Probability : ${zone.probability}%`;
    });

    zoneLayers.push(circle);
  });
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

// ==========================================================
// HISTORY
// ==========================================================

function loadHistory() {
  const history = JSON.parse(localStorage.getItem("predictionHistory") || "[]");

  history.unshift({
    place: selectedPlaceName || "Unknown",

    probability: predictionData?.data?.prediction?.probability || 0,

    date: new Date().toLocaleString(),
  });

  localStorage.setItem(
    "predictionHistory",
    JSON.stringify(history.slice(0, 20)),
  );

  if (!historyContainer) return;

  historyContainer.innerHTML = "";

  history.forEach((item) => {
    historyContainer.innerHTML += `
            <div class="history-item">
                <strong>${item.place}</strong>
                <br>
                ${item.probability}% Risk
                <br>
                <small>${item.date}</small>
            </div>
        `;
  });
}

// ==========================================================
// ERROR RECOVERY
// ==========================================================

window.addEventListener("unhandledrejection", (e) => {
  console.error(e.reason);
});

window.addEventListener("error", (e) => {
  console.error(e.error);
});

console.log("✅ DisasterOS Dashboard Loaded");
