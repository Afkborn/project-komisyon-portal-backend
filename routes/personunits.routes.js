const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");
const {
  changeUnit,
  deletePersonUnit,
} = require("../controller/personunits.controller");

// POST /api/personunits/changeUnit
// birim değiştirme işlemi
router.post(
  "/changeUnit",
  auth,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("POST /personunits/changeUnit"),
  changeUnit
);

// DELETE /api/personunits/:id
// birim değişikliği silme işlemi
router.delete(
  "/:id",
  auth,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("DELETE /personunits/:id"),
  deletePersonUnit
);

module.exports = router;
