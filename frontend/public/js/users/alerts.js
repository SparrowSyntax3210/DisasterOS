const INCIDENTS_API =
    `${APP_CONFIG.API_BASE_URL}/incidents`;

const SOS_API_URL =
    `${APP_CONFIG.API_BASE_URL}/sos`;

const MISSIONS_API_URL =
    `${APP_CONFIG.API_BASE_URL}/missions`;


let alerts = [];

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

        const location =
            JSON.parse(saved);

        const lat =
            location.latitude ??
            location.lat;

        const lng =
            location.longitude ??
            location.lng;


        document.getElementById("locationText").textContent =
            `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

    } catch {

        document.getElementById("locationText").textContent =
            "Location unavailable";

    }
}


/* =========================================================
   LOAD EXISTING ALERTS
   ========================================================= */

async function loadAlerts() {

    try {

        const [
            incidentResponse,
            sosResponse,
            missionResponse
        ] = await Promise.all([

            fetch(INCIDENTS_API),

            fetch(SOS_API_URL),

            fetch(MISSIONS_API_URL)

        ]);


        const incidents =
            await incidentResponse.json();

        const sos =
            await sosResponse.json();

        const missions =
            await missionResponse.json();


        alerts = [];


        /* INCIDENTS */

        (incidents.data || []).forEach(incident => {

            alerts.push({

                id: incident._id,

                type: "INCIDENT",

                title:
                    `Incident: ${incident.type}`,

                message:
                    incident.description ||
                    "Emergency incident reported.",

                priority:
                    incident.severity ||
                    "MEDIUM",

                status:
                    incident.status,

                createdAt:
                    incident.createdAt

            });

        });


        /* SOS */

        (sos.data || []).forEach(request => {

            alerts.push({

                id: request._id,

                type: "SOS",

                title:
                    `SOS: ${request.type}`,

                message:
                    request.description ||
                    "Emergency SOS request received.",

                priority:
                    request.priority,

                status:
                    request.status,

                createdAt:
                    request.createdAt

            });

        });


        /* MISSIONS */

        (missions.data || []).forEach(mission => {

            alerts.push({

                id: mission._id,

                type: "MISSION",

                title:
                    mission.title ||
                    "Emergency Mission",

                message:
                    mission.description ||
                    "Emergency response mission created.",

                priority:
                    mission.priority,

                status:
                    mission.status,

                createdAt:
                    mission.createdAt

            });

        });


        sortAlerts();

        renderAlerts();

    } catch (error) {

        console.error(
            "Alert loading error:",
            error
        );

        document.getElementById("alertsList").innerHTML =
            `<div class="alerts-loading">
                Unable to load emergency alerts.
            </div>`;
    }
}


/* =========================================================
   SORT
   ========================================================= */

function sortAlerts() {

    alerts.sort((a,b) => {

        return new Date(b.createdAt || 0) -
               new Date(a.createdAt || 0);

    });

}


/* =========================================================
   SOCKET.IO
   ========================================================= */

function initializeSocket() {

    try {

        const socketURL =
            APP_CONFIG.API_BASE_URL
                .replace("/api", "");

        const socket =
            io(socketURL);


        socket.on("connect", () => {

            document.getElementById(
                "connectionStatus"
            ).textContent =
                "Connected — receiving live alerts";


            document.getElementById(
                "connectionDot"
            ).classList.add("connected");

        });


        socket.on("disconnect", () => {

            document.getElementById(
                "connectionStatus"
            ).textContent =
                "Disconnected — reconnecting...";

        });


        /* ================================================
           SOS
           ================================================ */

        socket.on("sos:created", data => {

            if (!data?.sos) return;

            addRealtimeAlert({

                id: data.sos._id,

                type: "SOS",

                title:
                    `SOS: ${data.sos.type}`,

                message:
                    data.sos.description ||
                    "New emergency SOS request.",

                priority:
                    data.sos.priority,

                status:
                    data.sos.status,

                createdAt:
                    data.sos.createdAt ||
                    new Date().toISOString()

            });

        });


        /* ================================================
           INCIDENT
           ================================================ */

        socket.on("incident:created", data => {

            if (!data?.incident) return;

            addRealtimeAlert({

                id: data.incident._id,

                type: "INCIDENT",

                title:
                    `Incident: ${data.incident.type}`,

                message:
                    data.incident.description ||
                    "New emergency incident reported.",

                priority:
                    data.incident.severity,

                status:
                    data.incident.status,

                createdAt:
                    data.incident.createdAt ||
                    new Date().toISOString()

            });

        });


        /* ================================================
           MISSION
           ================================================ */

        socket.on("mission:created", data => {

            if (!data?.mission) return;

            addRealtimeAlert({

                id: data.mission._id,

                type: "MISSION",

                title:
                    data.mission.title ||
                    "New Emergency Mission",

                message:
                    data.mission.description ||
                    "New emergency response mission.",

                priority:
                    data.mission.priority,

                status:
                    data.mission.status,

                createdAt:
                    data.mission.createdAt ||
                    new Date().toISOString()

            });

        });


        socket.on("sos:updated", data => {

            if (!data?.sos) return;

            updateRealtimeAlert(
                data.sos._id,
                data.sos.status
            );

        });


        socket.on("incident:updated", data => {

            if (!data?.incident) return;

            updateRealtimeAlert(
                data.incident._id,
                data.incident.status
            );

        });


        socket.on("mission:updated", data => {

            if (!data?.mission) return;

            updateRealtimeAlert(
                data.mission._id,
                data.mission.status
            );

        });


    } catch (error) {

        console.error(
            "Socket initialization error:",
            error
        );

    }
}


/* =========================================================
   ADD REALTIME ALERT
   ========================================================= */

function addRealtimeAlert(alert) {

    const existing =
        alerts.find(item =>
            item.id === alert.id
        );


    if (existing) return;


    alerts.unshift(alert);

    renderAlerts();

}


/* =========================================================
   UPDATE REALTIME ALERT
   ========================================================= */

function updateRealtimeAlert(id, status) {

    const alert =
        alerts.find(item =>
            item.id === id
        );


    if (!alert) return;


    alert.status = status;

    renderAlerts();

}


/* =========================================================
   RENDER
   ========================================================= */

function renderAlerts() {

    const container =
        document.getElementById("alertsList");


    let filtered =
        alerts;


    if (currentFilter === "SOS") {

        filtered =
            alerts.filter(
                alert => alert.type === "SOS"
            );

    }

    else if (currentFilter === "INCIDENT") {

        filtered =
            alerts.filter(
                alert => alert.type === "INCIDENT"
            );

    }

    else if (currentFilter === "MISSION") {

        filtered =
            alerts.filter(
                alert => alert.type === "MISSION"
            );

    }

    else if (currentFilter === "HIGH") {

        filtered =
            alerts.filter(alert =>

                ["HIGH", "CRITICAL"]
                    .includes(
                        String(alert.priority)
                            .toUpperCase()
                    )

            );

    }


    document.getElementById("alertCount").textContent =
        `${filtered.length} alerts`;


    if (!filtered.length) {

        container.innerHTML = `
            <div class="alerts-loading">
                No alerts available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        filtered
            .map(createAlertCard)
            .join("");

}


