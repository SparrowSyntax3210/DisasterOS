// ==========================================================
// DISASTEROS
// FIELD MISSION / SAFETY ROUTE
// ==========================================================

const API_BASE = "http://localhost:4000";

let missionMap = null;
let currentMission = null;

let currentLocation = null;

let recommendedRouteLayer = null;
let alternativeRouteLayer = null;

let startMarker = null;
let destinationMarker = null;
let currentLocationMarker = null;

// ==========================================================
// INIT
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  initializeMap();

  initializeUI();

  await loadCurrentLocation();

  await loadMission();
});

// ==========================================================
// MAP
// ==========================================================

function initializeMap() {
  missionMap = L.map("missionMap", {
    zoomControl: false,
    attributionControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    minZoom: 2,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(missionMap);

  missionMap.setView([28.6139, 77.209], 13);

  setTimeout(() => {
    missionMap.invalidateSize(true);
  }, 300);
}

// ==========================================================
// UI
// ==========================================================

function initializeUI() {
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "./field-app.html";
  });

  document.getElementById("myLocationBtn")?.addEventListener("click", () => {
    if (!currentLocation) return;

    missionMap.setView(
      [currentLocation.latitude, currentLocation.longitude],
      15,
    );
  });

  document
    .getElementById("followRouteBtn")
    ?.addEventListener("click", followRoute);

  document
    .getElementById("viewAlternativeBtn")
    ?.addEventListener("click", viewAlternativeRoute);

  document
    .getElementById("acceptMissionBtn")
    ?.addEventListener("click", acceptMission);

  document.getElementById("detailsToggle")?.addEventListener("click", () => {
    const content = document.getElementById("detailsContent");

    if (!content) return;

    content.classList.toggle("hidden");
  });
}

// ==========================================================
// GET MISSION ID
// ==========================================================

function getMissionId() {
  const params = new URLSearchParams(window.location.search);

  return params.get("id");
}

// ==========================================================
// LOAD MISSION
// ==========================================================

async function loadMission() {
  const missionId = getMissionId();

  if (!missionId) {
    showToast("Mission ID missing");

    return;
  }

  try {
    console.log("📡 Loading mission:", missionId);

    const response = await fetch(`${API_BASE}/api/missions/${missionId}`);

    if (!response.ok) {
      throw new Error(`Mission request failed: ${response.status}`);
    }

    const result = await response.json();

    currentMission = result.data || result;

    console.log("🎯 Mission:", currentMission);

    renderMission(currentMission);
  } catch (error) {
    console.error("❌ Mission loading failed:", error);

    showToast("Unable to load mission");
  } finally {
    setTimeout(() => {
      document.getElementById("missionLoader")?.classList.add("loaded");
    }, 400);
  }
}

// ==========================================================
// RENDER MISSION
// ==========================================================

function renderMission(mission) {
  document.getElementById("missionTitle").textContent =
    mission.title || "Field Mission";

  document.getElementById("missionPriority").textContent =
    mission.priority || "NORMAL";

  document.getElementById("missionStatus").textContent =
    mission.status || "CREATED";

  document.getElementById("missionDescription").textContent =
    mission.description || "No additional instructions provided.";

  document.getElementById("missionTeam").textContent = getTeamName(
    mission.assignedTeam,
  );

  document.getElementById("missionCreatedBy").textContent = getCreatorName(
    mission.createdBy,
  );

  document.getElementById("missionDestination").textContent =
    getDestinationText(mission.destination);

  renderRoute(mission.route, mission.destination);
}

// ==========================================================
// TEAM
// ==========================================================

function getTeamName(team) {
  if (!team) {
    return "Unassigned";
  }

  if (typeof team === "string") {
    return team;
  }

  return team.name || team.teamName || team.teamId || "Assigned Team";
}

// ==========================================================
// CREATOR
// ==========================================================

function getCreatorName(createdBy) {
  if (!createdBy) {
    return "Command Center";
  }

  if (typeof createdBy === "string") {
    return createdBy;
  }

  return createdBy.name || createdBy.email || "Command Center";
}

// ==========================================================
// DESTINATION
// ==========================================================

