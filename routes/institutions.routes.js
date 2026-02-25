const express = require("express");
const router = express.Router();

const {
  getAllInstitutions,
} = require("../controller/institutions.controller");

// GET /api/institutions - Tüm kurumları getir (sıralanmış)
router.get("/", getAllInstitutions);

module.exports = router;
