const API = "http://localhost:4000/api";


// =====================================================
// GET SELECTED LOCATION
// =====================================================

// const storedLocation =
//     sessionStorage.getItem(
//         "disasterOSLocation"
//     );


// if (!storedLocation) {

//     window.location.href =
//         "./index.html";

//     throw new Error(
//         "No DisasterOS location selected."
//     );
// }


const locationData =
    JSON.parse(storedLocation);


let selectedLat =
    Number(locationData.latitude);


let selectedLng =
    Number(locationData.longitude);


let selectedPlaceName =
    locationData.name ||
    "Selected Location";

/* =========================================================
   DOM
========================================================= */

const locationText =
    document.getElementById("locationText");

const userName =
    document.getElementById("userName");

const lastUpdated =
    document.getElementById("lastUpdated");

const riskLevel =
    document.getElementById("riskLevel");

const riskProbability =
    document.getElementById("riskProbability");

const riskProgress =
    document.getElementById("riskProgress");

const temperature =
    document.getElementById("temperature");

const weatherCondition =
    document.getElementById("weatherCondition");

const weatherLocation =
    document.getElementById("weatherLocation");

const humidity =
    document.getElementById("humidity");

const windSpeed =
    document.getElementById("windSpeed");

const alertCount =
    document.getElementById("alertCount");

const hospitalCount =
    document.getElementById("hospitalCount");

const fireCount =
    document.getElementById("fireCount");

const policeCount =
    document.getElementById("policeCount");

const shelterCount =
    document.getElementById("shelterCount");

const recentAlerts =
    document.getElementById("recentAlerts");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🚀 DisasterOS Citizen Dashboard"
        );

        loadUser();

        await initializeDashboard();

    }
);


/* =========================================================
   USER
========================================================= */

function loadUser() {

    /*
     * This supports your existing authentication
     * if the user object is stored in localStorage.
     */

    const possibleKeys = [
        "user",
        "authUser",
        "currentUser",
        "loggedInUser"
    ];


    let storedUser = null;


    for (const key of possibleKeys) {

        const value =
            localStorage.getItem(key);

        if (!value) continue;


        try {

            storedUser =
                JSON.parse(value);

            break;

        } catch {

            storedUser = {
                name: value
            };

            break;
        }

    }


    if (
        storedUser &&
        userName
    ) {

        userName.textContent =
            storedUser.name ||
            storedUser.username ||
            storedUser.email ||
            "Citizen";

    }

}


/* =========================================================
   DASHBOARD INITIALIZATION
========================================================= */

async function initializeDashboard() {

    try {

        setDashboardLoading(true);


        /*
         * STEP 1
         * Get current location
         */

        dashboardLocation =
            await getCurrentLocation();


        console.log(
            "📍 Location:",
            dashboardLocation
        );


        updateLocationUI();


        /*
         * STEP 2
         * Load prediction + weather + resources
         */

        await Promise.all([
            loadPrediction(),
            loadWeather(),
            loadResources(),
            loadAlerts()
        ]);


        updateLastUpdated();


    } catch (error) {

        console.error(
            "Dashboard initialization failed:",
            error
        );

        showDashboardError(
            error.message
        );

    } finally {

        setDashboardLoading(false);

    }

}


/* =========================================================
   LOCATION UI
========================================================= */

function updateLocationUI() {

    if (!locationText) return;


    if (
        dashboardLocation.latitude === null
    ) {

        locationText.textContent =
            "Location unavailable";

        return;

    }


    locationText.textContent =
        formatCoordinates(
            dashboardLocation.latitude,
            dashboardLocation.longitude
        );

}


/* =========================================================
   PREDICTION
========================================================= */

async function loadPrediction() {

    if (
        dashboardLocation.latitude === null ||
        dashboardLocation.longitude === null
    ) {

        return;

    }


    try {

        const response =
            await getPrediction(
                dashboardLocation.latitude,
                dashboardLocation.longitude
            );


        if (!response.success) {

            throw new Error(
                response.message ||
                "Prediction failed"
            );

        }


        predictionData =
            response.data;


        console.log(
            "🤖 Prediction:",
            predictionData
        );


        renderPrediction();


    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        if (riskLevel) {

            riskLevel.textContent =
                "UNAVAILABLE";

            riskLevel.style.color =
                "var(--text-muted)";

        }

    }

}


