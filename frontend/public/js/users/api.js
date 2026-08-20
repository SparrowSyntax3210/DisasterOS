/* =========================================================
   DISASTEROS API CLIENT
========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const config = {

        method:
            options.method || "GET",

        headers: {

            "Content-Type":
                "application/json",

            ...(options.headers || {})

        }

    };


    if (options.body !== undefined) {

        config.body =
            options.body;

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                config
            );


        const contentType =
            response.headers.get(
                "content-type"
            );


        let data;


        if (
            contentType &&
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            data =
                await response.text();

        }


        if (!response.ok) {

            throw new Error(
                data?.message ||
                `Request failed: ${response.status}`
            );

        }


        return data;


    } catch (error) {

        console.error(
            `❌ API ${endpoint}`,
            error
        );

        throw error;

    }

}


/* =========================================================
   PREDICTION
========================================================= */

async function getPrediction(
    latitude,
    longitude
) {

    return apiRequest(
        "/predictions/predict",
        {

            method: "POST",

            body: JSON.stringify({
                latitude,
                longitude
            })

        }
    );

}


/* =========================================================
   WEATHER
========================================================= */

async function getLiveWeather(
    latitude,
    longitude
) {

    return apiRequest(
        `/predictions/weather/live?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`
    );

}


/* =========================================================
   MAP RESOURCES
========================================================= */

async function getMapResources(
    latitude,
    longitude
) {

    return apiRequest(
        `/map/resources?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
    );

}


/* =========================================================
   INCIDENTS
========================================================= */

async function getIncidents() {

    return apiRequest(
        "/incidents"
    );

}


async function createIncident(
    payload
) {

    return apiRequest(
        "/incidents",
        {

            method: "POST",

            body: JSON.stringify(
                payload
            )

        }
    );

}


/* =========================================================
   SOS
========================================================= */

async function getSOSRequests() {

    return apiRequest(
        "/sos"
    );

}


async function createSOS(
    payload
) {

    return apiRequest(
        "/sos",
        {

            method: "POST",

            body: JSON.stringify(
                payload
            )

        }
    );

}


async function updateSOS(
    id,
    payload
) {

    return apiRequest(
        `/sos/${id}`,
        {

            method: "PATCH",

            body: JSON.stringify(
                payload
            )

        }
    );

}


/* =========================================================
   RESOURCES
========================================================= */

async function getResources() {

    return apiRequest(
        "/resources"
    );

}


/* =========================================================
   PREDICTION HISTORY
========================================================= */

async function getPredictionHistory() {

    return apiRequest(
        "/predictions/history/all"
    );

}