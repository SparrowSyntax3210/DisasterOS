/* =========================================================
   DISASTEROS — LIVE MAP
   Module 4
   ========================================================= */

const API_BASE_URL = "http://localhost:4000/api";

let liveMap = null;
let userMarker = null;

let resourceLayers = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    pharmacies: [],
    schools: [],
    shelters: []
};

let currentLocation = null;

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("DisasterOS Live Map initializing...");

    currentLocation = await getSharedLocation();

    if (!currentLocation) {
        showMapError(
            "Location unavailable. Please set your location first."
        );
        return;
    }

    initializeMap(
        currentLocation.latitude,
        currentLocation.longitude
    );

    await loadMapResources(
        currentLocation.latitude,
        currentLocation.longitude
    );

    setupMapControls();
});


/* =========================================================
   GET SHARED LOCATION
   ========================================================= */

async function getSharedLocation() {

    /*
     * IMPORTANT:
     * This does NOT use a hardcoded location.
     *
     * It first checks the location saved by your
     * previous location module.
     */

    const savedLocation =
        localStorage.getItem("disasterOS_location");

    if (savedLocation) {

        try {

            const location = JSON.parse(savedLocation);

            if (
                location.latitude !== undefined &&
                location.longitude !== undefined
            ) {
                return {
                    latitude: Number(location.latitude),
                    longitude: Number(location.longitude)
                };
            }

        } catch (error) {
            console.error(
                "Invalid saved location:",
                error
            );
        }
    }


    /*
     * Compatibility with possible existing keys
     */

    const lat =
        localStorage.getItem("latitude");

    const lng =
        localStorage.getItem("longitude");

    if (lat && lng) {

        return {
            latitude: Number(lat),
            longitude: Number(lng)
        };
    }


    /*
     * If no saved location exists,
     * ask browser for current location.
     */

    return await getBrowserLocation();
}


/* =========================================================
   BROWSER LOCATION
   ========================================================= */

