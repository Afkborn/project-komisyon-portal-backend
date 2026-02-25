const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");
const {
  getCities,
  getUnitsByCity,
  getUnitPersonnel,
  addPersonnelToUnit,
  deletePersonnelFromUnit,
  updatePersonnel,
  addUnit,
} = require("../controller/segbis.controller");

// GET /api/segbis/cities
// İlleri getir
router.get(
  "/cities",
  auth,
  checkRoles([6, 7]),
  Logger("GET /segbis/cities"),
  getCities,
);

// GET /api/segbis/cities/:cityName/units
// Bir ile ait birimleri getir
router.get(
  "/cities/:cityName/units",
  auth,
  checkRoles([6, 7]),
  Logger("GET /segbis/cities/:cityName/units"),
  getUnitsByCity,
);

// GET /api/segbis/units/:unitId/personel
// Bir birime ait personeli getir
router.get(
  "/units/:unitId/personel",
  auth,
  checkRoles([6, 7]),
  Logger("GET /segbis/units/:unitId/personel"),
  getUnitPersonnel,
);

// POST /api/segbis/units/:unitId/personel
// Birime personel ekle
router.post(
  "/units/:unitId/personel",
  auth,
  checkRoles([6, 7]),
  Logger("POST /segbis/units/:unitId/personel"),
  addPersonnelToUnit,
);

// DELETE /api/segbis/units/:unitId/personel/:personId
// Birimden personel sil
router.delete(
  "/units/:unitId/personel/:personId",
  auth,
  checkRoles([6, 7]),
  Logger("DELETE /segbis/units/:unitId/personel/:personId"),
  deletePersonnelFromUnit,
);

// PUT /api/segbis/units/:unitId/personel/:personId
// Personel güncelle
router.put(
  "/units/:unitId/personel/:personId",
  auth,
  checkRoles([6, 7]),
  Logger("PUT /segbis/units/:unitId/personel/:personId"),
  updatePersonnel,
);

// POST /api/segbis/units
// Yeni birim ekle
router.post(
  "/units",
  auth,
  checkRoles([6, 7]),
  Logger("POST /segbis/units"),
  addUnit,
);

module.exports = router;
