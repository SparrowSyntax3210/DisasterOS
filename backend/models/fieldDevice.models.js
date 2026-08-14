const mongoose = require("mongoose");

const fieldDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    location: {
      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },

    battery: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    networkStatus: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "WEAK"],
      default: "ONLINE",
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "IDLE",
        "ON_MISSION",
        "EMERGENCY",
        "OFFLINE",
      ],
      default: "ACTIVE",
    },

    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },

    appVersion: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FieldDevice", fieldDeviceSchema);