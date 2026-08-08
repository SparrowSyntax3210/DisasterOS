const express = require("express");
const router = express.Router();

const Incident = require("../models/incident.models");

router.post("/", async (req, res) => {
  try {
    const {
      type,
      description,
      latitude,
      longitude,
      severity,
      peopleAffected,
      reportedBy,
      requiredResources,
    } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined ||
      !type ||
      !severity
    ) {
      return res.status(400).json({
        success: false,
        message: "Type, severity, latitude and longitude are required.",
      });
    }

    const incident = await Incident.create({
      type,
      description,
      latitude,
      longitude,
      severity,
      peopleAffected: peopleAffected || 0,
      reportedBy: reportedBy || null,
      requiredResources: requiredResources || [],
      status: "REPORTED",
    });

    res.status(201).json({
      success: true,
      message: "Incident created successfully.",
      data: incident,
    });
  } catch (error) {
    console.error("Create Incident Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate("reportedBy", "name email")
      .populate("assignedTeam", "name teamId status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      data: incidents,
    });
  } catch (error) {
    console.error("Get Incidents Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("reportedBy", "name email")
      .populate("assignedTeam", "name teamId status");

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.patch("/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    res.json({
      success: true,
      message: "Incident updated successfully.",
      data: incident,
    });
  } catch (error) {
    console.error("Update Incident Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    res.json({
      success: true,
      message: "Incident deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
