const express = require("express");
const router = express.Router();
const flood = require("../models/flood.models");

router.get("/prediction/:id", async (req, res) => {
  try {
    const floodData = await flood.findById(req.params.id);
    res.status(200).json(floodData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching flood prediction data" });
  }
});

router.post("/prediction/analyze", async (req, res) => {
    const { location, rainfall, riverLevel } = req.body;
    const newFloodPrediction = new flood({ location, rainfall, riverLevel });
    try {
      await newFloodPrediction.save();
        res.status(201).json({ message: "Flood prediction data saved successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error saving flood prediction data" });
    }   
});

router.get("/risk-map", async (req, res) => {
    try {
        const floodData = await flood.find();
        const riskMap = floodData.map(data => ({
            location: data.location,
            riskLevel: calculateRiskLevel(data.rainfall, data.riverLevel)
        }));
        res.status(200).json(riskMap);
    } catch (error) {
        res.status(500).json({ message: "Error generating flood risk map" });
    }
});


module.exports = router;