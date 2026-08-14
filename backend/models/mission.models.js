const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
    },

    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },

    destination: {
      latitude: {
        type: Number,
      },

      longitude: {
        type: Number,
      },

      name: {
        type: String,
      },
    },

    route: {
      type: {
        type: String,
        default: "SAFE",
      },

      coordinates: [
        {
          latitude: Number,
          longitude: Number,
        },
      ],
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "ASSIGNED",
        "ACCEPTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "CREATED",
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

module.exports = mongoose.model("Mission", missionSchema);