/* =========================================================
   RENDER PREDICTION
========================================================= */

function renderPrediction() {

    if (!predictionData) return;


    const prediction =
        predictionData.prediction || {};


    const risk =
        String(
            prediction.risk || "LOW"
        ).toUpperCase();


    const probability =
        Number(
            prediction.probability || 0
        );


    if (riskLevel) {

        riskLevel.textContent =
            risk;

    }


    if (riskProbability) {

        riskProbability.textContent =
            `${probability}% probability`;

    }


    if (riskProgress) {

        riskProgress.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    probability
                )
            )}%`;


        if (
            risk === "EXTREME" ||
            risk === "CRITICAL"
        ) {

            riskProgress.style.background =
                "var(--danger)";

            riskLevel.style.color =
                "var(--danger)";

        }

        else if (risk === "HIGH") {

            riskProgress.style.background =
                "var(--warning)";

            riskLevel.style.color =
                "var(--warning)";

        }

        else {

            riskProgress.style.background =
                "var(--accent)";

            riskLevel.style.color =
                "var(--accent)";

        }

    }

}


/* =========================================================
   WEATHER
========================================================= */

async function loadWeather() {

    if (
        dashboardLocation.latitude === null
    ) {

        return;

    }


    try {

        const response =
            await getLiveWeather(
                dashboardLocation.latitude,
                dashboardLocation.longitude
            );


        if (!response.success) {

            throw new Error(
                response.message ||
                "Weather unavailable"
            );

        }


        weatherData =
            response.data;


        console.log(
            "🌦 Weather:",
            weatherData
        );


        renderWeather();


    } catch (error) {

        console.error(
            "Weather error:",
            error
        );


        if (weatherCondition) {

            weatherCondition.textContent =
                "Unavailable";

        }

    }

}


/* =========================================================
   RENDER WEATHER
========================================================= */

function renderWeather() {

    if (!weatherData) return;


    const temperatureValue =
        weatherData.temperature ??
        weatherData.temp ??
        "--";


    const humidityValue =
        weatherData.humidity ??
        "--";


    const windValue =
        weatherData.windSpeed ??
        weatherData.wind_speed ??
        weatherData.wind ??
        "--";


    const condition =
        weatherData.condition ||
        weatherData.description ||
        weatherData.weather ||
        "Live conditions";


    if (temperature) {

        temperature.textContent =
            `${temperatureValue}°`;

    }


    if (humidity) {

        humidity.textContent =
            humidityValue;

    }


    if (windSpeed) {

        windSpeed.textContent =
            `${windValue} km/h`;

    }


    if (weatherCondition) {

        weatherCondition.textContent =
            condition;

    }


    if (weatherLocation) {

        weatherLocation.textContent =
            "Current location";

    }

}


/* =========================================================
   MAP RESOURCES
========================================================= */

async function loadResources() {

    if (
        dashboardLocation.latitude === null
    ) {

        return;

    }


    try {

        const response =
            await getMapResources(
                dashboardLocation.latitude,
                dashboardLocation.longitude
            );


        if (!response.success) {

            throw new Error(
                response.message ||
                "Resources unavailable"
            );

        }


        resourcesData =
            response.resources ||
            response.data ||
            {};


        console.log(
            "🏥 Resources:",
            resourcesData
        );


        renderResources();


    } catch (error) {

        console.error(
            "Resource error:",
            error
        );

        setResourceCount(
            hospitalCount,
            "--"
        );

        setResourceCount(
            fireCount,
            "--"
        );

        setResourceCount(
            policeCount,
            "--"
        );

        setResourceCount(
            shelterCount,
            "--"
        );

    }

}


/* =========================================================
   RESOURCE COUNTS
========================================================= */

function renderResources() {

    if (!resourcesData) return;


    const hospitals =
        resourcesData.hospitals ||
        [];


    const fireStations =
        resourcesData.fireStations ||
        [];


    const policeStations =
        resourcesData.policeStations ||
        [];


    const shelters =
        resourcesData.shelters ||
        [];


    setResourceCount(
        hospitalCount,
        hospitals.length
    );


    setResourceCount(
        fireCount,
        fireStations.length
    );


    setResourceCount(
        policeCount,
        policeStations.length
    );


    setResourceCount(
        shelterCount,
        shelters.length
    );

}


function setResourceCount(
    element,
    value
) {

    if (!element) return;

    element.textContent =
        value;

}


/* =========================================================
   INCIDENT / ALERT DATA
========================================================= */

async function loadAlerts() {

    try {

        const response =
            await getIncidents();


        if (!response.success) {

            throw new Error(
                response.message ||
                "Unable to load incidents"
            );

        }


        const incidents =
            response.data || [];


        /*
         * For now incidents are displayed
         * as citizen alerts.
         *
         * Later we will create a dedicated
         * alerts collection/API.
         */

        renderAlerts(incidents);


    } catch (error) {

        console.warn(
            "Alerts unavailable:",
            error
        );


        renderAlerts([]);

    }

}


/* =========================================================
   RENDER ALERTS
========================================================= */

function renderAlerts(incidents) {

    if (!recentAlerts) return;


    if (
        !Array.isArray(incidents) ||
        incidents.length === 0
    ) {

        recentAlerts.innerHTML = `
            <div class="empty-state">

                <span>✓</span>

                <p>
                    No recent alerts
                </p>

            </div>
        `;


        if (alertCount) {

            alertCount.textContent =
                "0";

        }

        return;

    }


    const latest =
        incidents.slice(0, 4);


    if (alertCount) {

        alertCount.textContent =
            incidents.length;

    }


    recentAlerts.innerHTML =
        latest.map(
            incident => {

                const severity =
                    String(
                        incident.severity ||
                        "MEDIUM"
                    ).toUpperCase();


                const icon =
                    severity === "CRITICAL" ||
                    severity === "HIGH"
                        ? "🚨"
                        : "⚠";


                return `

                    <div class="alert-item">

                        <div class="alert-icon">
                            ${icon}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    incident.type ||
                                    "Incident"
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    incident.description ||
                                    "Emergency incident reported."
                                )}
                            </p>

                            <time>
                                ${formatDate(
                                    incident.createdAt
                                )}
                            </time>

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   LAST UPDATED
========================================================= */

