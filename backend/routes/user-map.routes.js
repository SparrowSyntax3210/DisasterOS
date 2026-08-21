console.log(__filename);

const express = require("express");
const router = express.Router();

const {
  getEmergencyResources,
  geocodeLocation,
  getPlaces,
} = require("../services/geoapify.service");

const DEFAULT_RADIUS = 5000;

router.get("/resources", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude.",
      });
    }

    console.log("\n========================================");
    console.log("🗺️ MAP RESOURCES REQUEST");
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("========================================");

    const resources = await getEmergencyResources(
      latitude,
      longitude,
      DEFAULT_RADIUS,
    );

    return res.json({
      success: true,

      location: {
        latitude,
        longitude,
      },

      radius: DEFAULT_RADIUS,

      resources,
    });
  } catch (err) {
    console.error("❌ Map Resources Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/police", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const police = await getPlaces(lat, lng, DEFAULT_RADIUS, "service.police");

    res.status(200).json(police);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/resources/test", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    const radius = DEFAULT_RADIUS;

    const results = {};

    const categories = {
      hospitals: "healthcare.hospital",
      policeStations: "service.police",
      fireStations: "service.fire_station",
      pharmacies: "healthcare.pharmacy",
      schools: "education.school",
      shelters: "accommodation.shelter",
    };

    for (const [name, category] of Object.entries(categories)) {
      const places = await getPlaces(
        Number(lat),
        Number(lng),
        radius,
        category,
      );

      results[name] = {
        category,
        count: places.length,
        places,
      };
    }

    return res.json({
      success: true,

      location: {
        latitude: Number(lat),
        longitude: Number(lng),
      },

      radius,

      results,
    });
  } catch (error) {
    console.error("Resource Test Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/fire-stations", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const fireStations = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "service.fire_station",
    );

    res.status(200).json(fireStations);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/pharmacies", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const pharmacies = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "healthcare.pharmacy",
    );

    res.status(200).json(pharmacies);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/shelters", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const shelters = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "accommodation.shelter",
    );

    res.status(200).json(shelters);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/schools", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const schools = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "education.school",
    );

    res.status(200).json(schools);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/community-centres", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const centres = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "service.community_centre",
    );

    res.status(200).json(centres);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/routes", async (req, res) => {
  res.json({
    success: true,
    message: "Coming Soon",
    data: [],
  });
});

router.get("/danger-zones", async (req, res) => {
  res.json({
    success: true,
    message: "Coming Soon",
    data: [],
  });
});

router.get("/safe-zones", async (req, res) => {
  res.json({
    success: true,
    message: "Coming Soon",
    data: [],
  });
});

router.get("/geocode", async (req, res) => {
  try {
    const location = req.query.location || req.query.place;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: "Location is required",
      });
    }

    const result = await geocodeLocation(location);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.json({
      success: true,
      location: result,
    });
  } catch (err) {
    console.error("Geocode Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
