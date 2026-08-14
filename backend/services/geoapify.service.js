const axios = require("axios");

const API_KEY = process.env.GEOAPIFY_API_KEY;

async function getPlaces(lat, lng, radius, category) {
  try {
    const { data } = await axios.get(
  "https://api.geoapify.com/v2/places",
  {
    params: {
      categories: category,
      filter: `circle:${lng},${lat},${radius}`,
      limit: 20,
      apiKey: API_KEY,
    },
  }
);

    return data.features.map((place) => ({
      id: place.properties.place_id,

      name: place.properties.name || "Unknown",

      latitude: place.properties.lat,
      longitude: place.properties.lon,

      address: place.properties.formatted || "",

      city: place.properties.city || "",

      state: place.properties.state || "",

      distance: place.properties.distance || 0,

      category,
    }));
  } catch (err) {
    console.log("Geoapify Error:", category);

    if (err.response) {
      console.log(err.response.data);
    }

    return [];
  }
}

async function geocodeLocation(location) {
  try {
    const { data } = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: location,
          apiKey: API_KEY,
          limit: 1,
        },
      }
    );

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const place = data.features[0].properties;

    return {
      name: place.formatted,
      latitude: place.lat,
      longitude: place.lon,
      city: place.city || "",
      state: place.state || "",
      country: place.country || "",
    };

  } catch (err) {
    console.log("Geoapify Geocode Error");

    if (err.response) {
      console.log(err.response.data);
    }

    return null;
  }
}

module.exports = {
  getPlaces,
  geocodeLocation,
};