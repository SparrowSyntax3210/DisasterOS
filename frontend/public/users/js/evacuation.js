// =========================================================
// DISASTEROS EVACUATION / MISSIONS
// =========================================================

(function () {
  let initialized = false;

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  function initEvacuationOverlay() {
    if (!initialized) {
      initialized = true;

      const form = document.getElementById("missionForm");

      if (form) {
        form.addEventListener("submit", createMission);
      }

      const refresh = document.getElementById("missionRefresh");

      if (refresh) {
        refresh.addEventListener("click", loadMissions);
      }
    }

    loadMissions();
  }

  async function loadMissions() {
    const list = document.getElementById("missionList");

    try {
      const response = await fetch(`${getAPI()}/api/missions`);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      renderMissions(result.data || []);
    } catch (error) {
      console.error("Mission Error:", error);

      if (list) {
        list.innerHTML = `
                    <div class="empty-state">
                        <span>!</span>
                        <p>
                            Unable to load missions
                        </p>
                    </div>
                `;
      }
    }
  }

  async function createMission(event) {
    event.preventDefault();

    const location = window.currentLocation;

    const payload = {
      title: document.getElementById("missionTitle").value.trim(),

      description: document.getElementById("missionDescription").value.trim(),

      priority: document.getElementById("missionPriority").value,

      destination: document.getElementById("missionDestination").value.trim(),

      createdBy: window.currentUser?._id || null,
    };

    if (location) {
      payload.destination = {
        name: payload.destination,

        latitude: location.latitude,

        longitude: location.longitude,
      };
    }

    try {
      const response = await fetch(`${getAPI()}/api/missions`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message);
      }

      event.target.reset();

      await loadMissions();
    } catch (error) {
      console.error("Create Mission Error:", error);

      alert(error.message);
    }
  }

  function renderMissions(missions) {
    const list = document.getElementById("missionList");

    if (!list) {
      return;
    }

    if (!missions.length) {
      list.innerHTML = `
                <div class="empty-state">
                    <span>→</span>
                    <p>
                        No evacuation missions
                    </p>
                </div>
            `;

      return;
    }

    list.innerHTML = "";

    missions.forEach((mission) => {
      const item = document.createElement("div");

      item.className = "mission-item";

      item.innerHTML = `

                    <strong>
                        ${escapeHTML(mission.title)}
                    </strong>

                    <p>
                        ${escapeHTML(mission.description || "No description")}
                    </p>

                    <span class="mission-status">
                        ${escapeHTML(mission.status || "CREATED")}
                    </span>

                `;

      list.appendChild(item);
    });
  }

  function escapeHTML(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );
  }

  window.initEvacuationOverlay = initEvacuationOverlay;
})();
