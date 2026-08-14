const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "FLOOD",
        "TRAPPED_PEOPLE",
        "MEDICAL",
        "ROAD_BLOCK",
        "INFRASTRUCTURE",
        "FIRE",
        "MISSING_PERSON",
        "EVACUATION",
        "OTHER",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },

    peopleAffected: {
      type: Number,
      default: 0,
      min: 0,
    },

    requiredResources: [
      {
        type: {
          type: String,
          enum: [
            "AMBULANCE",
            "RESCUE_BOAT",
            "MEDICAL_KIT",
            "FOOD",
            "WATER",
            "RESCUE_VEHICLE",
            "VOLUNTEERS",
            "POLICE",
            "FIRE",
            "OTHER",
          ],
        },

        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "REPORTED",
        "VERIFIED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CANCELLED",
      ],
      default: "REPORTED",
      index: true,
    },

    verificationNote: {
      type: String,
      default: "",
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

module.exports = mongoose.model("Incident", incidentSchema);