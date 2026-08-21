// =========================================================
// DISASTEROS LOCATION
// =========================================================

let currentLocation = {
  latitude: null,
  longitude: null,
};

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation = {
          latitude: position.coords.latitude,

          longitude: position.coords.longitude,
        };

        // IMPORTANT:
        // Make it available to every overlay
        window.currentLocation = currentLocation;

        console.log("📍 Global location updated:", currentLocation);

        resolve(currentLocation);
      },

      (error) => {
        console.warn("Location access failed:", error);

        currentLocation = {
          ...APP_CONFIG.DEFAULT_LOCATION,
        };

        window.currentLocation = currentLocation;

        console.log("📍 Using default location:", currentLocation);

        resolve(currentLocation);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
}

function formatCoordinates(latitude, longitude) {
  return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
}
