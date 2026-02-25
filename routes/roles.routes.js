const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const { getAllRoles } = require("../controller/roles.controller");

// GET /api/roles
// Tüm rolleri listele
router.get("/", auth, checkRoles(["admin"]), getAllRoles);

module.exports = router;
