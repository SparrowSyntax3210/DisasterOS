// ===============================
// CONFIG
// ===============================

const API = "http://localhost:4000/api";

let map;
let zoneLayers = [];
let markerLayers = {};

let predictionData = null;
let resourcesData = null;

// ===============================
// DOM
// ===============================

const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");

const predictBtn = document.getElementById("predictBtn");
const liveBtn = document.getElementById("liveLocationBtn");

const dashboardSection = document.getElementById("dashboardSection");
const mapContainer = document.getElementById("mapContainer");

// Summary

const riskText = document.getElementById("riskText");
const probabilityText = document.getElementById("probabilityText");
const preparednessText = document.getElementById("preparednessScore");
const weatherSummary = document.getElementById("weatherCard");

// AI

const recommendationList = document.getElementById("recommendations");

// History

const historyContainer = document.getElementById("history");
// ===============================
// LIVE LOCATION
// ===============================

liveBtn.onclick = () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latInput.value = position.coords.latitude.toFixed(6);
      lngInput.value = position.coords.longitude.toFixed(6);
    },
    () => {
      alert("Unable to fetch location");
    },
  );
};

// ===============================
// INITIALIZE MAP
// ===============================

function initializeMap(lat, lng) {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([lat, lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);
}

// ===============================
// FETCH DATA
// ===============================

predictBtn.onclick = async () => {

  const latitude = Number(latInput.value);
  const longitude = Number(lngInput.value);

  if(isNaN(latitude) || isNaN(longitude)){
    return alert("Enter valid coordinates");
  }

  try{

    const [predictionResponse, resourceResponse] = await Promise.all([

      fetch(API + "/predictions/predict",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          latitude,
          longitude
        })
      }),

      fetch(API + `/map/resources?lat=${latitude}&lng=${longitude}`)

    ]);

    predictionData = await predictionResponse.json();
    resourcesData = await resourceResponse.json();

    console.log(predictionData);
    console.log(resourcesData);

    dashboardSection.classList.remove("hidden");

    initializeMap(latitude,longitude);

    renderDashboard();
    renderMarkers();
    renderZones();
    loadHistory();

  }
  catch(err){
    console.error(err);
  }

};

// ===============================
// DASHBOARD
// ===============================

function renderDashboard() {
  const prediction = predictionData.data.prediction;
  const weather = predictionData.data.weather;

  riskText.textContent = prediction.risk;
  probabilityText.textContent = prediction.probability + "%";
  preparednessText.textContent = (100 - prediction.probability) + "%";

  weatherSummary.innerHTML = `
    <p><strong>Temperature:</strong> ${weather.temperature}°C</p>
    <p><strong>Weather Code:</strong> ${weather.weatherCode}</p>
  `;

  // Resource Counts
  document.getElementById("hospitalCount").textContent =
    resourcesData.resources.hospitals.length;

  document.getElementById("shelterCount").textContent =
    resourcesData.resources.shelters.length;

  document.getElementById("policeCount").textContent =
    resourcesData.resources.policeStations.length;

  document.getElementById("fireCount").textContent =
    resourcesData.resources.fireStations.length;

  recommendationList.innerHTML = "";

  prediction.recommendations.forEach((item) => {
    recommendationList.innerHTML += `<li>${item}</li>`;
  });
}

// ===============================
// COLORS
// ===============================

function markerColor(type) {
  switch (type) {
    case "hospitals":
      return "red";

    case "policeStations":
      return "blue";

    case "fireStations":
      return "orange";

    case "pharmacies":
      return "green";

    case "schools":
      return "yellow";

    case "shelters":
      return "violet";

    default:
      return "black";
  }
}

// ===============================
// MARKERS
// ===============================

function renderMarkers() {
  markerLayers = {};

  Object.entries(resourcesData.resources).forEach(([key, places]) => {

    const group = L.layerGroup();

    places.forEach((place) => {

      if (!place.latitude || !place.longitude) return;

      const marker = L.circleMarker(
        [place.latitude, place.longitude],
        {
          radius: 7,
          color: markerColor(key),
          fillColor: markerColor(key),
          fillOpacity: 1
        }
      );

      marker.bindPopup(`
        <strong>${place.name || "Unknown"}</strong><br>
        ${place.address || ""}
      `);

      group.addLayer(marker);
    });

    group.addTo(map);

    markerLayers[key] = group;
  });
}

// ===============================
// ZONES
// ===============================

function renderZones() {
  // Remove previous circles
  console.log("renderZones called");
  zoneLayers.forEach(layer => map.removeLayer(layer));
  zoneLayers = [];

  const zones = predictionData.data.zones || [];

  zones.forEach((zone) => {

    let color = "green";

    if (zone.priority === "HIGH") {
      color = "red";
    } else if (zone.priority === "MEDIUM") {
      color = "orange";
    }

    const circle = L.circle(
      [zone.latitude, zone.longitude],
      {
        radius: zone.radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 2
      }
    ).bindPopup(`
      <b>${zone.priority} Priority Zone</b><br>
      Radius: ${(zone.radius / 1000).toFixed(1)} km
    `);

    circle.addTo(map);
    zoneLayers.push(circle);
    console.log("Zones:", predictionData.data.zones);
  });
}
// ===============================
// FILTER BUTTONS
// ===============================

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.onclick = () => {
    const type = btn.dataset.type;

    Object.values(markerLayers).forEach((layer) => {
      map.removeLayer(layer);
    });

    if (type === "all") {
      Object.values(markerLayers).forEach((layer) => {
        layer.addTo(map);
      });

      return;
    }

    markerLayers[type].addTo(map);
  };
});

// ===============================
// HISTORY
// ===============================

async function loadHistory() {

  const response = await fetch(API + "/predictions/history/all");

  const json = await response.json();

  historyContainer.innerHTML = "";

  json.data.forEach(item=>{

    historyContainer.innerHTML += `

    <div class="history-card">

      <h4>${item.prediction.risk}</h4>

      <p>${item.prediction.probability}%</p>

      <small>${new Date(item.createdAt).toLocaleString()}</small>

    </div>

    `;

  });

}
document.querySelectorAll(".filter-btn").forEach((btn) => {

  btn.onclick = () => {

    const layer = btn.dataset.layer;

    Object.values(markerLayers).forEach(group => {
      map.removeLayer(group);
    });

    if(layer === "all"){
      Object.values(markerLayers).forEach(group=>{
        group.addTo(map);
      });
      return;
    }

    const mapping = {
      hospital: "hospitals",
      shelter: "shelters",
      police: "policeStations",
      fire: "fireStations",
      pharmacy: "pharmacies",
      school: "schools"
    };

    if(markerLayers[mapping[layer]]){
      markerLayers[mapping[layer]].addTo(map);
    }
  };

});
