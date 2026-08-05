const express = require("express");
const app = express();
const path = require("path");
const AuthRoutes = require("../routes/auth.routes");

const publicPath = path.join(__dirname, "../../frontend/public");
console.log(publicPath);

// Middleware
app.use(express.json());    
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// Use the auth routes
app.use("/auth", AuthRoutes);
app.use("/api/users", require("../routes/user.routes"));
app.use("/api/predictions", require("../routes/prediction.routes"));

module.exports = app;