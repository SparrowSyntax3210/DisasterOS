const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "RESCUE",
        "MEDICAL",
        "FIRE",
        "POLICE",
        "EVACUATION",
        "LOGISTICS",
        "VOLUNTEER",
        "OTHER",
      ],
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "ASSIGNED",
        "EN_ROUTE",
        "BUSY",
        "OFFLINE",
        "EMERGENCY",
      ],
      default: "AVAILABLE",
      index: true,
    },

    currentLocation: {
      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },

    currentMission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mission",
      default: null,
    },

    contactNumber: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Team", teamSchema);