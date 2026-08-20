const API = "http://localhost:4000/api";


// =====================================================
// STATE
// =====================================================

let selectedLat = null;
let selectedLng = null;
let selectedName = "";

let map = null;
let marker = null;


// =====================================================
// DOM
// =====================================================

const currentLocationBtn =
    document.getElementById("currentLocationBtn");

const locationInput =
    document.getElementById("locationInput");

const searchBtn =
    document.getElementById("searchBtn");

const continueBtn =
    document.getElementById("continueBtn");

const suggestions =
    document.getElementById("suggestions");

const selectedLocation =
    document.getElementById("selectedLocation");

const selectedNameElement =
    document.getElementById("selectedName");

const selectedCoordinates =
    document.getElementById("selectedCoordinates");


// =====================================================
// MAP
// =====================================================

function initializeMap() {

    map = L.map("locationMap", {
        zoomControl: true
    }).setView([20.5937, 78.9629], 5);


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    map.on("click", function (event) {

        const lat = event.latlng.lat;
        const lng = event.latlng.lng;

        setLocation(
            lat,
            lng,
            "Selected Map Location"
        );

    });

}


initializeMap();


// =====================================================
// SET LOCATION
// =====================================================

function setLocation(lat, lng, name) {

    selectedLat = Number(lat);
    selectedLng = Number(lng);
    selectedName = name || "Selected Location";


    // Remove previous marker

    if (marker) {
        map.removeLayer(marker);
    }


    // Add new marker

    marker = L.marker([
        selectedLat,
        selectedLng
    ]).addTo(map);


    marker.bindPopup(
        `<strong>📍 ${escapeHtml(selectedName)}</strong>`
    ).openPopup();


    // Move map

    map.flyTo(
        [selectedLat, selectedLng],
        13,
        {
            duration: 1
        }
    );


    // Update UI

    selectedNameElement.textContent =
        selectedName;

    selectedCoordinates.textContent =
        `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`;


    selectedLocation.classList.remove(
        "hidden"
    );


    continueBtn.disabled = false;

}


// =====================================================
// CURRENT LOCATION
// =====================================================

currentLocationBtn.addEventListener(
    "click",
    () => {

        if (!navigator.geolocation) {

            alert(
                "Geolocation is not supported by your browser."
            );

            return;
        }


        currentLocationBtn.disabled = true;

        currentLocationBtn.querySelector(
            "strong"
        ).textContent = "Detecting location...";


        navigator.geolocation.getCurrentPosition(

            async (position) => {

                const lat =
                    position.coords.latitude;

                const lng =
                    position.coords.longitude;


                try {

                    // Reverse geocoding through backend

                    const response =
                        await fetch(
                            `${API}/map/geocode?location=${lat},${lng}`
                        );


                    const data =
                        await response.json();


                    let name =
                        "Current Location";


                    if (
                        data.success &&
                        data.location
                    ) {

                        name =
                            data.location.name ||
                            "Current Location";

                    }


                    setLocation(
                        lat,
                        lng,
                        name
                    );


                } catch (error) {

                    console.error(
                        error
                    );


                    setLocation(
                        lat,
                        lng,
                        "Current Location"
                    );

                }


                currentLocationBtn.disabled =
                    false;


                currentLocationBtn.querySelector(
                    "strong"
                ).textContent =
                    "Use Current Location";

            },


            (error) => {

                console.error(error);


                alert(
                    "Unable to detect your location. Please allow location access."
                );


                currentLocationBtn.disabled =
                    false;


                currentLocationBtn.querySelector(
                    "strong"
                ).textContent =
                    "Use Current Location";

            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    }
);


// =====================================================
// SEARCH LOCATION
// =====================================================

searchBtn.addEventListener(
    "click",
    searchLocation
);


locationInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            searchLocation();
        }

    }
);


async function searchLocation() {

    const query =
        locationInput.value.trim();


    if (!query) {

        alert(
            "Please enter a location."
        );

        return;
    }


    searchBtn.disabled = true;

    searchBtn.textContent =
        "Searching...";


    try {

        const response =
            await fetch(
                `${API}/map/geocode?location=${encodeURIComponent(query)}`
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success ||
            !data.location
        ) {

            throw new Error(
                data.message ||
                "Location not found."
            );

        }


        const location =
            data.location;


        const lat =
            Number(location.latitude);


        const lng =
            Number(location.longitude);


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {

            throw new Error(
                "Invalid coordinates received."
            );

        }


        setLocation(
            lat,
            lng,
            location.name || query
        );


        suggestions.innerHTML = "";


    } catch (error) {

        console.error(error);


        alert(
            error.message ||
            "Unable to find location."
        );

    } finally {

        searchBtn.disabled = false;

        searchBtn.textContent =
            "Search";

    }

}


// =====================================================
// CONTINUE
// =====================================================

continueBtn.addEventListener(
    "click",
    () => {

        if (
            selectedLat === null ||
            selectedLng === null
        ) {

            alert(
                "Please select a location first."
            );

            return;
        }


        // Store location temporarily

        sessionStorage.setItem(
            "disasterOSLocation",
            JSON.stringify({

                latitude: selectedLat,

                longitude: selectedLng,

                name: selectedName

            })
        );


        // Open dashboard

        window.location.href =
            "./dashboard.html";

    }
);


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}