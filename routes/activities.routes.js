const express = require("express");
const router = express.Router();

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
  Logger("GET /activities/"),
  getAllActivities
);

// get activity with userid
router.get(
  "/:userID",
  auth,
  Logger("GET /activities/:userID"),
  getActivitiesByUserId
);

module.exports = router;
