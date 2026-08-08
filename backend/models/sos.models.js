const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    sosId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "MEDICAL",
        "AMBULANCE",
        "RESCUE",
        "FOOD",
        "WATER",
        "TRAPPED",
        "EVACUATION",
        "EMERGENCY",
        "OTHER",
      ],
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    peopleCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACKNOWLEDGED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SOSRequest", sosSchema);