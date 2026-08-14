const express = require("express");
const router = express.Router();

const Resource = require("../models/resource.models");
const socketService = require("../services/socket.service");

router.get("/", async (req, res) => {
  try {
    const resources = await Resource.find()
      .populate("assignedTeam", "name teamId status")
      .populate("managedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    console.error("Get Resources Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("assignedTeam", "name teamId status")
      .populate("managedBy", "name email");

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const resource = await Resource.create(req.body);

    res.status(201).json({
      success: true,
      message: "Resource created successfully.",
      data: resource,
    });
    socketService.broadcast("resource:created", {
  resource,
});
  } catch (error) {
    console.error("Create Resource Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// UPDATE RESOURCE
// PATCH /api/resources/:id
// ==========================================================

router.patch("/:id", async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }
    socketService.broadcast("resource:updated", {
  resource,
});

    res.json({
      success: true,
      message: "Resource updated successfully.",
      data: resource,
    });
  } catch (error) {
    console.error("Update Resource Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found.",
      });
    }

    socketService.broadcast("resource:deleted", {
      resourceId: req.params.id,
    });

    res.json({
      success: true,
      message: "Resource deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Resource Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
