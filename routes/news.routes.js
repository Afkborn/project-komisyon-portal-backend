const express = require("express");
const router = express.Router();
const Logger = require("../middleware/logger");
const { getNews } = require("../controller/news.controller");

// GET /api/news
// Eskişehir Ekspres'ten haberleri çek
router.get("/", Logger("GET /news"), getNews);

module.exports = router;
