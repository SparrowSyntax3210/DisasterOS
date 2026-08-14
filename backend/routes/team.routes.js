const express = require("express");
const router = express.Router();

const Team = require("../models/team.models");
const socketService = require("../services/socket.service");

router.post("/", async (req, res) => {
  try {
    const {
      teamId,
      name,
      type,
      members,
      status,
      currentLocation,
    } = req.body;

    if (!teamId || !name || !type) {
      return res.status(400).json({
        success: false,
        message: "Team ID, name and type are required.",
      });
    }

    const existingTeam = await Team.findOne({ teamId });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: "Team ID already exists.",
      });
    }

    const team = await Team.create({
      teamId,
      name,
      type,
      members: members || [],
      status: status || "AVAILABLE",
      currentLocation: currentLocation || null,
    });

    socketService.broadcast("team:created", {
      team,
    });

    res.status(201).json({
      success: true,
      message: "Team created successfully.",
      data: team,
    });
  } catch (error) {
    console.error("Create Team Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("members", "name email")
      .populate("currentMission")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teams.length,
      data: teams,
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
    const team = await Team.findById(req.params.id)
      .populate("members", "name email")
      .populate("currentMission");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }
    socketService.broadcast("team:updated", {
  team,
});

    res.json({
      success: true,
      data: team,
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
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }
    socketService.broadcast("team:updated", {
  team,
});

    res.json({
      success: true,
      message: "Team updated successfully.",
      data: team,
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
    const team = await Team.findByIdAndDelete(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found.",
      });
    }

    socketService.broadcast("team:deleted", {
      teamId: req.params.id,
    });

    res.json({
      success: true,
      message: "Team deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Team Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
