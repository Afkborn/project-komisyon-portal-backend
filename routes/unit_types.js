const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const UnitTypeList = require("../constants/UnitTypeList").UnitTypeList;

// if type params is given, return only that type
// if type params is not given, return all types
router.get("/", (request, response) => {
  const institutionTypeId = request.query.institutionTypeId;

  if (institutionTypeId) {
    const unitTypes = UnitTypeList.filter(
      (unitType) => unitType.institutionTypeId === parseInt(institutionTypeId)
    );
    if (unitTypes) {
      response.status(200).send(unitTypes);
    } else {
      response.status(404).send({
        message: Messages.UNIT_TYPE_NOT_FOUND,
      });
    }
  } else {
    response.status(200).send(UnitTypeList);
  }
});

module.exports = router;
