const express = require("express");
const router = express.Router();

const FieldDevice = require("../models/fieldDevice.models");

// ==========================================================
// REGISTER FIELD DEVICE
// POST /api/field/register
// ==========================================================

router.post("/register", async (req, res) => {
  try {
    const {
      deviceId,
      volunteer,
      team,
      latitude,
      longitude,
      battery,
      networkStatus,
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required.",
      });
    }

    const existingDevice = await FieldDevice.findOne({ deviceId });

    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: "Device already registered.",
        data: existingDevice,
      });
    }

    const device = await FieldDevice.create({
      deviceId,
      volunteer: volunteer || null,
      team: team || null,
      latitude: latitude || null,
      longitude: longitude || null,
      battery: battery ?? null,
      networkStatus: networkStatus || "ONLINE",
      status: "ACTIVE",
      lastSeen: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Field device registered successfully.",
      data: device,
    });
  } catch (error) {
    console.error("Register Field Device Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// GET ALL FIELD DEVICES
// GET /api/field
// ==========================================================

router.get("/", async (req, res) => {
  try {
    const devices = await FieldDevice.find()
      .populate("volunteer", "name email")
      .populate("team", "name teamId status")
      .sort({ lastSeen: -1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// UPDATE DEVICE LOCATION
// PATCH /api/field/:id/location
// ==========================================================

router.patch("/:id/location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    const device = await FieldDevice.findByIdAndUpdate(
      req.params.id,
      {
        latitude,
        longitude,
        lastSeen: new Date(),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Field device not found.",
      });
    }

    res.json({
      success: true,
      message: "Device location updated.",
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// UPDATE DEVICE STATUS
// PATCH /api/field/:id/status
// ==========================================================

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, battery, networkStatus } = req.body;

    const device = await FieldDevice.findByIdAndUpdate(
      req.params.id,
      {
        ...(status !== undefined && { status }),
        ...(battery !== undefined && { battery }),
        ...(networkStatus !== undefined && { networkStatus }),
        lastSeen: new Date(),
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Field device not found.",
      });
    }

    res.json({
      success: true,
      message: "Device status updated.",
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
