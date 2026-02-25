const express = require("express");
const router = express.Router();
const { getUnitTypes } = require("../controller/unit_types.controller");

// GET /api/unit_types
// Birim türlerini listele, isteğe bağlı olarak kurum türüne göre filtrele
router.get("/", getUnitTypes);

module.exports = router;
