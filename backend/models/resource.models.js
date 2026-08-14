const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResourceSchema = new Schema(
  {
    Boats: {
      type: String,
      required: true,
    },

    Ambulance: {
      type: String,
      required: true,
    },

    Teams: {
      type: Number,
      required: true,
    },

    Supplies: {
      type: String,
      required: true,
    },

    Equipment: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "in use", "maintenance"],
      default: "available",
    },

    location: {
      type: String,
      required: true,
    },

    lastMaintenance: {
      type: Date,
    },

    // =====================================================
    // DURING-DISASTER OPERATIONAL FIELDS
    // =====================================================

    resourceId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "AMBULANCE",
        "RESCUE_BOAT",
        "MEDICAL_KIT",
        "FOOD",
        "WATER",
        "RESCUE_VEHICLE",
        "FUEL",
        "CLOTHING",
        "TENT",
        "EQUIPMENT",
        "OTHER",
      ],
      default: "OTHER",
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    availableQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =====================================================
    // GIS LOCATION
    // =====================================================

    coordinates: {
      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },

    assignedTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Resource", ResourceSchema);