function updateLastUpdated() {

    if (!lastUpdated) return;


    lastUpdated.textContent =
        `Updated ${new Date().toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )}`;

}


/* =========================================================
   LOADING STATE
========================================================= */

function setDashboardLoading(
    loading
) {

    const cards =
        document.querySelectorAll(
            ".info-card"
        );


    cards.forEach(card => {

        if (loading) {

            card.classList.add(
                "loading"
            );

        } else {

            card.classList.remove(
                "loading"
            );

        }

    });

}


/* =========================================================
   ERROR
========================================================= */

function showDashboardError(
    message
) {

    console.error(
        "Dashboard:",
        message
    );


    if (locationText) {

        locationText.textContent =
            "Using available data";

    }

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDashboard() {

    console.log(
        "🔄 Refreshing dashboard..."
    );


    await initializeDashboard();

}


/* =========================================================
   NOTIFICATION BUTTON
========================================================= */

const notificationButton =
    document.getElementById(
        "notificationButton"
    );


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "alerts.html";

        }
    );

}


/* =========================================================
   LOCATION BUTTON
========================================================= */

const locationButton =
    document.getElementById(
        "locationButton"
    );


if (locationButton) {

    locationButton.addEventListener(
        "click",
        async () => {

            try {

                locationButton.disabled =
                    true;


                locationText.textContent =
                    "Detecting...";


                dashboardLocation =
                    await getCurrentLocation();


                updateLocationUI();


                await initializeDashboard();


            } catch (error) {

                console.error(error);

            } finally {

                locationButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function formatDate(date) {

    if (!date) {

        return "Recently";

    }


    const parsed =
        new Date(date);


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        return "Recently";

    }


    return parsed.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   DEBUG
========================================================= */

window.DisasterOSDashboard = {

    refresh:
        refreshDashboard,

    location:
        () => dashboardLocation,

    prediction:
        () => predictionData,

    weather:
        () => weatherData,

    resources:
        () => resourcesData

};


console.log(
    "✅ DisasterOS dashboard.js loaded"
);