const express = require("express");
const router = express.Router();
const checkRoles = require("../middleware/checkRoles");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const {
  getAllActivities,
  getActivitiesByUserId,
} = require("../controller/activities.controller");

// get activities (filtrelenmiş)
router.get(
  "/",
  auth,
  checkRoles([2, 3, 5, 8]), // EPSİS rolleri
  Logger("GET /activities/"),
  getAllActivities
);

// get activity with userid
router.get(
  "/:userID",
  auth,
  checkRoles([2, 3, 5, 8]), // EPSİS  rolleri
  Logger("GET /activities/:userID"),
  getActivitiesByUserId
);

module.exports = router;
