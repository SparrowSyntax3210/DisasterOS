"use strict";

console.log("🗺️ Command Center Map JS Loaded");

const CommandCenterMap = (() => {

  let map = null;

  const markers = {
    incidents: new Map(),
    sos: new Map(),
    missions: new Map(),
    resources: new Map()
  };

  // ========================================================
  // INITIALIZE MAP
  // ========================================================

  function initialize(lat, lng) {

    lat = Number(lat);
    lng = Number(lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.error(
        "❌ Invalid map coordinates:",
        lat,
        lng
      );

      return null;
    }

    // ------------------------------------------------------
    // Map already exists
    // ------------------------------------------------------

    if (map) {

      map.setView(
        [lat, lng],
        12.8
      );

      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      renderCurrentLocation(
        lat,
        lng
      );

      return map;
    }

    // ------------------------------------------------------
    // Find container
    // ------------------------------------------------------

    const container =
      document.querySelector("#commandMap") ||
      document.querySelector("#map") ||
      document.querySelector(".command-map");

    if (!container) {

      console.error(
        "❌ Command map container not found."
      );

      return null;
    }

    // ------------------------------------------------------
    // Create map
    // ------------------------------------------------------

    map = L.map(container, {
      zoomControl: true
    }).setView(
      [lat, lng],
      12.8
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; OpenStreetMap contributors"
      }
    ).addTo(map);

    console.log(
      "✅ Command map initialized:",
      lat,
      lng
    );

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    renderCurrentLocation(
      lat,
      lng
    );

    renderAll(
      CommandCenterData.getState()
    );

    return map;
  }

  // ========================================================
  // CURRENT LOCATION
  // ========================================================

  let currentLocationMarker = null;

  function renderCurrentLocation(
    lat,
    lng
  ) {

    if (!map) return;

    if (currentLocationMarker) {
      try {
        map.removeLayer(
          currentLocationMarker
        );
      } catch {}
    }

    currentLocationMarker =
      L.circleMarker(
        [lat, lng],
        {
          radius: 8,
          weight: 3,
          fillOpacity: 1
        }
      )
      .addTo(map)
      .bindPopup(
        "Command Center Location"
      );
  }

  // ========================================================
  // CLEAR MARKERS
  // ========================================================

  function clearGroup(group) {

    if (!map) return;

    group.forEach((marker) => {

      try {
        map.removeLayer(marker);
      } catch {}

    });

    group.clear();
  }

  // ========================================================
  // COORDINATES
  // ========================================================

  function getCoordinates(item) {

    // Use shared utility if available
    if (
      typeof window.commandCoordinates ===
      "function"
    ) {
      return window.commandCoordinates(item);
    }

    // Fallback
    const geometry =
      item?.geometry?.coordinates;

    const lat = Number(
      item?.latitude ??
      item?.lat ??
      item?.location?.latitude ??
      item?.location?.lat ??
      item?.properties?.latitude ??
      item?.properties?.lat ??
      geometry?.[1]
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
      geometry?.[0]
    );

    return {
      lat,
      lng
    };
  }

  // ========================================================
  // INCIDENTS
  // ========================================================

  function renderIncidents(
    incidents = []
  ) {

    if (!map) return;

    clearGroup(
      markers.incidents
    );

    incidents.forEach(
      (incident) => {

        const {
          lat,
          lng
        } = getCoordinates(
          incident
        );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          console.warn(
            "⚠️ Invalid incident coordinates:",
            incident
          );

          return;
        }

        const marker =
          L.circleMarker(
            [lat, lng],
            {
              radius: 9,
              weight: 2,
              fillOpacity: 0.8
            }
          )
          .addTo(map);

        marker.bindPopup(`
          <strong>
            ${escapeHTML(
              incident.type ||
              "Incident"
            )}
          </strong>
          <br>
          Severity:
          ${escapeHTML(
            incident.severity ||
            "UNKNOWN"
          )}
          <br>
          Status:
          ${escapeHTML(
            incident.status ||
            "REPORTED"
          )}
        `);

        const id =
          incident._id ||
          incident.incidentId ||
          crypto.randomUUID();

        markers.incidents.set(
          String(id),
          marker
        );
      }
    );
  }

  // ========================================================
  // SOS
  // ========================================================

  function renderSOS(
    requests = []
  ) {

    if (!map) return;

    clearGroup(
      markers.sos
    );

    requests.forEach(
      (sos) => {

        const {
          lat,
          lng
        } = getCoordinates(sos);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          console.warn(
            "⚠️ Invalid SOS coordinates:",
            sos
          );

          return;
        }

        const marker =
          L.marker([
            lat,
            lng
          ])
          .addTo(map);

        marker.bindPopup(`
          <strong>
            🚨 ${escapeHTML(
              sos.sosId ||
              "SOS"
            )}
          </strong>
          <br>
          Type:
          ${escapeHTML(
            sos.type ||
            "EMERGENCY"
          )}
          <br>
          Priority:
          ${escapeHTML(
            sos.priority ||
            "MEDIUM"
          )}
          <br>
          Status:
          ${escapeHTML(
            sos.status ||
            "PENDING"
          )}
        `);

        const id =
          sos._id ||
          sos.sosId ||
          crypto.randomUUID();

        markers.sos.set(
          String(id),
          marker
        );
      }
    );
  }

  // ========================================================
  // MISSIONS
  // ========================================================

  function renderMissions(
    missions = []
  ) {

    if (!map) return;

    clearGroup(
      markers.missions
    );

    missions.forEach(
      (mission) => {

        const destination =
          mission.destination;

        if (!destination) return;

        const {
          lat,
          lng
        } = getCoordinates(
          destination
        );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          console.warn(
            "⚠️ Invalid mission destination:",
            mission
          );

          return;
        }

        const marker =
          L.marker([
            lat,
            lng
          ])
          .addTo(map);

        marker.bindPopup(`
          <strong>
            🎯 ${escapeHTML(
              mission.title ||
              "Mission"
            )}
          </strong>
          <br>
          Priority:
          ${escapeHTML(
            mission.priority ||
            "NORMAL"
          )}
          <br>
          Status:
          ${escapeHTML(
            mission.status ||
            "CREATED"
          )}
        `);

        const id =
          mission._id ||
          mission.missionId ||
          crypto.randomUUID();

        markers.missions.set(
          String(id),
          marker
        );
      }
    );
  }

  // ========================================================
  // MAP RESOURCES
  // ========================================================

  function renderResources(
    resourceData = {}
  ) {

    if (!map) return;

    clearGroup(
      markers.resources
    );

    const categories = [
      "hospitals",
      "policeStations",
      "fireStations",
      "pharmacies",
      "schools",
      "shelters"
    ];

    let rendered = 0;

    categories.forEach(
      (category) => {

        const items =
          Array.isArray(
            resourceData[category]
          )
            ? resourceData[category]
            : [];

        console.log(
          `📍 Rendering ${category}:`,
          items.length
        );

        items.forEach(
          (item, index) => {

            const {
              lat,
              lng
            } = getCoordinates(item);

            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng)
            ) {

              console.warn(
                `⚠️ Invalid ${category} coordinates:`,
                item
              );

              return;
            }

            const marker =
              L.marker([
                lat,
                lng
              ])
              .addTo(map);

            marker.bindPopup(`
              <strong>
                ${escapeHTML(
                  item.name ||
                  item.properties?.name ||
                  category
                )}
              </strong>
              <br>
              Type:
              ${escapeHTML(
                category
              )}
            `);

            markers.resources.set(
              `${category}-${index}`,
              marker
            );

            rendered++;
          }
        );
      }
    );

    console.log(
      "✅ Map resources rendered:",
      rendered
    );
  }

  // ========================================================
  // RENDER ALL
  // ========================================================

  function renderAll(state) {

    if (!map) return;

    state = state || {};

    renderIncidents(
      state.incidents || []
    );

    renderSOS(
      state.sos || []
    );

    renderMissions(
      state.missions || []
    );

    renderResources(
      state.mapResources || {}
    );
  }

  // ========================================================
  // ESCAPE HTML
  // ========================================================

  function escapeHTML(value) {

    if (
      typeof window.escapeCommandHTML ===
      "function"
    ) {
      return window.escapeCommandHTML(
        value
      );
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ========================================================
  // DATA STORE SUBSCRIPTION
  // ========================================================

  CommandCenterData.subscribe(
    (state) => {

      if (!map) return;

      renderAll(state);
    }
  );

  return {
    initialize,
    renderAll
  };

})();

window.CommandCenterMap =
  CommandCenterMap;

console.log(
  "✅ Command Center Map Engine Ready"
);