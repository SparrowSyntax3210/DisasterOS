const axios = require("axios");

const API_KEY = process.env.GEOAPIFY_API_KEY;

const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";

// =========================================================
// CONSTANTS
// =========================================================

const DEFAULT_RADIUS = 5000;
const FALLBACK_RADIUS = 15000;
const MAX_RESULTS = 20;

// =========================================================
// GET PLACES
// =========================================================

async function getPlaces(
  lat,
  lng,
  radius = DEFAULT_RADIUS,
  category,
  limit = MAX_RESULTS,
) {
  try {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const searchRadius = Number(radius);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.error("❌ Invalid coordinates:", { lat, lng });
      return [];
    }

    if (!API_KEY) {
      console.error("❌ GEOAPIFY_API_KEY is missing");
      return [];
    }

    console.log("\n========================================");
    console.log("🌍 Geoapify Request");
    console.log("Category:", category);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("Radius:", searchRadius);
    console.log("========================================");

    const { data } = await axios.get(GEOAPIFY_URL, {
      params: {
        categories: category,

        filter: `circle:${longitude},${latitude},${searchRadius}`,

        bias: `proximity:${longitude},${latitude}`,

        limit,

        apiKey: API_KEY,
      },

      timeout: 10000,
    });

    const features = Array.isArray(data?.features) ? data.features : [];

    console.log(
      `✅ ${category}: ${features.length} places found within ${searchRadius}m`,
    );

    return features
      .map((place) => {
        const properties = place?.properties || {};

        return {
          id:
            properties.place_id ||
            `${properties.lat}-${properties.lon}-${properties.name}`,

          name: properties.name || properties.address_line1 || "Unknown",

          latitude: Number(properties.lat),

          longitude: Number(properties.lon),

          address: properties.formatted || properties.address_line1 || "",

          city: properties.city || "",

          state: properties.state || "",

          country: properties.country || "",

          postcode: properties.postcode || "",

          distance: Number(properties.distance || 0),

          category,

          categories: Array.isArray(properties.categories)
            ? properties.categories
            : [category],
        };
      })
      .filter(
        (place) =>
          Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
      );
  } catch (err) {
    console.error("\n========================================");
    console.error("❌ GEOAPIFY ERROR");
    console.error("Category:", category);
    console.error("Message:", err.message);

    if (err.response) {
      console.error("HTTP Status:", err.response.status);

      console.error(
        "Geoapify Response:",
        JSON.stringify(err.response.data, null, 2),
      );
    }

    console.error("========================================\n");

    return [];
  }
}

// =========================================================
// GET PLACES WITH FALLBACK RADIUS
// =========================================================

async function getPlacesWithFallback(
  lat,
  lng,
  category,
  primaryRadius = DEFAULT_RADIUS,
  fallbackRadius = FALLBACK_RADIUS,
) {
  // First try normal emergency radius
  let places = await getPlaces(lat, lng, primaryRadius, category);

  if (places.length > 0) {
    return places;
  }

  // Nothing nearby → expand search
  console.log(`⚠️ No ${category} found within ${primaryRadius}m.`);

  console.log(`🔎 Expanding ${category} search to ${fallbackRadius}m...`);

  places = await getPlaces(lat, lng, fallbackRadius, category);

  return places;
}

// =========================================================
// GET ALL EMERGENCY RESOURCES
// =========================================================

async function getEmergencyResources(lat, lng, radius = DEFAULT_RADIUS) {
  console.log("\n========================================");
  console.log("🚑 LOADING EMERGENCY RESOURCES");
  console.log("Latitude:", lat);
  console.log("Longitude:", lng);
  console.log("Radius:", radius);
  console.log("========================================");

  const [
    hospitals,
    policeStations,
    fireStations,
    pharmacies,
    schools,
    communityCentres,
  ] = await Promise.all([
    getPlacesWithFallback(
      lat,
      lng,
      "healthcare.hospital",
      radius,
      FALLBACK_RADIUS,
    ),

    getPlacesWithFallback(lat, lng, "service.police", radius, FALLBACK_RADIUS),

    getPlacesWithFallback(
      lat,
      lng,
      "service.fire_station",
      radius,
      FALLBACK_RADIUS,
    ),

    getPlacesWithFallback(
      lat,
      lng,
      "healthcare.pharmacy",
      radius,
      FALLBACK_RADIUS,
    ),

    getPlacesWithFallback(
      lat,
      lng,
      "education.school",
      radius,
      FALLBACK_RADIUS,
    ),

    getPlacesWithFallback(
      lat,
      lng,
      "service.community_centre",
      radius,
      FALLBACK_RADIUS,
    ),
  ]);

  /*
   * Geoapify does NOT support:
   *
   * accommodation.shelter
   *
   * Therefore we deliberately keep this empty.
   */

  const shelters = [];

  const resources = {
    hospitals,
    policeStations,
    fireStations,
    pharmacies,
    schools,
    communityCentres,
    shelters,

    counts: {
      hospitals: hospitals.length,
      policeStations: policeStations.length,
      fireStations: fireStations.length,
      pharmacies: pharmacies.length,
      schools: schools.length,
      communityCentres: communityCentres.length,
      shelters: shelters.length,
    },
  };

  console.log("\n========================================");
  console.log("📊 RESOURCE SUMMARY");
  console.log("Hospitals:", hospitals.length);
  console.log("Police:", policeStations.length);
  console.log("Fire:", fireStations.length);
  console.log("Pharmacies:", pharmacies.length);
  console.log("Schools:", schools.length);
  console.log("Community Centres:", communityCentres.length);
  console.log("Shelters:", shelters.length);
  console.log("========================================\n");

  return resources;
}

// =========================================================
// GEOCODE
// =========================================================

async function geocodeLocation(location) {
  try {
    if (!location || !String(location).trim()) {
      return null;
    }

    if (!API_KEY) {
      console.error("❌ GEOAPIFY_API_KEY is missing");
      return null;
    }

    const { data } = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: String(location).trim(),
          apiKey: API_KEY,
          limit: 1,
        },

        timeout: 10000,
      },
    );

    if (
      !data?.features ||
      !Array.isArray(data.features) ||
      data.features.length === 0
    ) {
      return null;
    }

    const place = data.features[0].properties;

    return {
      name: place.formatted || location,

      latitude: Number(place.lat),

      longitude: Number(place.lon),

      city: place.city || "",

      state: place.state || "",

      country: place.country || "",

      postcode: place.postcode || "",
    };
  } catch (err) {
    console.error("❌ Geoapify Geocode Error:", err.message);

    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }

    return null;
  }
}

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  getPlaces,
  getPlacesWithFallback,
  getEmergencyResources,
  geocodeLocation,
};
