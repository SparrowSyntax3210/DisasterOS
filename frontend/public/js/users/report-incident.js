/* =========================================================
   DISASTEROS — REPORT INCIDENT
   MODULE 5
   ========================================================= */

const INCIDENT_API =
    "http://localhost:4000/api/incidents";

let incidentLocation = null;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "DisasterOS Incident Module initialized."
        );

        await loadIncidentLocation();

        setupIncidentForm();

        loadRecentIncidents();
    }
);


/* =========================================================
   GET SHARED LOCATION
   ========================================================= */

async function loadIncidentLocation() {

    /*
     * First use the SAME location that the
     * other DisasterOS modules use.
     */

    const savedLocation =
        localStorage.getItem(
            "disasterOS_location"
        );

    if (savedLocation) {

        try {

            const location =
                JSON.parse(savedLocation);

            if (
                location.latitude !== undefined &&
                location.longitude !== undefined
            ) {

                incidentLocation = {
                    latitude:
                        Number(location.latitude),

                    longitude:
                        Number(location.longitude)
                };

                updateIncidentLocationUI();

                return;
            }

        } catch (error) {

            console.error(
                "Invalid saved location:",
                error
            );
        }
    }


    /*
     * Fallback to browser GPS.
     */

    incidentLocation =
        await getIncidentBrowserLocation();

    if (incidentLocation) {

        localStorage.setItem(
            "disasterOS_location",
            JSON.stringify(incidentLocation)
        );

        updateIncidentLocationUI();

    } else {

        updateIncidentLocationUI(
            "Location unavailable"
        );
    }
}


/* =========================================================
   BROWSER LOCATION
   ========================================================= */

function getIncidentBrowserLocation() {

    return new Promise(resolve => {

        if (!navigator.geolocation) {

            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(

            position => {

                resolve({
                    latitude:
                        position.coords.latitude,

                    longitude:
                        position.coords.longitude
                });
            },

            error => {

                console.error(
                    "Location error:",
                    error
                );

                resolve(null);
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    });
}


/* =========================================================
   LOCATION UI
   ========================================================= */

function updateIncidentLocationUI(
    fallbackMessage
) {

    const element =
        document.getElementById(
            "incidentLocationValue"
        );

    if (!element) return;


    if (!incidentLocation) {

        element.textContent =
            fallbackMessage ||
            "Location unavailable";

        return;
    }


    element.textContent =
        `${incidentLocation.latitude.toFixed(6)}, ` +
        `${incidentLocation.longitude.toFixed(6)}`;
}


/* =========================================================
   REFRESH LOCATION
   ========================================================= */

async function refreshIncidentLocation() {

    const button =
        document.getElementById(
            "refreshIncidentLocation"
        );

    if (button) {
        button.textContent =
            "Locating...";
    }


    incidentLocation =
        await getIncidentBrowserLocation();


    if (incidentLocation) {

        localStorage.setItem(
            "disasterOS_location",
            JSON.stringify(incidentLocation)
        );

        updateIncidentLocationUI();

        showIncidentMessage(
            "Location updated successfully.",
            "success"
        );

    } else {

        updateIncidentLocationUI(
            "Unable to detect location"
        );

        showIncidentMessage(
            "Unable to access your location.",
            "error"
        );
    }


    if (button) {
        button.textContent =
            "↻ Update";
    }
}


/* =========================================================
   FORM SETUP
   ========================================================= */

function setupIncidentForm() {

    const form =
        document.getElementById(
            "incidentForm"
        );

    if (!form) return;


    form.addEventListener(
        "submit",
        submitIncident
    );


    const refreshButton =
        document.getElementById(
            "refreshIncidentLocation"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            refreshIncidentLocation
        );
    }
}


/* =========================================================
   GENERATE INCIDENT ID
   ========================================================= */

function generateIncidentId() {

    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();

    return `INC-${timestamp}-${random}`;
}


/* =========================================================
   SUBMIT INCIDENT
   ========================================================= */

async function submitIncident(event) {

    event.preventDefault();


    if (!incidentLocation) {

        showIncidentMessage(
            "Please allow location access before reporting the incident.",
            "error"
        );

        return;
    }


    const submitButton =
        document.getElementById(
            "incidentSubmitBtn"
        );


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Reporting Incident...";
    }


    try {

        const type =
            document.getElementById(
                "incidentType"
            ).value;


        const severity =
            document.getElementById(
                "incidentSeverity"
            ).value;


        const description =
            document.getElementById(
                "incidentDescription"
            ).value.trim();


        const peopleAffected =
            Number(
                document.getElementById(
                    "peopleAffected"
                ).value
            ) || 0;


        /*
         * Required resources
         */

        const selectedResources =
            Array.from(
                document.querySelectorAll(
                    'input[name="requiredResources"]:checked'
                )
            ).map(
                input => input.value
            );


        /*
         * Optional reporter ID.
         *
         * If your authentication system stores
         * the logged-in user's ID, we can use it.
         */

        const reportedBy =
            localStorage.getItem(
                "userId"
            ) || null;


        const payload = {

            incidentId:
                generateIncidentId(),

            type,

            description,

            latitude:
                incidentLocation.latitude,

            longitude:
                incidentLocation.longitude,

            severity,

            peopleAffected,

            reportedBy,

            requiredResources:
                selectedResources
        };


        console.log(
            "Creating incident:",
            payload
        );


        const response =
            await fetch(
                INCIDENT_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to report incident."
            );
        }


        console.log(
            "Incident created:",
            result
        );


        showIncidentMessage(
            `Incident ${result.data?.incidentId || ""} reported successfully.`,
            "success"
        );


        /*
         * Reset form
         */

        document
            .getElementById("incidentForm")
            .reset();


        /*
         * Refresh recent incidents
         */

        await loadRecentIncidents();


    } catch (error) {

        console.error(
            "Report Incident Error:",
            error
        );

        showIncidentMessage(
            error.message ||
            "Failed to report incident.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "🚨 Report Incident";
        }
    }
}


