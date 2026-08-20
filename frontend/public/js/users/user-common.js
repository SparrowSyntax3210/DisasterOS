const API_BASE_URL = "http://localhost:4000/api";

const DisasterOS = {
    API: API_BASE_URL,

    location: {
        latitude: null,
        longitude: null,
        name: null
    },

    setLocation(location) {
        if (!location) return;

        this.location.latitude = Number(location.latitude);
        this.location.longitude = Number(location.longitude);
        this.location.name = location.name || "Selected Location";

        localStorage.setItem(
            "disasterOSLocation",
            JSON.stringify(this.location)
        );
    },

    getLocation() {
        const saved = localStorage.getItem("disasterOSLocation");

        if (saved) {
            try {
                const location = JSON.parse(saved);

                this.location = location;

                return location;
            } catch (error) {
                console.error("Invalid saved location");
            }
        }

        return null;
    },

    clearLocation() {
        localStorage.removeItem("disasterOSLocation");

        this.location = {
            latitude: null,
            longitude: null,
            name: null
        };
    },

    requireLocation() {
        const location = this.getLocation();

        if (
            !location ||
            !Number.isFinite(Number(location.latitude)) ||
            !Number.isFinite(Number(location.longitude))
        ) {
            window.location.href = "/users/risk.html";
            return null;
        }

        return location;
    },

    async get(url, options = {}) {
        const response = await fetch(
            `${this.API}${url}`,
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "API request failed"
            );
        }

        return data;
    },

    async post(url, body) {
        return this.get(url, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },

    async patch(url, body) {
        return this.get(url, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    }
};