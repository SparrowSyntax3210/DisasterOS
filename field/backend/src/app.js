const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../../frontend/public")));

app.get("/root", (req, res) => {
  res.send("Route is running");
});

app.listen(8000, () => {
  console.log("Frontend server running on http://localhost:8000");
});