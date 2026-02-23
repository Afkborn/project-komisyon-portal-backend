const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const { InstitutionList } = require("../constants/InstitutionList");

// get all institutions sort by order
router.get("/", (_, response) => {
  const sortedInstitutions = [...InstitutionList].sort((a, b) => a.order - b.order);
  response.status(200).send({
    success: true,
    InstitutionList: sortedInstitutions,
  });
});

module.exports = router;
