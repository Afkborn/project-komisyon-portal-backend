const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Unit = require("../model/Unit");
const getTimeForLog = require("../common/time");
const auth = require("../middleware/auth");

// get all units
router.get("/", auth, (request, response) => {
  Unit.find()
    .then((units) => {
      response.status(200).send(units);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.UNIT_LIST_NOT_FOUND,
      });
    });
});

// post a unit
router.post("/", auth, (request, response) => {
  const requiredFields = ["institutionID", "unitTypeID", "name"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  const unit = new Unit({
    institutionID: request.body.institutionID,
    unitTypeID: request.body.unitTypeID,
    delegationType: request.body.delegationType,
    status: request.body.status,
    series: request.body.series,
    minClertCount: request.body.minClertCount,
    name: request.body.name,
  });

  unit
    .save()
    .then((data) => {
      response.status(201).send(data);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.UNIT_NOT_SAVED,
      });
    });
});



module.exports = router;