const MISSIONS_API =
    `${APP_CONFIG.API_BASE_URL}/missions`;

let allMissions = [];

let currentFilter = "ALL";


/* =========================================================
   LOCATION
   ========================================================= */

function loadLocation() {

    const saved =
        localStorage.getItem("userLocation");

    if (!saved) {

        document.getElementById("locationText").textContent =
            "Location unavailable";

        return;
    }

    try {

        const location = JSON.parse(saved);

        const lat =
            location.latitude ?? location.lat;

        const lng =
            location.longitude ?? location.lng;

        document.getElementById("locationText").textContent =
            `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

    } catch {

        document.getElementById("locationText").textContent =
            "Location unavailable";

    }
}


/* =========================================================
   GET MISSIONS
   ========================================================= */

async function loadMissions() {

    const container =
        document.getElementById("missionsList");

    try {

        const response =
            await fetch(MISSIONS_API);

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.message || "Unable to fetch missions"
            );

        }

        allMissions =
            result.data || [];

        updateStats();

        renderMissions();

    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="mission-loading">
                Unable to load evacuation missions.
            </div>
        `;
    }
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const active =
        allMissions.filter(m =>
            ["CREATED", "ACTIVE", "IN_PROGRESS"].includes(
                String(m.status).toUpperCase()
            )
        );

    const high =
        allMissions.filter(m =>
            ["HIGH", "CRITICAL"].includes(
                String(m.priority).toUpperCase()
            )
        );

    const completed =
        allMissions.filter(m =>
            ["COMPLETED", "RESOLVED"].includes(
                String(m.status).toUpperCase()
            )
        );


    document.getElementById("activeMissions").textContent =
        active.length;

    document.getElementById("highPriority").textContent =
        high.length;

    document.getElementById("completedMissions").textContent =
        completed.length;
}


/* =========================================================
   RENDER
   ========================================================= */

function renderMissions() {

    const container =
        document.getElementById("missionsList");


    let missions = allMissions;


    if (currentFilter !== "ALL") {

        missions =
            allMissions.filter(
                mission =>
                    String(mission.status).toUpperCase() ===
                    currentFilter
            );
    }


    if (!missions.length) {

        container.innerHTML = `
            <div class="mission-loading">
                No missions available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        missions.map(createMissionCard).join("");
}


/* =========================================================
   MISSION CARD
   ========================================================= */

function createMissionCard(mission) {

    const team =
        mission.assignedTeam;

    const destination =
        mission.destination;


    let destinationText = "Not specified";

    if (destination) {

        if (typeof destination === "string") {

            destinationText =
                destination;

        } else {

            destinationText =
                destination.name ||
                destination.address ||
                "Emergency destination";

        }
    }


    const incident =
        mission.incident?.type ||
        "General Emergency";


    return `

        <div class="mission-card">

            <div class="mission-card-header">

                <h3>
                    ${escapeHTML(mission.title || "Evacuation Mission")}
                </h3>

                <span class="mission-priority">
                    ${mission.priority || "NORMAL"}
                </span>

            </div>


            <p class="mission-description">

                ${escapeHTML(
                    mission.description ||
                    "Emergency response operation in progress."
                )}

            </p>


            <div class="mission-details">

                <div class="mission-detail">

                    <span>Destination</span>

                    <strong>
                        ${escapeHTML(destinationText)}
                    </strong>

                </div>


                <div class="mission-detail">

                    <span>Emergency</span>

                    <strong>
                        ${escapeHTML(incident)}
                    </strong>

                </div>


                <div class="mission-detail">

                    <span>Response Team</span>

                    <strong>
                        ${escapeHTML(
                            team?.name ||
                            "Response team assigned"
                        )}
                    </strong>

                </div>

            </div>


            <div class="mission-status">

                Status:
                <strong>
                    ${mission.status || "CREATED"}
                </strong>

            </div>

        </div>

    `;
}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   FILTERS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadLocation();

    loadMissions();


    document
        .querySelectorAll(".mission-filter-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll(".mission-filter-btn")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                button.classList.add("active");

                currentFilter =
                    button.dataset.filter;

                renderMissions();

            });

        });

});a