const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const {
  getAllLeavesById,
  createLeave,
  updateLeave,
  deleteLeave,
} = require("../controller/leaves.controller");

// GET /api/leaves/:ID - Personelin tüm izinlerini getir
router.get(
  "/:ID",
  auth,
  Logger("GET /leaves/:ID"),
  getAllLeavesById
);

// POST /api/leaves/:ID - Yeni izin ekle
router.post(
  "/:ID",
  auth,
  Logger("POST /leaves/:ID"),
  createLeave
);

// PUT /api/leaves/:ID - İzin güncelle
router.put(
  "/:ID",
  auth,
  Logger("PUT /leaves/:ID"),
  updateLeave
);

// DELETE /api/leaves/:ID - İzin sil
router.delete(
  "/:ID",
  auth,
  Logger("DELETE /leaves/:ID"),
  deleteLeave
);

module.exports = router;
