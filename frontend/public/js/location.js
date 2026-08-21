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
        currentLocation.latitude = position.coords.latitude;

        currentLocation.longitude = position.coords.longitude;

        resolve(currentLocation);
      },

      (error) => {
        console.warn("Location access failed:", error);

        currentLocation = APP_CONFIG.DEFAULT_LOCATION;

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
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
