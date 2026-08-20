const SOS_API = `${APP_CONFIG.API_BASE_URL}/sos`;

let currentLocation = null;


/* =========================================================
   GET SAVED LOCATION
   ========================================================= */

function getSavedLocation() {

    const keys = [
        "userLocation",
        "currentLocation",
        "selectedLocation",
        "disasterOSLocation"
    ];

    for (const key of keys) {

        const value = localStorage.getItem(key);

        if (!value) continue;

        try {

            const location = JSON.parse(value);

            const latitude =
                location.latitude ??
                location.lat;

            const longitude =
                location.longitude ??
                location.lng;

            if (
                latitude !== undefined &&
                longitude !== undefined
            ) {

                return {
                    latitude: Number(latitude),
                    longitude: Number(longitude)
                };

            }

        } catch (error) {
            console.warn(`Invalid ${key}`, error);
        }
    }

    return null;
}


/* =========================================================
   LOCATION
   ========================================================= */

function loadLocation() {

    const saved = getSavedLocation();

    if (saved) {

        currentLocation = saved;

        updateLocationUI();

        return;
    }

    if (!navigator.geolocation) {

        showLocationError();

        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {

            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            saveLocation(currentLocation);

            updateLocationUI();
        },

        () => {

            showLocationError();

        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}


function saveLocation(location) {

    localStorage.setItem(
        "userLocation",
        JSON.stringify(location)
    );
}


function updateLocationUI() {

    if (!currentLocation) return;

    const lat = currentLocation.latitude.toFixed(5);
    const lng = currentLocation.longitude.toFixed(5);

    document.getElementById("locationText").textContent =
        `${lat}, ${lng}`;

    document.getElementById("coordinates").textContent =
        `${lat}° , ${lng}°`;
}


function showLocationError() {

    document.getElementById("locationText").textContent =
        "Location unavailable";

    document.getElementById("coordinates").textContent =
        "Please enable location access.";
}


/* =========================================================
   SEND SOS
   ========================================================= */

async function sendSOS(event) {

    event.preventDefault();

    if (!currentLocation) {

        alert("Location is not available.");

        return;
    }

    const type =
        document.getElementById("sosType").value;

    const priority =
        document.querySelector(
            'input[name="priority"]:checked'
        )?.value;

    const peopleCount =
        document.getElementById("peopleCount").value;

    const description =
        document.getElementById("description").value;


    if (!type || !priority) {

        alert("Please select emergency type and priority.");

        return;
    }


    const button =
        document.getElementById("sendSOSBtn");

    button.disabled = true;

    button.textContent = "SENDING SOS...";


    try {

        const response = await fetch(SOS_API, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                latitude: currentLocation.latitude,

                longitude: currentLocation.longitude,

                type,

                priority,

                description,

                peopleCount: Number(peopleCount)

            })

        });


        const result = await response.json();


        if (!response.ok) {

            throw new Error(
                result.message || "Unable to send SOS"
            );
        }


        showSuccess();

        document.getElementById("sosForm").reset();

        loadSOSRequests();

    } catch (error) {

        console.error(error);

        showError(error.message);

    } finally {

        button.disabled = false;

        button.textContent = "🚨 SEND SOS";

    }
}


/* =========================================================
   GET SOS REQUESTS
   ========================================================= */

async function loadSOSRequests() {

    const list =
        document.getElementById("sosList");

    list.innerHTML =
        `<div class="sos-loading">
            Loading requests...
        </div>`;


    try {

        const response =
            await fetch(SOS_API);

        const result =
            await response.json();


        if (!response.ok) {
            throw new Error(result.message);
        }


        const requests =
            result.data || [];


        if (!requests.length) {

            list.innerHTML =
                `<div class="sos-loading">
                    No SOS requests found.
                </div>`;

            return;
        }


        list.innerHTML =
            requests.map(createSOSCard).join("");


    } catch (error) {

        list.innerHTML =
            `<div class="sos-loading">
                Unable to load SOS requests.
            </div>`;

        console.error(error);

    }
}


/* =========================================================
   SOS CARD
   ========================================================= */

function createSOSCard(sos) {

    const date =
        sos.createdAt
            ? new Date(sos.createdAt).toLocaleString()
            : "Unknown";


    return `

        <div class="sos-request">

            <div class="sos-request-top">

                <span class="sos-type">
                    ${sos.type}
                </span>

                <span class="sos-priority">
                    ${sos.priority}
                </span>

            </div>


            <div class="sos-request-info">

                <span>
                    👥 ${sos.peopleCount || 1} people
                </span>

                <span>
                    ${date}
                </span>

            </div>


            <div class="sos-status">

                Status:
                <strong>
                    ${sos.status}
                </strong>

            </div>

        </div>

    `;
}


/* =========================================================
   UI
   ========================================================= */

function showSuccess() {

    const element =
        document.getElementById("sosSuccess");

    element.style.display = "block";

    setTimeout(() => {

        element.style.display = "none";

    }, 5000);
}


function showError(message) {

    const element =
        document.getElementById("sosError");

    element.textContent =
        `Unable to send SOS: ${message}`;

    element.style.display = "block";

    setTimeout(() => {

        element.style.display = "none";

    }, 5000);
}


/* =========================================================
   EVENTS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadLocation();

    loadSOSRequests();


    document
        .getElementById("sosForm")
        .addEventListener("submit", sendSOS);


    document
        .getElementById("refreshLocation")
        .addEventListener("click", () => {

            localStorage.removeItem("userLocation");

            loadLocation();

        });

});