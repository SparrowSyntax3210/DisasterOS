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

module.exports = {
  getPlaces,
};