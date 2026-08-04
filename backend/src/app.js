const express = require("express");
const app = express();
const path = require("path");
const userRoutes = require("../routes/user.routes");

// Use the user routes
app.use("/auth", userRoutes);


const publicPath = path.join(__dirname, "../../frontend/public");
console.log(publicPath);

// Middleware
app.use(express.json());    
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

app.get("/test", (req, res) => {
  res.send("Hello from the backend!");
});

module.exports = app;