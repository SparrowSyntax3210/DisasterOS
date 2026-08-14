const API_BASE = "http://localhost:4000";

// ==========================================================
// STATE
// ==========================================================

let routeMap = null;

let routePoints = [];

let routeLine = null;

let routeMarkers = [];

let currentLocation = null;

// ==========================================================
// INIT
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeMap();

  initializeUI();

  getCurrentLocation();
});

// ==========================================================
// MAP
// ==========================================================

function initializeMap() {
  routeMap = L.map("routeMap", {
    center: [28.6139, 77.209],
    zoom: 13,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(routeMap);

  // --------------------------------------------
  // MAP CLICK = ADD ROUTE POINT
  // --------------------------------------------

  routeMap.on("click", (event) => {
    addRoutePoint(event.latlng.lat, event.latlng.lng);
  });

  // --------------------------------------------
  // DOUBLE CLICK = FINISH ROUTE
  // --------------------------------------------

  routeMap.on("dblclick", (event) => {
    event.originalEvent.preventDefault();

    updateRouteStatus();
  });

  setTimeout(() => {
    routeMap.invalidateSize();
  }, 300);
}

// ==========================================================
// ADD ROUTE POINT
// ==========================================================

function addRoutePoint(latitude, longitude) {
  const point = {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  routePoints.push(point);

  // --------------------------------------------
  // MARKER
  // --------------------------------------------

  const marker = L.circleMarker([latitude, longitude], {
    radius: 6,
    weight: 2,
    fillOpacity: 1,
  }).addTo(routeMap);

  marker.bindTooltip(`Route Point ${routePoints.length}`, {
    direction: "top",
  });

  routeMarkers.push(marker);

  // --------------------------------------------
  // DRAW LINE
  // --------------------------------------------

  redrawRoute();

  // --------------------------------------------
  // IF FIRST POINT
  // --------------------------------------------

  if (routePoints.length === 1) {
    document.getElementById("destinationLat").value = latitude.toFixed(6);

    document.getElementById("destinationLng").value = longitude.toFixed(6);
  }

  // --------------------------------------------
  // ALWAYS UPDATE DESTINATION
  // --------------------------------------------

  const lastPoint = routePoints[routePoints.length - 1];

  document.getElementById("destinationLat").value =
    lastPoint.latitude.toFixed(6);

  document.getElementById("destinationLng").value =
    lastPoint.longitude.toFixed(6);

  updateRouteStatus();
}

// ==========================================================
// DRAW ROUTE
// ==========================================================

function redrawRoute() {
  if (routeLine) {
    routeMap.removeLayer(routeLine);
  }

  if (routePoints.length < 2) {
    return;
  }

  const latLngs = routePoints.map((point) => [point.latitude, point.longitude]);

  routeLine = L.polyline(latLngs, {
    weight: 5,
    opacity: 0.9,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(routeMap);
}

// ==========================================================
// UNDO
// ==========================================================

function undoLastPoint() {
  if (!routePoints.length) {
    return;
  }

  routePoints.pop();

  const marker = routeMarkers.pop();

  if (marker) {
    routeMap.removeLayer(marker);
  }

  redrawRoute();

  // Update destination

  if (routePoints.length) {
    const lastPoint = routePoints[routePoints.length - 1];

    document.getElementById("destinationLat").value =
      lastPoint.latitude.toFixed(6);

    document.getElementById("destinationLng").value =
      lastPoint.longitude.toFixed(6);
  } else {
    document.getElementById("destinationLat").value = "";

    document.getElementById("destinationLng").value = "";
  }

  updateRouteStatus();
}

// ==========================================================
// CLEAR ROUTE
// ==========================================================

function clearRoute() {
  routePoints = [];

  routeMarkers.forEach((marker) => {
    routeMap.removeLayer(marker);
  });

  routeMarkers = [];

  if (routeLine) {
    routeMap.removeLayer(routeLine);

    routeLine = null;
  }

  document.getElementById("destinationLat").value = "";

  document.getElementById("destinationLng").value = "";

  updateRouteStatus();
}

// ==========================================================
// ROUTE STATUS
// ==========================================================

function updateRouteStatus() {
  const status = document.getElementById("routeStatus");

  const count = document.getElementById("routePointCount");

  const dot = document.getElementById("routeStatusDot");

  if (!routePoints.length) {
    status.textContent = "No route created";

    count.textContent = "Click on the map to start drawing.";

    dot.style.background = "#6b7c87";

    return;
  }

  if (routePoints.length === 1) {
    status.textContent = "Route started";

    count.textContent = "Add another point to create the route.";

    dot.style.background = "#f0a500";

    return;
  }

  status.textContent = "Safe route ready";

  count.textContent = `${routePoints.length} route points defined`;

  dot.style.background = "#00d084";
}

// ==========================================================
// CURRENT LOCATION
// ==========================================================

function getCurrentLocation() {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        latitude: position.coords.latitude,

        longitude: position.coords.longitude,
      };

      routeMap.setView(
        [currentLocation.latitude, currentLocation.longitude],
        14,
      );

      L.circleMarker([currentLocation.latitude, currentLocation.longitude], {
        radius: 8,
        weight: 3,
        fillOpacity: 0.9,
      })
        .addTo(routeMap)
        .bindTooltip("Command Center Location");
    },

    (error) => {
      console.warn("Location unavailable:", error.message);
    },
  );
}

// ==========================================================
// USE CURRENT LOCATION
// ==========================================================

function useCurrentLocation() {
  if (!currentLocation) {
    alert("Current location is not available yet.");

    return;
  }

  addRoutePoint(currentLocation.latitude, currentLocation.longitude);

  routeMap.setView([currentLocation.latitude, currentLocation.longitude], 15);
}

// ==========================================================
// CREATE MISSION
// ==========================================================

async function createMission() {
  const title = document.getElementById("missionTitle").value.trim();

  const description = document
    .getElementById("missionDescription")
    .value.trim();

  const priority = document.getElementById("missionPriority").value;

  const destinationName = document
    .getElementById("destinationName")
    .value.trim();

  const destinationLat = Number(
    document.getElementById("destinationLat").value,
  );

  const destinationLng = Number(
    document.getElementById("destinationLng").value,
  );

  const message = document.getElementById("formMessage");

  // --------------------------------------------
  // VALIDATION
  // --------------------------------------------

  if (!title) {
    showMessage("Mission title is required.");

    return;
  }

  if (!priority) {
    showMessage("Please select a priority.");

    return;
  }

  if (routePoints.length < 2) {
    showMessage("Please draw a safe route with at least two points.");

    return;
  }

  if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
    showMessage("Destination coordinates are required.");

    return;
  }

  const button = document.getElementById("createMissionBtn");

  button.disabled = true;

  button.textContent = "CREATING MISSION...";

  // ======================================================
  // SOCKET-READY MISSION PAYLOAD
  // ======================================================

  const missionPayload = {
    title,

    description,

    priority,

    destination: {
      name: destinationName || "Mission Destination",

      latitude: destinationLat,

      longitude: destinationLng,
    },

    route: {
      type: "SAFE",

      coordinates: routePoints.map((point) => ({
        latitude: point.latitude,

        longitude: point.longitude,
      })),
    },

    status: "CREATED",
  };

  console.log("📡 Mission payload:", missionPayload);

  try {
    const response = await fetch(`${API_BASE}/api/missions`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(missionPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Mission creation failed.");
    }

    console.log("✅ Mission created:", result);

    showMessage("Mission created successfully.", true);

    /*
     * THIS OBJECT IS WHAT WE WILL
     * LATER SEND THROUGH SOCKET.IO.
     */

    const socketPayload = {
      type: "MISSION_CREATED",

      mission: result.data,

      route: result.data.route,
    };

    console.log("📡 Socket-ready payload:", socketPayload);

    setTimeout(() => {
      window.location.href = "./command-center.html";
    }, 1200);
  } catch (error) {
    console.error("❌ Mission creation failed:", error);

    showMessage(error.message || "Failed to create mission.");

    button.disabled = false;

    button.textContent = "CREATE MISSION";
  }
}

// ==========================================================
// MESSAGE
// ==========================================================

function showMessage(text, success = false) {
  const message = document.getElementById("formMessage");

  message.textContent = text;

  message.style.color = success ? "#00d084" : "#ff6b6b";
}

// ==========================================================
// UI
// ==========================================================

function initializeUI() {
  document
    .getElementById("createMissionBtn")
    .addEventListener("click", createMission);

  document
    .getElementById("undoPointBtn")
    .addEventListener("click", undoLastPoint);

  document
    .getElementById("clearRouteBtn")
    .addEventListener("click", clearRoute);

  document
    .getElementById("useLocationBtn")
    .addEventListener("click", useCurrentLocation);

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "./command-center.html";
  });
}
