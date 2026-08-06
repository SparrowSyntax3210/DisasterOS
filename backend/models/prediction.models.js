const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    weather: {
      temperature: Number,
      humidity: Number,
      rainfallIntensity: Number,
      precipitationProbability: Number,
      windSpeed: Number,
      pressure: Number,
      cloudCover: Number,
      visibility: Number,
      weatherCode: Number,
      uvIndex: Number,
    },

    prediction: {
      risk: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"],
      },

      probability: Number,

      reason: String,

      recommendations: [
        {
          type: String,
        },
      ],
    },
    zones: [
  {
    priority: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      required: true,
    },

    coordinates: [
      {
        lat: Number,
        lng: Number,
      },
    ],
  },
],
  },
  
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prediction", predictionSchema);