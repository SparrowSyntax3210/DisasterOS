let riskMap = null;
let riskLayers = [];

document.addEventListener("DOMContentLoaded", async () => {

    const location = DisasterOS.requireLocation();

    if (!location) return;

    updateLocationUI(location);

    initializeRiskMap(location);

    await loadRiskData(location);
});


function updateLocationUI(location) {

    const chip =
        document.getElementById("locationChip");

    if (!chip) return;

    chip.textContent =
        `📍 ${location.name || "Selected Location"}`;
}


// =====================================================
// MAP
// =====================================================

function initializeRiskMap(location) {

    riskMap = L.map("riskMap")
        .setView(
            [
                location.latitude,
                location.longitude
            ],
            12
        );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(riskMap);


    L.marker([
        location.latitude,
        location.longitude
    ])
    .addTo(riskMap)
    .bindPopup(
        `<strong>📍 ${escapeHtml(
            location.name || "Selected Location"
        )}</strong>`
    )
    .openPopup();
}


// =====================================================
// PREDICTION
// =====================================================

async function loadRiskData(location) {

    try {

        setLoadingState();

        const response =
            await DisasterOS.post(
                "/predictions/predict",
                {
                    latitude:
                        Number(location.latitude),

                    longitude:
                        Number(location.longitude)
                }
            );

        if (!response.success) {

            throw new Error(
                response.message ||
                "Prediction failed"
            );

        }

        renderPrediction(
            response.data
        );

    } catch (error) {

        console.error(
            "Risk API Error:",
            error
        );

        document.getElementById(
            "riskReason"
        ).textContent =
            error.message;

    }

}


// =====================================================
// RENDER
// =====================================================

function renderPrediction(data) {

    const prediction =
        data.prediction || {};

    const weather =
        data.weather || {};

    const zones =
        data.zones || [];


    const probability =
        Number(
            prediction.probability || 0
        );


    document.getElementById(
        "riskValue"
    ).textContent =
        prediction.risk || "--";


    document.getElementById(
        "probabilityValue"
    ).textContent =
        `${probability}%`;


    const confidence =
        Math.min(
            98,
            Math.max(
                70,
                probability + 10
            )
        );


    document.getElementById(
        "confidenceValue"
    ).textContent =
        `${confidence}%`;


    document.getElementById(
        "riskReason"
    ).textContent =
        prediction.reason ||
        "No AI explanation available.";


    renderWeather(weather);

    renderRecommendations(
        prediction.recommendations || []
    );

    renderZones(zones);
}


// =====================================================
// WEATHER
// =====================================================

function renderWeather(weather) {

    const container =
        document.getElementById(
            "weatherSummary"
        );

    container.innerHTML = `

        <div class="weather-row">

            <span>
                Temperature
            </span>

            <strong>
                ${weather.temperature ?? "--"} °C
            </strong>

        </div>

        <div class="weather-row">

            <span>
                Humidity
            </span>

            <strong>
                ${weather.humidity ?? "--"} %
            </strong>

        </div>

        <div class="weather-row">

            <span>
                Rainfall
            </span>

            <strong>
                ${weather.rainfall ?? 0} mm
            </strong>

        </div>

        <div class="weather-row">

            <span>
                Wind Speed
            </span>

            <strong>
                ${weather.windSpeed ?? "--"} km/h
            </strong>

        </div>

    `;
}


// =====================================================
// RECOMMENDATIONS
// =====================================================

function renderRecommendations(items) {

    const container =
        document.getElementById(
            "recommendations"
        );

    container.innerHTML = "";

    if (!items.length) {

        container.innerHTML =
            "<li>No recommendations available.</li>";

        return;
    }


    items.forEach(item => {

        const li =
            document.createElement("li");

        li.textContent = item;

        container.appendChild(li);

    });

}


// =====================================================
// RISK ZONES
// =====================================================

function renderZones(zones) {

    riskLayers.forEach(layer => {

        if (riskMap.hasLayer(layer)) {

            riskMap.removeLayer(layer);

        }

    });

    riskLayers = [];


    zones.forEach(zone => {

        const lat =
            Number(
                zone.latitude ??
                zone.lat
            );

        const lng =
            Number(
                zone.longitude ??
                zone.lng
            );


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return;
        }


        const probability =
            Number(
                zone.probability || 0
            );


        const color =
            probability >= 75
                ? "#ef4444"
                : probability >= 50
                    ? "#f59e0b"
                    : "#22c55e";


        const circle =
            L.circle(
                [lat, lng],
                {
                    radius:
                        Number(zone.radius) ||
                        3000,

                    color,

                    fillColor: color,

                    fillOpacity: 0.25,

                    weight: 2
                }
            );


        circle
            .bindPopup(`
                <strong>
                    ${escapeHtml(
                        zone.risk ||
                        "RISK ZONE"
                    )}
                </strong>

                <br>

                Probability:
                ${probability}%

                <br>

                Radius:
                ${
                    (
                        (Number(zone.radius) ||
                        3000) / 1000
                    ).toFixed(1)
                } km
            `);


        circle.addTo(riskMap);

        riskLayers.push(circle);

    });

}


// =====================================================
// REFRESH
// =====================================================

document
    .getElementById("refreshRisk")
    ?.addEventListener(
        "click",
        async () => {

            const location =
                DisasterOS.getLocation();

            if (!location) return;

            await loadRiskData(
                location
            );

        }
    );


// =====================================================
// HELPERS
// =====================================================

function setLoadingState() {

    document.getElementById(
        "riskValue"
    ).textContent = "...";

    document.getElementById(
        "probabilityValue"
    ).textContent = "...";

    document.getElementById(
        "confidenceValue"
    ).textContent = "...";

}


function escapeHtml(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}