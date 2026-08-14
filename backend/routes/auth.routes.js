const express = require("express");

const router = express.Router();

const User = require("../models/auth.models");

// ==========================================================
// REGISTER
// ==========================================================

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      Phone,
      Location,
      Address,
      ProfileImage,
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already exists.",
      });
    }

    const newUser = new User({
      username,
      email,
      password,
      role: role || "Volunteer",
      Phone,
      Location,
      Address,
      ProfileImage,
    });

    await newUser.save();

    // ======================================================
    // CREATE SESSION
    // ======================================================

    req.session.userId = newUser._id.toString();

    // Save session before responding
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return res.status(201).json({
      message: "User registered successfully.",

      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        Phone: newUser.Phone,
        Location: newUser.Location,
        Address: newUser.Address,
        ProfileImage: newUser.ProfileImage,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ==========================================================
// LOGIN
// ==========================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // ======================================================
    // FIND USER
    // ======================================================

    const user = await User.findOne({
      email,
      password,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // ======================================================
    // CREATE SESSION
    // ======================================================

    req.session.userId = user._id.toString();

    // IMPORTANT:
    // Force session to be saved before response.
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("✅ Session created for:", user.email);

    console.log("Session ID:", req.sessionID);

    console.log("Session User ID:", req.session.userId);

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      message: "Login successful.",

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        Phone: user.Phone,
        Location: user.Location,
        Address: user.Address,
        ProfileImage: user.ProfileImage,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ==========================================================
// STATUS
// ==========================================================

router.get("/status", async (req, res) => {
  try {
    console.log("🔎 Checking session:", req.sessionID);

    console.log("Session data:", req.session);

    // ====================================================
    // NO SESSION
    // ====================================================

    if (!req.session.userId) {
      return res.status(200).json({
        loggedIn: false,
      });
    }

    // ====================================================
    // FIND USER
    // ====================================================

    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      req.session.destroy(() => {});

      return res.status(200).json({
        loggedIn: false,
      });
    }

    // ====================================================
    // RETURN FULL PROFILE
    // ====================================================

    return res.status(200).json({
      loggedIn: true,

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        Phone: user.Phone,
        Location: user.Location,
        Address: user.Address,
        ProfileImage: user.ProfileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("STATUS ERROR:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
});

// ==========================================================
// LOGOUT
// ==========================================================

router.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        message: "Internal server error.",
      });
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({
      message: "Logout successful.",
    });
  });
});

module.exports = router;
