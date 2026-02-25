const express = require("express");
const router = express.Router();
const Logger = require("../middleware/logger");
const { searchLawyers, getLawyerInfo } = require("../controller/barolevha_proxy.controller");

// POST /api/barolevha_proxy/list
// Baro Levha'da avukat listesi ara
router.post("/list", Logger("POST /barolevha_proxy/list"), searchLawyers);

// POST /api/barolevha_proxy/info
// Avukat detay bilgisi getir
router.post("/info", Logger("POST /barolevha_proxy/info"), getLawyerInfo);

module.exports = router;
