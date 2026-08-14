const express = require("express");
const router = express.Router();

const SOS = require("../models/sos.models");
const socketService = require("../services/socket.service");

// ==========================================================
// HELPERS
// ==========================================================

function generateSOSId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `SOS-${timestamp}-${random}`;
}

// ==========================================================
// CREATE SOS
// POST /api/sos
// ==========================================================

router.post("/", async (req, res) => {
  try {
    const {
      reporter,
      latitude,
      longitude,
      type,
      priority,
      description,
      peopleCount,
    } = req.body;

    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (
      latitude === undefined ||
      longitude === undefined ||
      !type ||
      !priority
    ) {
      return res.status(400).json({
        success: false,
        message: "Location, type and priority are required.",
      });
    }

    // ------------------------------------------------------
    // VALIDATE TYPE
    // ------------------------------------------------------

    const allowedTypes = [
      "MEDICAL",
      "AMBULANCE",
      "RESCUE",
      "FOOD",
      "WATER",
      "TRAPPED",
      "EVACUATION",
      "EMERGENCY",
      "OTHER",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid SOS type: ${type}`,
        allowedTypes,
      });
    }

    // ------------------------------------------------------
    // VALIDATE PRIORITY
    // ------------------------------------------------------

    const allowedPriorities = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ];

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid SOS priority: ${priority}`,
        allowedPriorities,
      });
    }

    // ------------------------------------------------------
    // CREATE SOS
    // ------------------------------------------------------

    const sos = await SOS.create({
      sosId: generateSOSId(),

      reporter: reporter || null,

      latitude: Number(latitude),

      longitude: Number(longitude),

      type,

      priority,

      description: description || "",

      peopleCount: Number(peopleCount) || 1,

      // IMPORTANT:
      // Model uses PENDING, NOT WAITING
      status: "PENDING",
    });

    console.log(
      `🚨 SOS CREATED: ${sos.sosId} | ${sos.type} | ${sos.priority}`,
    );

    // ------------------------------------------------------
    // REAL-TIME BROADCAST
    // ------------------------------------------------------

    socketService.broadcast("sos:created", {
      sos,
    });

    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "SOS request created.",
      data: sos,
    });
  } catch (error) {
    console.error("Create SOS Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// GET ALL SOS
// GET /api/sos
// ==========================================================

router.get("/", async (req, res) => {
  try {
    const requests = await SOS.find()
      .populate("reporter", "name email")
      .populate("assignedTeam", "name teamId status")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get SOS Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// GET SINGLE SOS
// GET /api/sos/:id
// ==========================================================

router.get("/:id", async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id)
      .populate("reporter", "name email")
      .populate("assignedTeam", "name teamId status");

    if (!sos) {
      return res.status(404).json({
        success: false,
        message: "SOS request not found.",
      });
    }

    return res.json({
      success: true,
      data: sos,
    });
  } catch (error) {
    console.error("Get SOS Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// UPDATE SOS
// PATCH /api/sos/:id
// ==========================================================

router.patch("/:id", async (req, res) => {
  try {
    const allowedFields = [
      "type",
      "priority",
      "status",
      "description",
      "peopleCount",
      "assignedTeam",
      "incident",
      "resolvedAt",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const sos = await SOS.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!sos) {
      return res.status(404).json({
        success: false,
        message: "SOS request not found.",
      });
    }

    console.log(`🔄 SOS UPDATED: ${sos.sosId}`);

    socketService.broadcast("sos:updated", {
      sos,
    });

    return res.json({
      success: true,
      message: "SOS updated successfully.",
      data: sos,
    });
  } catch (error) {
    console.error("Update SOS Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==========================================================
// DELETE SOS
// DELETE /api/sos/:id
// ==========================================================

router.delete("/:id", async (req, res) => {
  try {
    const sos = await SOS.findByIdAndDelete(req.params.id);

    if (!sos) {
      return res.status(404).json({
        success: false,
        message: "SOS request not found.",
      });
    }

    console.log(`🗑️ SOS DELETED: ${sos.sosId}`);

    socketService.broadcast("sos:deleted", {
      sosId: sos._id,
      customSosId: sos.sosId,
    });

    return res.json({
      success: true,
      message: "SOS deleted successfully.",
      data: sos,
    });
  } catch (error) {
    console.error("Delete SOS Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;