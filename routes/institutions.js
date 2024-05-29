const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const InstitutionList = require("../constants/InstitutionList");

// get all institutions
router.get("/", (_, response) => {
  response.status(200).send(InstitutionList);
});

module.exports = router;
