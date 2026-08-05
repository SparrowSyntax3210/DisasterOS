const express = require("express");
const router = express.Router();
const Prediction = require("../models/prediction.models");
const { getWeather } = require("../services/weather.service");
const { askAi } = require("../services/openrouter.service");

router.post("/predict", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required.",
      });
    }

    // Step 1: Fetch Weather Data
    const weatherData = await getWeather(latitude, longitude);

    // Step 2: Create AI Prompt
    const messages = [
      {
        role: "system",
        content: `
You are DisasterOS AI, an expert flood prediction and disaster intelligence assistant.

Analyze the provided weather conditions carefully.

Return ONLY valid JSON.

Format:

{
  "risk":"LOW | MEDIUM | HIGH | EXTREME",
  "probability":0,
  "reason":"",
  "recommendations":[]
}

Do not include markdown.
Do not include explanations outside JSON.
`,
      },
      {
        role: "user",
        content: JSON.stringify(weatherData),
      },
    ];

    // Step 3: Ask AI
    const aiResponse = await askAi(messages);

    // Step 4: Remove markdown if present
    const cleanResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiPrediction;

    try {
      aiPrediction = JSON.parse(cleanResponse);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON.",
        response: aiResponse,
      });
    }

    // Step 5: Save Report
    const report = await Prediction.create({
      latitude,
      longitude,
      weather: weatherData,
      prediction: aiPrediction,
    });

    // Step 6: Return Response
    return res.status(201).json({
      success: true,
      message: "Prediction generated successfully.",
      data: report,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


router.get("/history/all", async (req, res) => {
  try {
    const history = await Prediction.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


router.get("/weather/live", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required.",
      });
    }

    const weather = await getWeather(latitude, longitude);

    return res.status(200).json({
      success: true,
      data: weather,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const report = await Prediction.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Prediction.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prediction deleted successfully.",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;