function getDestinationCoordinates(destination) {
  if (!destination) {
    return null;
  }

  const latitude = Number(
    destination.latitude ??
      destination.lat ??
      destination.location?.latitude ??
      destination.location?.lat,
  );

  const longitude = Number(
    destination.longitude ??
      destination.lng ??
      destination.lon ??
      destination.location?.longitude ??
      destination.location?.lng,
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function getDestinationText(destination) {
  if (!destination) {
    return "Not specified";
  }

  if (typeof destination === "string") {
    return destination;
  }

  if (destination.name) {
    return destination.name;
  }

  const coords = getDestinationCoordinates(destination);

  if (coords) {
    return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }

  return "Destination";
}

// ==========================================================
// ROUTE
// ==========================================================

function renderRoute(route, destination) {
  if (!route) {
    console.warn("⚠️ Mission has no route");

    setMapStatus("NO ROUTE");

    return;
  }

  console.log("🛣 Mission route:", route);

  const routeCoordinates = extractRouteCoordinates(route);

  if (!routeCoordinates.length) {
    console.warn("⚠️ Could not extract route coordinates");

    setMapStatus("ROUTE UNAVAILABLE");

    return;
  }

  // ======================================================
  // RECOMMENDED ROUTE
  // ======================================================

  recommendedRouteLayer = L.polyline(routeCoordinates, {
    color: "#27e08b",
    weight: 5,
    opacity: 0.95,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(missionMap);

  // Glow layer

  L.polyline(routeCoordinates, {
    color: "#27e08b",
    weight: 11,
    opacity: 0.12,
    lineCap: "round",
  }).addTo(missionMap);

  // ======================================================
  // START
  // ======================================================

  const start = routeCoordinates[0];

  startMarker = L.marker(start, {
    icon: createRouteMarker("route-start", "●"),
  }).addTo(missionMap);

  startMarker.bindPopup("<strong>Mission Start</strong>");

  // ======================================================
  // DESTINATION
  // ======================================================

  const destinationCoordinates = getDestinationCoordinates(destination);

  const end = destinationCoordinates
    ? [destinationCoordinates.latitude, destinationCoordinates.longitude]
    : routeCoordinates[routeCoordinates.length - 1];

  destinationMarker = L.marker(end, {
    icon: createRouteMarker("route-end", "●"),
  }).addTo(missionMap);

  destinationMarker.bindPopup("<strong>Mission Destination</strong>");

  // ======================================================
  // FIT MAP
  // ======================================================

  const bounds = recommendedRouteLayer.getBounds();

  if (bounds.isValid()) {
    missionMap.fitBounds(bounds, {
      paddingTopLeft: [30, 100],
      paddingBottomRight: [30, 380],
    });
  }

  // ======================================================
  // ROUTE INFORMATION
  // ======================================================

  const distance = getRouteDistance(route);

  const duration = getRouteDuration(route);

  if (distance) {
    document.getElementById("routeDistance").textContent = distance;
  }

  if (duration) {
    document.getElementById("routeDuration").textContent = duration;
  }

  const description =
    route.description || route.instructions || "Safest available route";

  document.getElementById("routeDescription").textContent = description;

  setMapStatus("LIVE ROUTE");
}

// ==========================================================
// EXTRACT ROUTE COORDINATES
// ==========================================================

function extractRouteCoordinates(route) {
  /*
        Supports common formats:

        route = [
            [lat, lng],
            [lat, lng]
        ]

        OR

        route = {
            coordinates: [
                [lng, lat],
                [lng, lat]
            ]
        }

        OR

        route = {
            path: [
                { latitude, longitude }
            ]
        }
    */

  let coordinates = null;

  if (Array.isArray(route)) {
    coordinates = route;
  } else if (Array.isArray(route.coordinates)) {
    coordinates = route.coordinates;
  } else if (Array.isArray(route.path)) {
    coordinates = route.path;
  } else if (Array.isArray(route.points)) {
    coordinates = route.points;
  } else if (Array.isArray(route.geometry?.coordinates)) {
    coordinates = route.geometry.coordinates;
  }

  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map((point) => {
      // [lat, lng]

      if (Array.isArray(point) && point.length >= 2) {
        return [Number(point[0]), Number(point[1])];
      }

      // { latitude, longitude }

      if (point && typeof point === "object") {
        const lat = Number(point.latitude ?? point.lat);

        const lng = Number(point.longitude ?? point.lng ?? point.lon);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng];
        }
      }

      return null;
    })
    .filter(
      (point) =>
        point && Number.isFinite(point[0]) && Number.isFinite(point[1]),
    );
}

// ==========================================================
// ROUTE DISTANCE
// ==========================================================

function getRouteDistance(route) {
  const distance = route.distance ?? route.totalDistance ?? route.distanceKm;

  if (distance === undefined) {
    return null;
  }

  if (route.distanceKm !== undefined) {
    return `${Number(distance).toFixed(1)} km`;
  }

  if (route.distanceMeters !== undefined) {
    return `${(Number(distance) / 1000).toFixed(1)} km`;
  }

  return `${distance} km`;
}

// ==========================================================
// ROUTE DURATION
// ==========================================================

function getRouteDuration(route) {
  const duration =
    route.duration ?? route.durationMinutes ?? route.estimatedTime;

  if (duration === undefined) {
    return null;
  }

  if (route.durationSeconds !== undefined) {
    return `${Math.round(Number(duration) / 60)} min`;
  }

  if (route.durationMinutes !== undefined) {
    return `${Math.round(Number(duration))} min`;
  }

  return `${duration} min`;
}

// ==========================================================
// MARKER
// ==========================================================

function createRouteMarker(className, symbol) {
  return L.divIcon({
    className: "",

    html: `
            <div class="route-marker ${className}">
                ${symbol}
            </div>
        `,

    iconSize: [30, 30],

    iconAnchor: [15, 15],
  });
}

// ==========================================================
// FOLLOW ROUTE
// ==========================================================

function followRoute() {
  if (!recommendedRouteLayer) {
    showToast("Route unavailable");

    return;
  }

  const bounds = recommendedRouteLayer.getBounds();

  missionMap.fitBounds(bounds, {
    paddingTopLeft: [20, 80],
    paddingBottomRight: [20, 350],
  });

  showToast("Following recommended route");
}

// ==========================================================
// ALTERNATIVE
// ==========================================================

function viewAlternativeRoute() {
  if (!currentMission || !currentMission.route) {
    return;
  }

  const alternative = currentMission.route.alternative;

  if (!alternative) {
    showToast("No alternative route available");

    return;
  }

  const coordinates = extractRouteCoordinates(alternative);

  if (!coordinates.length) {
    showToast("Alternative route unavailable");

    return;
  }

  if (alternativeRouteLayer) {
    missionMap.removeLayer(alternativeRouteLayer);
  }

  alternativeRouteLayer = L.polyline(coordinates, {
    color: "#ff9d27",
    weight: 4,
    dashArray: "8 8",
    opacity: 0.95,
  }).addTo(missionMap);

  const bounds = alternativeRouteLayer.getBounds();

  missionMap.fitBounds(bounds, {
    paddingTopLeft: [20, 80],
    paddingBottomRight: [20, 350],
  });

  document.getElementById("alternativeDuration").textContent =
    getRouteDuration(alternative) || "--";

  document.getElementById("alternativeDistance").textContent =
    getRouteDistance(alternative) || "--";

  document.getElementById("alternativeDescription").textContent =
    alternative.description || "Alternative route";

  showToast("Alternative route displayed");
}

// ==========================================================
// CURRENT LOCATION
// ==========================================================

async function loadCurrentLocation() {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        latitude: position.coords.latitude,

        longitude: position.coords.longitude,
      };

      currentLocationMarker = L.marker(
        [currentLocation.latitude, currentLocation.longitude],
        {
          icon: createRouteMarker("route-current", "●"),
        },
      ).addTo(missionMap);
    },

    (error) => {
      console.warn("GPS unavailable:", error.message);
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    },
  );
}

// ==========================================================
// ACCEPT MISSION
// ==========================================================

async function acceptMission() {
  if (!currentMission?._id) {
    showToast("Mission unavailable");

    return;
  }

  const button = document.getElementById("acceptMissionBtn");

  button.disabled = true;

  button.textContent = "ACCEPTING...";

  try {
    const response = await fetch(
      `${API_BASE}/api/missions/${currentMission._id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          status: "ACCEPTED",
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to accept mission");
    }

    currentMission.status = "ACCEPTED";

    document.getElementById("missionStatus").textContent = "ACCEPTED";

    button.textContent = "MISSION ACCEPTED";

    button.classList.add("accepted");

    showToast("Mission accepted");
  } catch (error) {
    console.error(error);

    button.disabled = false;

    button.textContent = "ACCEPT MISSION";

    showToast("Could not accept mission");
  }
}

// ==========================================================
// MAP STATUS
// ==========================================================

function setMapStatus(text) {
  const element = document.getElementById("mapStatusText");

  if (element) {
    element.textContent = text;
  }
}

// ==========================================================
// TOAST
// ==========================================================

function showToast(message) {
  const toast = document.getElementById("missionToast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
