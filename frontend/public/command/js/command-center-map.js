"use strict";

console.log("🗺️ Command Center Map JS Loaded");

const CommandCenterMap = (() => {
  let map = null;
  let currentLocationMarker = null;

  const layers = {
    zones: L.layerGroup(),
    incidents: L.layerGroup(),
    sos: L.layerGroup(),
    missions: L.layerGroup(),
    teams: L.layerGroup(),
    resources: L.layerGroup(),
  };

  const visibility = {
    zones: true,
    incidents: true,
    sos: true,
    missions: true,
    teams: true,
    resources: true,
  };

  // ==========================================================
  // ICONS
  // ==========================================================

  const icons = {
    incident: createIcon("!", "incident"),
    sos: createIcon("SOS", "sos"),
    mission: createIcon("◆", "mission"),

    hospital: createIcon("+", "hospital"),
    police: createIcon("P", "police"),
    fire: createIcon("F", "fire"),
    pharmacy: createIcon("Rx", "pharmacy"),
    school: createIcon("S", "school"),
    shelter: createIcon("⌂", "shelter"),
    team: createIcon("●", "team"),
  };

  function createIcon(text, type) {
    return L.divIcon({
      className: `disaster-marker disaster-marker-${type}`,
      html: `
        <div class="disaster-marker-inner">
          <span>${text}</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -20],
    });
  }

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  function initialize(lat, lng) {
    lat = Number(lat);
    lng = Number(lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error("❌ Invalid map coordinates:", lat, lng);

      return null;
    }

    if (map) {
      map.setView([lat, lng], 12.8);

      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      renderCurrentLocation(lat, lng);

      renderAll(CommandCenterData.getState());

      return map;
    }

    const container =
      document.querySelector("#commandMap") ||
      document.querySelector("#map") ||
      document.querySelector(".command-map");

    if (!container) {
      console.error("❌ Command map container not found.");

      return null;
    }

    map = L.map(container, {
      zoomControl: true,
      preferCanvas: true,
    }).setView([lat, lng], 12.8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Add layer groups.
    Object.values(layers).forEach((layer) => {
      layer.addTo(map);
    });

    renderCurrentLocation(lat, lng);

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    renderAll(CommandCenterData.getState());

    console.log("✅ Command map initialized:", lat, lng);

    return map;
  }

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  function renderCurrentLocation(lat, lng) {
    if (!map) return;

    if (currentLocationMarker) {
      map.removeLayer(currentLocationMarker);
    }

    currentLocationMarker = L.circleMarker([lat, lng], {
      radius: 8,
      weight: 3,
      fillOpacity: 1,
      className: "command-location-marker",
    })
      .addTo(map)
      .bindPopup("<strong>Command Center</strong><br>Operational Location");
  }

  // ==========================================================
  // CLEAR
  // ==========================================================

  function clearLayer(layer) {
    if (!layer) return;

    layer.clearLayers();
  }

  // ==========================================================
  // COORDINATES
  // ==========================================================

  function getCoordinates(item) {
    if (typeof window.commandCoordinates === "function") {
      const result = window.commandCoordinates(item);

      if (result) {
        return {
          lat: Number(result.lat),
          lng: Number(result.lng),
        };
      }
    }

    const geometry = item?.geometry?.coordinates;

    const lat = Number(
      item?.latitude ??
        item?.lat ??
        item?.location?.latitude ??
        item?.location?.lat ??
        item?.properties?.latitude ??
        item?.properties?.lat ??
        geometry?.[1],
    );

    const lng = Number(
      item?.longitude ??
        item?.lng ??
        item?.lon ??
        item?.location?.longitude ??
        item?.location?.lng ??
        item?.location?.lon ??
        item?.properties?.longitude ??
        item?.properties?.lng ??
        geometry?.[0],
    );

    return {
      lat,
      lng,
    };
  }

  // ==========================================================
  // INCIDENTS
  // ==========================================================

  function renderIncidents(incidents = []) {
    if (!map) return;

    clearLayer(layers.incidents);

    incidents.forEach((incident) => {
      const { lat, lng } = getCoordinates(incident);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const severity = String(incident.severity || "UNKNOWN").toUpperCase();

      const marker = L.marker([lat, lng], {
        icon: icons.incident,
        zIndexOffset: 300,
      });

      marker.bindPopup(`
        <div class="command-popup incident-popup">

          <div class="popup-kicker">
            INCIDENT
          </div>

          <h3>
            ${escapeHTML(incident.type || "Emergency Incident")}
          </h3>

          <div class="popup-row">
            <span>ID</span>
            <strong>
              ${escapeHTML(incident.incidentId || incident._id || "—")}
            </strong>
          </div>

          <div class="popup-row">
            <span>Severity</span>
            <strong class="popup-severity">
              ${escapeHTML(severity)}
            </strong>
          </div>

          <div class="popup-row">
            <span>Status</span>
            <strong>
              ${escapeHTML(incident.status || "REPORTED")}
            </strong>
          </div>

        </div>
      `);

      if (visibility.incidents) {
        marker.addTo(layers.incidents);
      }
    });
  }

  // ==========================================================
  // SOS
  // ==========================================================

  function renderSOS(requests = []) {
    if (!map) return;

    clearLayer(layers.sos);

    requests.forEach((sos) => {
      const { lat, lng } = getCoordinates(sos);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: icons.sos,
        zIndexOffset: 500,
      });

      marker.bindPopup(`
        <div class="command-popup sos-popup">

          <div class="popup-kicker">
            EMERGENCY SOS
          </div>

          <h3>
            ${escapeHTML(sos.sosId || "SOS REQUEST")}
          </h3>

          <div class="popup-row">
            <span>Type</span>
            <strong>
              ${escapeHTML(sos.type || "EMERGENCY")}
            </strong>
          </div>

          <div class="popup-row">
            <span>Priority</span>
            <strong>
              ${escapeHTML(sos.priority || "MEDIUM")}
            </strong>
          </div>

          <div class="popup-row">
            <span>Status</span>
            <strong>
              ${escapeHTML(sos.status || "PENDING")}
            </strong>
          </div>

          <div class="popup-row">
            <span>People</span>
            <strong>
              ${Number(sos.peopleCount || 1)}
            </strong>
          </div>

        </div>
      `);

      if (visibility.sos) {
        marker.addTo(layers.sos);
      }
    });
  }

  // ==========================================================
  // MISSIONS
  // ==========================================================

  function renderMissions(missions = []) {
    if (!map) return;

    clearLayer(layers.missions);

    missions.forEach((mission) => {
      const destination = mission.destination;

      if (!destination) return;

      const { lat, lng } = getCoordinates(destination);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker([lat, lng], {
        icon: icons.mission,
        zIndexOffset: 400,
      });

      marker.bindPopup(`
        <div class="command-popup mission-popup">

          <div class="popup-kicker">
            FIELD MISSION
          </div>

          <h3>
            ${escapeHTML(mission.title || "Mission")}
          </h3>

          <div class="popup-row">
            <span>Priority</span>
            <strong>
              ${escapeHTML(mission.priority || "NORMAL")}
            </strong>
          </div>

          <div class="popup-row">
            <span>Status</span>
            <strong>
              ${escapeHTML(mission.status || "CREATED")}
            </strong>
          </div>

        </div>
      `);

      if (visibility.missions) {
        marker.addTo(layers.missions);
      }

      // Safe route
      if (
        mission.route &&
        Array.isArray(mission.route.coordinates) &&
        mission.route.coordinates.length >= 2
      ) {
        const routePoints = mission.route.coordinates
          .map((point) => {
            if (Array.isArray(point) && point.length >= 2) {
              return [Number(point[1]), Number(point[0])];
            }

            return null;
          })
          .filter(Boolean);

        if (routePoints.length >= 2) {
          const route = L.polyline(routePoints, {
            weight: 4,
            opacity: 0.8,
            dashArray: "8 8",
            className: "mission-route",
          });

          if (visibility.missions) {
            route.addTo(layers.missions);
          }
        }
      }
    });
  }

  // ==========================================================
  // RESOURCES
  // ==========================================================

  function renderResources(resourceData = {}) {
    if (!map) return;

    clearLayer(layers.resources);

    const categories = {
      hospitals: {
        icon: icons.hospital,
        label: "Hospital",
      },

      policeStations: {
        icon: icons.police,
        label: "Police Station",
      },

      fireStations: {
        icon: icons.fire,
        label: "Fire Station",
      },

      pharmacies: {
        icon: icons.pharmacy,
        label: "Pharmacy",
      },

      schools: {
        icon: icons.school,
        label: "School",
      },

      shelters: {
        icon: icons.shelter,
        label: "Shelter",
      },
    };

    let rendered = 0;

    Object.entries(categories).forEach(([category, config]) => {
      const items = Array.isArray(resourceData[category])
        ? resourceData[category]
        : [];

      items.forEach((item) => {
        const { lat, lng } = getCoordinates(item);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }

        const name = item.name || item.properties?.name || config.label;

        const marker = L.marker([lat, lng], {
          icon: config.icon,
          zIndexOffset: 100,
        });

        marker.bindPopup(`
            <div class="command-popup resource-popup">

              <div class="popup-kicker">
                FIELD RESOURCE
              </div>

              <h3>
                ${escapeHTML(name)}
              </h3>

              <div class="popup-row">
                <span>Type</span>
                <strong>
                  ${escapeHTML(config.label)}
                </strong>
              </div>

              ${
                item.address || item.properties?.address
                  ? `
                    <div class="popup-address">
                      ${escapeHTML(item.address || item.properties.address)}
                    </div>
                  `
                  : ""
              }

            </div>
          `);

        if (visibility.resources) {
          marker.addTo(layers.resources);
        }

        rendered++;
      });
    });

    console.log("✅ Map resources rendered:", rendered);
  }

  // ==========================================================
  // LAYER VISIBILITY
  // ==========================================================

  function setLayerVisibility(layerName, visible) {
    if (!map) {
      console.warn("⚠️ Map not initialized.");
      return;
    }

    if (!layers[layerName]) {
      console.warn("⚠️ Unknown map layer:", layerName);
      return;
    }

    visibility[layerName] = Boolean(visible);

    const layer = layers[layerName];

    if (visibility[layerName]) {
      if (!map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }

    console.log(
      `🎚️ Layer ${layerName}:`,
      visibility[layerName] ? "VISIBLE" : "HIDDEN",
    );
  }

  // ==========================================================
  // GET VISIBILITY
  // ==========================================================

  function getLayerVisibility() {
    return {
      ...visibility,
    };
  }

  // ==========================================================
  // RENDER ALL
  // ==========================================================

  function renderAll(state = {}) {
    if (!map) return;

    renderIncidents(state.incidents || []);

    renderSOS(state.sos || []);

    renderMissions(state.missions || []);

    renderResources(state.mapResources || {});
  }

  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

  function escapeHTML(value) {
    if (typeof window.escapeCommandHTML === "function") {
      return window.escapeCommandHTML(value);
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================================
  // DATA SUBSCRIPTION
  // ==========================================================

  CommandCenterData.subscribe((state) => {
    if (!map) return;

    renderAll(state);
  });

  return {
    initialize,
    renderAll,
    setLayerVisibility,
    getLayerVisibility,
  };
})();

window.CommandCenterMap = CommandCenterMap;

console.log("✅ Command Center Map Engine Ready");
