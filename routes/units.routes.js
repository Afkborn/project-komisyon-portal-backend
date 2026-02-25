const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const {
  getAllUnits,
  searchUnits,
  getUnitsByInstitution,
  getUnitNamesByInstitution,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controller/units.controller");

// GET /api/units/search
// Birim adına göre arama (daha spesifik route, ilk tanımlanmalı)
router.get(
  "/search",
  auth,
  Logger("GET /units/search"),
  searchUnits
);

// GET /api/units/institution/:institutionId/name
// Kuruma ait birimlerin adlarını listele (daha spesifik, daha üstte)
router.get(
  "/institution/:institutionId/name",
  auth,
  Logger("GET /units/institution/:institutionId/name"),
  getUnitNamesByInstitution
);

// GET /api/units/institution/:institutionId
// Kuruma ait tüm birimleri listele
router.get(
  "/institution/:institutionId",
  auth,
  Logger("GET /units/institution/:institutionId"),
  getUnitsByInstitution
);

// GET /api/units
// Tüm birimleri listele
router.get("/", auth, Logger("GET /units"), getAllUnits);

// POST /api/units
// Yeni birim ekle
router.post("/", auth, Logger("POST /units"), createUnit);

// PUT /api/units/:id
// Birim güncelle
router.put("/:id", auth, Logger("PUT /units/:id"), updateUnit);

// DELETE /api/units/:id
// Birim sil
router.delete("/:id", auth, Logger("DELETE /units/:id"), deleteUnit);

module.exports = router;
