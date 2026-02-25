const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
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
  Logger("POST /personunits/changeUnit"),
  changeUnit
);

// DELETE /api/personunits/:id
// birim değişikliği silme işlemi
router.delete(
  "/:id",
  auth,
  Logger("DELETE /personunits/:id"),
  deletePersonUnit
);

module.exports = router;
