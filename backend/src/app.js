const express = require("express");
const app = express();
const path = require("path");

const publicPath = path.join(__dirname, "../../frontend/public");
console.log(publicPath);

// Middleware
app.use(express.json());    
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicPath));
module.exports = app;