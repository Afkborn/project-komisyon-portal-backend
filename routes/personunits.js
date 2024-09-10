const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const PersonUnit = require("../model/PersonUnit");
const auth = require("../middleware/auth");
const {
  getUnitTypesByType,
  getUnitTypeByUnitTypeId,
} = require("../actions/UnitTypeActions");
const Logger = require("../middleware/logger");
const { Person, zabitkatibi } = require("../model/Person");

// birim değiştirme işlemi
// post  /personunits/changeUnit
router.post(
  "/changeUnit",
  auth,
  Logger("POST /personunits/changeUnit"),
  async (request, response) => {
    const requiredFields = ["personID", "newUnitID", "endDate"];
    const missingFields = requiredFields.filter(
      (field) => !request.body[field]
    );
    if (missingFields.length > 0) {
      return response.status(400).send({
        success: false,
        message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
      });
    }

    const { personID, newUnitID, endDate, detail } = request.body;

    // person objesinin birimID ve birimeBaslamaTarihi güncellenir.

    let person = await Person.findOne({ _id: personID });
    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    let startDate = person.birimeBaslamaTarihi;

    let unitID = person.birimID;
    const personUnit = new PersonUnit({
      personID,
      unitID,
      startDate,
      endDate,
      detail,
    });

    personUnit
      .save()
      .then((data) => {
        // person objesinin birimID ve birimeBaslamaTarihi güncellenir.
        person.birimID = newUnitID;
        person.birimeBaslamaTarihi = endDate;
        person.gecmisBirimler.push(data._id);
        person
          .save()
          .then((data) => {
            response.send({
              success: true,
              data,
            });
          })
          .catch((error) => {
            console.log(error);
            response.status(500).send({
              message: error.message || Messages.PERSON_UNIT_CREATE_ERROR,
            });
          });
      })
      .catch((error) => {
        console.log(error);
        response.status(500).send({
          message: error.message || Messages.PERSON_UNIT_CREATE_ERROR,
        });
      });
  }
);

module.exports = router;