/* =========================================================
   ALERT CARD
   ========================================================= */

function createAlertCard(alert) {

    const icon =
        alert.type === "SOS"
            ? "🚨"
            : alert.type === "INCIDENT"
                ? "⚠"
                : "🧭";


    const priority =
        String(alert.priority || "MEDIUM")
            .toUpperCase();


    const time =
        alert.createdAt
            ? new Date(
                alert.createdAt
            ).toLocaleString()
            : "Just now";


    return `

        <div class="alert-item">

            <div class="alert-icon">
                ${icon}
            </div>


            <div class="alert-content">

                <h3>
                    ${escapeHTML(alert.title)}
                </h3>

                <p>
                    ${escapeHTML(alert.message)}
                </p>


                <div class="alert-meta">

                    <span>
                        ${alert.type}
                    </span>

                    <span>
                        ${time}
                    </span>

                    <span>
                        Status: ${alert.status || "ACTIVE"}
                    </span>

                </div>

            </div>


            <span class="
                alert-priority
                ${priority.toLowerCase()}
            ">

                ${priority}

            </span>

        </div>

    `;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value || "")
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

    loadAlerts();

    initializeSocket();


    document
        .querySelectorAll(".alert-filter")
        .forEach(button => {

            button.addEventListener("click", () => {

                document
                    .querySelectorAll(".alert-filter")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );


                button.classList.add("active");


                currentFilter =
                    button.dataset.filter;


                renderAlerts();

            });

        });


    document
        .getElementById("clearAlerts")
        .addEventListener("click", () => {

            alerts = [];

            renderAlerts();

        });

});