function getBrowserLocation() {

    return new Promise((resolve) => {

        if (!navigator.geolocation) {

            resolve(null);

            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {

                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                /*
                 * Save it so other DisasterOS modules
                 * can use exactly the same location.
                 */

                localStorage.setItem(
                    "disasterOS_location",
                    JSON.stringify(location)
                );

                resolve(location);
            },

            error => {

                console.error(
                    "Location permission error:",
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
   INITIALIZE LEAFLET MAP
   ========================================================= */

function initializeMap(latitude, longitude) {

    const mapElement =
        document.getElementById("liveMap");

    if (!mapElement) {

        console.error(
            "Element #liveMap not found."
        );

        return;
    }


    liveMap = L.map("liveMap", {
        zoomControl: true,
        attributionControl: true
    }).setView(
        [latitude, longitude],
        14
    );


    /*
     * OpenStreetMap
     */

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(liveMap);


    /*
     * User location marker
     */

    userMarker = L.marker(
        [latitude, longitude]
    )
        .addTo(liveMap)
        .bindPopup(`
            <div class="popup-title">
                Your Location
            </div>

            <div class="popup-address">
                ${latitude.toFixed(6)},
                ${longitude.toFixed(6)}
            </div>
        `);


    /*
     * Open popup initially
     */

    userMarker.openPopup();


    /*
     * Fix Leaflet rendering when map is inside
     * dashboard/iframe/dynamic content.
     */

    setTimeout(() => {
        liveMap.invalidateSize();
    }, 300);


    updateLocationUI(latitude, longitude);
}


/* =========================================================
   LOAD MAP RESOURCES
   ========================================================= */

async function loadMapResources(latitude, longitude) {

    showMapLoading(true);

    try {

        const url =
            `${API_BASE_URL}/map/resources` +
            `?lat=${encodeURIComponent(latitude)}` +
            `&lng=${encodeURIComponent(longitude)}`;

        console.log(
            "Loading map resources:",
            url
        );

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        console.log(
            "Map resources:",
            result
        );

        if (!result.success) {

            throw new Error(
                result.message ||
                "Failed to load resources"
            );
        }

        clearResourceMarkers();

        const resources =
            result.resources || {};

        addResourceMarkers(
            resources.hospitals || [],
            "hospitals",
            "Hospital"
        );

        addResourceMarkers(
            resources.policeStations || [],
            "policeStations",
            "Police Station"
        );

        addResourceMarkers(
            resources.fireStations || [],
            "fireStations",
            "Fire Station"
        );

        addResourceMarkers(
            resources.pharmacies || [],
            "pharmacies",
            "Pharmacy"
        );

        addResourceMarkers(
            resources.schools || [],
            "schools",
            "School"
        );

        addResourceMarkers(
            resources.shelters || [],
            "shelters",
            "Shelter"
        );

        updateResourceCounts();

    } catch (error) {

        console.error(
            "Map resource error:",
            error
        );

        showMapError(
            "Unable to load nearby resources."
        );

    } finally {

        showMapLoading(false);
    }
}


/* =========================================================
   ADD RESOURCE MARKERS
   ========================================================= */

function addResourceMarkers(
    resources,
    category,
    label
) {

    if (!liveMap || !Array.isArray(resources)) {
        return;
    }


    resources.forEach(resource => {

        const coordinates =
            extractCoordinates(resource);

        if (!coordinates) {
            return;
        }

        const [latitude, longitude] =
            coordinates;


        const marker =
            L.marker([
                latitude,
                longitude
            ]);


        const name =
            resource.name ||
            resource.properties?.name ||
            label;


        const address =
            resource.address ||
            resource.formatted ||
            resource.properties?.formatted ||
            "Address unavailable";


        marker.bindPopup(`
            <div class="popup-title">
                ${escapeHTML(name)}
            </div>

            <div class="popup-type">
                ${escapeHTML(label)}
            </div>

            <div class="popup-address">
                ${escapeHTML(address)}
            </div>
        `);


        marker.addTo(liveMap);


        resourceLayers[category].push(marker);
    });
}


/* =========================================================
   EXTRACT GEOAPIFY / GEOJSON COORDINATES
   ========================================================= */

function extractCoordinates(resource) {

    /*
     * GeoJSON:
     *
     * geometry.coordinates = [lng, lat]
     */

    if (
        resource.geometry &&
        Array.isArray(resource.geometry.coordinates)
    ) {

        const coordinates =
            resource.geometry.coordinates;

        if (coordinates.length >= 2) {

            return [
                Number(coordinates[1]),
                Number(coordinates[0])
            ];
        }
    }


    /*
     * Geoapify properties.geometry
     */

    if (
        resource.properties &&
        resource.properties.lat !== undefined &&
        resource.properties.lon !== undefined
    ) {

        return [
            Number(resource.properties.lat),
            Number(resource.properties.lon)
        ];
    }


    /*
     * Direct lat/lng
     */

    if (
        resource.lat !== undefined &&
        resource.lng !== undefined
    ) {

        return [
            Number(resource.lat),
            Number(resource.lng)
        ];
    }


    /*
     * Direct latitude/longitude
     */

    if (
        resource.latitude !== undefined &&
        resource.longitude !== undefined
    ) {

        return [
            Number(resource.latitude),
            Number(resource.longitude)
        ];
    }


    return null;
}


/* =========================================================
   CLEAR MARKERS
   ========================================================= */

function clearResourceMarkers() {

    Object.keys(resourceLayers)
        .forEach(category => {

            resourceLayers[category]
                .forEach(marker => {

                    if (liveMap) {
                        liveMap.removeLayer(marker);
                    }

                });

            resourceLayers[category] = [];
        });
}


/* =========================================================
   UPDATE RESOURCE COUNTS
   ========================================================= */

function updateResourceCounts() {

    const mappings = {

        hospitals:
            "hospitalCountMap",

        policeStations:
            "policeCountMap",

        fireStations:
            "fireCountMap",

        pharmacies:
            "pharmacyCountMap",

        schools:
            "schoolCountMap",

        shelters:
            "shelterCountMap"
    };


    Object.keys(mappings)
        .forEach(category => {

            const element =
                document.getElementById(
                    mappings[category]
                );

            if (element) {

                element.textContent =
                    resourceLayers[category].length;
            }
        });
}


/* =========================================================
   UPDATE LOCATION UI
   ========================================================= */

function updateLocationUI(
    latitude,
    longitude
) {

    const element =
        document.getElementById(
            "mapLocationValue"
        );

    if (element) {

        element.textContent =
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
}


/* =========================================================
   MAP CONTROLS
   ========================================================= */

function setupMapControls() {

    const locateBtn =
        document.getElementById(
            "mapLocateBtn"
        );

    if (locateBtn) {

        locateBtn.addEventListener(
            "click",
            centerOnCurrentLocation
        );
    }


    const refreshBtn =
        document.getElementById(
            "mapRefreshBtn"
        );

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            refreshMap
        );
    }
}


/* =========================================================
   CENTER CURRENT LOCATION
   ========================================================= */

async function centerOnCurrentLocation() {

    const location =
        await getBrowserLocation();

    if (!location) {

        alert(
            "Unable to access your current location."
        );

        return;
    }


    currentLocation =
        location;


    if (liveMap) {

        liveMap.setView(
            [
                location.latitude,
                location.longitude
            ],
            15
        );


        if (userMarker) {

            userMarker.setLatLng([
                location.latitude,
                location.longitude
            ]);
        }
    }


    updateLocationUI(
        location.latitude,
        location.longitude
    );


    await loadMapResources(
        location.latitude,
        location.longitude
    );
}


/* =========================================================
   REFRESH MAP
   ========================================================= */

async function refreshMap() {

    if (!currentLocation) {

        currentLocation =
            await getSharedLocation();
    }


    if (!currentLocation) {

        alert(
            "Location is unavailable."
        );

        return;
    }


    await loadMapResources(
        currentLocation.latitude,
        currentLocation.longitude
    );
}


/* =========================================================
   LOADING
   ========================================================= */

function showMapLoading(show) {

    const loader =
        document.getElementById(
            "mapLoading"
        );

    if (!loader) return;

    loader.classList.toggle(
        "hidden",
        !show
    );
}


/* =========================================================
   ERROR
   ========================================================= */

function showMapError(message) {

    const error =
        document.getElementById(
            "mapError"
        );

    if (!error) {

        console.error(message);

        return;
    }

    error.textContent =
        message;

    error.style.display =
        "block";
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value || "");

    return div.innerHTML;
}