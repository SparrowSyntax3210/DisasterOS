const express = require('express');
const router = express.Router();
const User = require('../models/users.models');

router.get("/test", async (req, res) => {
    res.send('User route is working');
});

module.exports = router;