/* =========================================================
   LOAD RECENT INCIDENTS
   ========================================================= */

async function loadRecentIncidents() {

    const container =
        document.getElementById(
            "recentIncidentList"
        );

    if (!container) return;


    try {

        const response =
            await fetch(
                INCIDENT_API
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to fetch incidents."
            );
        }


        const incidents =
            result.data || [];


        renderRecentIncidents(
            incidents.slice(0, 6)
        );


    } catch (error) {

        console.error(
            "Load Incidents Error:",
            error
        );


        container.innerHTML = `
            <div class="recent-incident-meta">
                Unable to load recent incidents.
            </div>
        `;
    }
}


/* =========================================================
   RENDER RECENT INCIDENTS
   ========================================================= */

function renderRecentIncidents(
    incidents
) {

    const container =
        document.getElementById(
            "recentIncidentList"
        );

    if (!container) return;


    if (!incidents.length) {

        container.innerHTML = `
            <div class="recent-incident-meta">
                No incidents reported yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        incidents.map(incident => {

            const type =
                incident.type ||
                "Unknown Incident";


            const status =
                incident.status ||
                "REPORTED";


            const date =
                incident.createdAt
                    ? new Date(
                        incident.createdAt
                    ).toLocaleString()
                    : "Unknown";


            return `
                <div class="recent-incident">

                    <div class="recent-incident-main">

                        <div class="recent-incident-type">
                            ${escapeIncidentHTML(type)}
                        </div>

                        <div class="recent-incident-meta">
                            ${escapeIncidentHTML(
                                incident.incidentId || ""
                            )}
                            •
                            ${escapeIncidentHTML(date)}
                        </div>

                    </div>

                    <span class="incident-badge">
                        ${escapeIncidentHTML(status)}
                    </span>

                </div>
            `;

        }).join("");
}


/* =========================================================
   MESSAGE
   ========================================================= */

function showIncidentMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "incidentMessage"
        );

    if (!element) return;


    element.className =
        `incident-message ${type}`;


    element.textContent =
        message;


    element.style.display =
        "block";


    setTimeout(() => {

        element.style.display =
            "none";

    }, 5000);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeIncidentHTML(value) {

    const element =
        document.createElement("div");

    element.textContent =
        String(value ?? "");

    return element.innerHTML;
}