console.log(__filename);
const express = require("express");
const router = express.Router();
const { getPlaces, geocodeLocation } = require("../services/geoapify.service");

const DEFAULT_RADIUS = 5000;

router.get("/resources", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const hospitals = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "healthcare.hospital",
    );

    const policeStations = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "service.police",
    );

    const fireStations = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "service.fire_station",
    );

    const pharmacies = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "healthcare.pharmacy",
    );

    const schools = await getPlaces(
      lat,
      lng,
      DEFAULT_RADIUS,
      "education.school",
    );

    return res.json({
      success: true,

      resources: {
        hospitals,
        policeStations,
        fireStations,
        pharmacies,
        schools,
        shelters: schools,
      },
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
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
    message: "Coming Soon",
  });
});

router.get("/danger-zones", async (req, res) => {
  res.json({
    message: "Coming Soon",
  });
});

router.get("/safe-zones", async (req, res) => {
  res.json({
    message: "Coming Soon",
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

    res.json({
      success: true,
      location: result,
    });

  } catch (err) {
    console.error("Geocode Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
