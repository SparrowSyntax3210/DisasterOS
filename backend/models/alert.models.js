const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "NEW_INCIDENT",
        "CRITICAL_INCIDENT",
        "NEW_SOS",
        "TEAM_OFFLINE",
        "DEVICE_OFFLINE",
        "RESOURCE_LOW",
        "MISSION_DELAYED",
        "MISSION_COMPLETED",
        "SYSTEM",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },

    relatedIncident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
    },

    relatedMission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      default: null,
    },

    relatedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    read: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Alert", alertSchema);