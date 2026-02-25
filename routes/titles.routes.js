const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");
const {
  getAllTitles,
  createTitle,
  updateTitle,
  deleteTitle,
} = require("../controller/titles.controller");

// GET /api/titles
// Tüm unvanları listele
router.get(
  "/",
  auth,
  checkRoles([2, 3, 5, 8]),
  Logger("GET /titles/"),
  getAllTitles,
);

// POST /api/titles
// Yeni unvan ekle
router.post(
  "/",
  auth,
  checkRoles([2, 3, 5, 8]),
  Logger("POST /titles/"),
  createTitle,
);

// PUT /api/titles/:id
// Unvanı güncelle
router.put(
  "/:id",
  auth,
  checkRoles([2, 3, 5, 8]),
  Logger("PUT /titles/:id"),
  updateTitle,
);

// DELETE /api/titles/:id
// Unvanı sil
router.delete(
  "/:id",
  auth,
  checkRoles([2, 3, 5, 8]),
  Logger("DELETE /titles/:id"),
  deleteTitle,
);

module.exports = router;
