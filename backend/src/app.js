const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const AuthRoutes = require("../routes/auth.routes");
const incidentRoutes = require("../routes/incident.routes");
const missionRoutes = require("../routes/mission.routes");
const teamRoutes = require("../routes/team.routes");
const resourceRoutes = require("../routes/resource.routes");
const sosRoutes = require("../routes/sos.routes");
const fieldRoutes = require("../routes/field.routes");

const app = express();

const publicPath = path.join(__dirname, "../../frontend/public");

// ==========================================================
// CORS
// ==========================================================

app.use(
  cors({
    origin: "http://localhost:8000",

    credentials: true,

    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ==========================================================
// SESSION
// ==========================================================

app.use(
  session({
    secret: process.env.SESSION_SECRET || "disasteros-secret-key",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

// ==========================================================
// MIDDLEWARE
// ==========================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(express.static(publicPath));

// ==========================================================
// ROUTES
// ==========================================================

app.use("/auth", AuthRoutes);

app.use("/api/users", require("../routes/user.routes"));

app.use("/api/predictions", require("../routes/prediction.routes"));

app.use("/api/map", require("../routes/user-map.routes"));

app.use("/api/incidents", incidentRoutes);

app.use("/api/missions", missionRoutes);

app.use("/api/teams", teamRoutes);

app.use("/api/resources", resourceRoutes);

app.use("/api/sos", sosRoutes);

app.use("/api/field", fieldRoutes);

module.exports = app;
