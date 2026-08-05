const express = require("express");
const router = express.Router();
const User = require("../models/auth.models");


router.post("/register", async (req, res) => {
  const { username, email, password,role,Phone,Location,Address,ProfileImage } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }
  const UserSchema = new User({ username, email, password,role,Phone,Location,Address,ProfileImage });
  await UserSchema.save();
  res.status(201).json({ message: "User registered successfully" });
  req.session.user = { username, email };
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }
  res.status(200).json({ message: "Login successful" });
  req.session.user = { username: user.username, email: user.email };
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    res.status(200).json({ message: "Logout successful" });
  });
});

router.get("/status", (req, res) => {
  if (req.session.user) {
    res.status(200).json({ loggedIn: true, user: req.session.user });
  } else {
    res.status(200).json({ loggedIn: false });
  }
});

module.exports = router;
