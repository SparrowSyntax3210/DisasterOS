const express = require("express");
const router = express.Router();

const Mission = require("../models/mission.models");
const socketService = require("../services/socket.service");

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      incident,
      assignedTeam,
      priority,
      destination,
      route,
      createdBy,
    } = req.body;

    if (!title || !priority) {
      return res.status(400).json({
        success: false,
        message: "Title and priority are required.",
      });
    }

    if (
      route &&
      (!Array.isArray(route.coordinates) ||
        route.coordinates.length < 2)
    ) {
      return res.status(400).json({
        success: false,
        message: "A safe route must contain at least two points.",
      });
    }

    const mission = await Mission.create({
      title,
      description,
      incident: incident || null,
      assignedTeam: assignedTeam || null,
      priority,

      destination: destination || null,

      route: route || {
        type: "SAFE",
        coordinates: [],
      },

      createdBy: createdBy || null,

      status: "CREATED",
    });
    socketService.broadcast("mission:created", {
  mission,
});

    res.status(201).json({
      success: true,
      message: "Mission created successfully.",
      data: mission,
    });
  } catch (error) {
    console.error("Create Mission Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const missions = await Mission.find()
      .populate("incident")
      .populate("assignedTeam")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: missions.length,
      data: missions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id)
      .populate("incident")
      .populate("assignedTeam")
      .populate("createdBy", "name email");

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission not found.",
      });
    }

    res.json({
      success: true,
      data: mission,
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
    const mission = await Mission.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission not found.",
      });
    }
    socketService.broadcast("mission:updated", {
  mission,
});

    res.json({
      success: true,
      message: "Mission updated successfully.",
      data: mission,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const mission = await Mission.findByIdAndDelete(req.params.id);

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission not found.",
      });
    }

    socketService.broadcast("mission:deleted", {
      missionId: req.params.id,
    });

    res.json({
      success: true,
      message: "Mission deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Mission Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = router;
