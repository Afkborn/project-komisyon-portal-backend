const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const RoleList = require("../constants/RoleList");

// get all institutions
router.get("/", auth, checkRoles(["admin"]), (_, response) => {
  response.status(200).send(RoleList);
});

module.exports = router;
