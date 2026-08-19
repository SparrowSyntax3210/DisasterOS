console.log("🎛️ Command Center UI Loaded");

const CommandCenterUI = (() => {

  function find(...selectors) {

    for (const selector of selectors) {

      const element =
        document.querySelector(selector);

      if (element) return element;
    }

    return null;
  }

  function setText(value, ...selectors) {

    const element =
      find(...selectors);

    if (!element) return;

    element.textContent =
      value ?? 0;
  }

  function renderCounters(state) {

    const stats =
      state.stats || {};

    // ------------------------------------------------------
    // INCIDENTS
    // ------------------------------------------------------

    setText(
      stats.incidents,
      "#incidentCount",
      "#totalIncidents",
      "[data-stat='incidents']",
      "[data-counter='incidents']"
    );

    setText(
      stats.activeIncidents,
      "#activeIncidentCount",
      "#activeIncidents",
      "[data-stat='active-incidents']",
      "[data-counter='active-incidents']"
    );

    setText(
      stats.criticalIncidents,
      "#criticalIncidentCount",
      "#criticalIncidents",
      "[data-stat='critical-incidents']",
      "[data-counter='critical-incidents']"
    );

    // ------------------------------------------------------
    // MISSIONS
    // ------------------------------------------------------

    setText(
      stats.missions,
      "#missionCount",
      "#totalMissions",
      "[data-stat='missions']",
      "[data-counter='missions']"
    );

    setText(
      stats.activeMissions,
      "#activeMissionCount",
      "#activeMissions",
      "[data-stat='active-missions']",
      "[data-counter='active-missions']"
    );

    // ------------------------------------------------------
    // RESOURCES
    // ------------------------------------------------------

    setText(
      stats.resources,
      "#resourceCount",
      "#totalResources",
      "[data-stat='resources']",
      "[data-counter='resources']"
    );

    // ------------------------------------------------------
    // SOS
    // ------------------------------------------------------

    setText(
      stats.sos,
      "#sosCount",
      "#totalSOS",
      "[data-stat='sos']",
      "[data-counter='sos']"
    );

    setText(
      stats.pendingSOS,
      "#pendingSOS",
      "[data-stat='pending-sos']",
      "[data-counter='pending-sos']"
    );

    setText(
      stats.criticalSOS,
      "#criticalSOS",
      "[data-stat='critical-sos']",
      "[data-counter='critical-sos']"
    );
  }

  function renderIncidentList(state) {

    const container =
      find(
        "#incidentList",
        "#incidentsList",
        "[data-list='incidents']"
      );

    if (!container) return;

    const incidents =
      state.incidents || [];

    if (!incidents.length) {

      container.innerHTML = `
        <div class="empty-state">
          No incidents reported
        </div>
      `;

      return;
    }

    container.innerHTML =
      incidents
        .slice(0, 10)
        .map((incident) => {

          const severity =
            String(
              incident.severity || "UNKNOWN"
            ).toUpperCase();

          return `
            <div class="incident-item"
                 data-id="${incident._id || ""}">

              <div class="incident-main">

                <strong>
                  ${escapeHTML(
                    incident.type || "Incident"
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    incident.incidentId ||
                    incident._id ||
                    ""
                  )}
                </span>

              </div>

              <div class="incident-meta">

                <span>
                  ${escapeHTML(
                    incident.status || "REPORTED"
                  )}
                </span>

                <b class="severity-${severity.toLowerCase()}">
                  ${severity}
                </b>

              </div>

            </div>
          `;

        })
        .join("");
  }

  function renderMissionList(state) {

    const container =
      find(
        "#missionList",
        "#missionsList",
        "[data-list='missions']"
      );

    if (!container) return;

    const missions =
      state.missions || [];

    if (!missions.length) {

      container.innerHTML = `
        <div class="empty-state">
          No missions created
        </div>
      `;

      return;
    }

    container.innerHTML =
      missions
        .slice(0, 10)
        .map((mission) => {

          return `
            <div class="mission-item"
                 data-id="${mission._id || ""}">

              <strong>
                ${escapeHTML(
                  mission.title ||
                  "Untitled Mission"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  mission.priority || "NORMAL"
                )}
              </span>

              <small>
                ${escapeHTML(
                  mission.status || "CREATED"
                )}
              </small>

            </div>
          `;

        })
        .join("");
  }

  function renderSOSList(state) {

    const container =
      find(
        "#sosList",
        "#sosRequests",
        "[data-list='sos']"
      );

    if (!container) return;

    const requests =
      state.sos || [];

    if (!requests.length) {

      container.innerHTML = `
        <div class="empty-state">
          No SOS requests
        </div>
      `;

      return;
    }

    container.innerHTML =
      requests
        .slice(0, 10)
        .map((sos) => {

          return `
            <div class="sos-item"
                 data-id="${sos._id || ""}">

              <strong>
                ${escapeHTML(
                  sos.sosId || "SOS"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  sos.type || "EMERGENCY"
                )}
              </span>

              <b>
                ${escapeHTML(
                  sos.priority || "MEDIUM"
                )}
              </b>

            </div>
          `;

        })
        .join("");
  }

  function render(state, type) {

    renderCounters(state);

    renderIncidentList(state);

    renderMissionList(state);

    renderSOSList(state);

    updateLastUpdated(state);
  }

  function updateLastUpdated(state) {

    const element =
      find(
        "#lastUpdated",
        "[data-last-updated]"
      );

    if (!element) return;

    if (!state.lastUpdated) return;

    const date =
      new Date(state.lastUpdated);

    element.textContent =
      `Updated ${date.toLocaleTimeString()}`;
  }

  function escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  CommandCenterData.subscribe(render);

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      render(
        CommandCenterData.getState(),
        "initial"
      );

    }
  );

  return {
    render,
    renderCounters,
  };

})();

window.CommandCenterUI =
  CommandCenterUI;

console.log("✅ Command Center UI Ready");