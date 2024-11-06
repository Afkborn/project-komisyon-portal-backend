const Messages = require("../constants/Messages");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const PersonUnit = require("../model/PersonUnit");
const Unit = require("../model/Unit");
const auth = require("../middleware/auth");
// const {
//   getUnitTypesByType,
//   getUnitTypeByUnitTypeId,
// } = require("../actions/UnitTypeActions");
const Logger = require("../middleware/logger");
const { Person } = require("../model/Person");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

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

    // newUnitID'nin geçerli bir ID olup olmadığını kontrol et
    if (!mongoose.Types.ObjectId.isValid(newUnitID)) {
      return response.status(400).send({
        success: false,
        message: "Geçersiz birim ID'si.",
      });
    }

    // newUnitID'nin olup olmadığını kontrol et yoksa hata dön
    let unit = await Unit.findOne({
      _id: newUnitID,
    });
    console.log(unit);
    if (!unit) {
      return response.status(404).send({
        success: false,
        message: Messages.UNIT_NOT_FOUND,
      });
    }

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
            recordActivity(
              request.user.id,
              RequestTypeList.PERSON_UNIT_CHANGE,
              personID,
              null,
              null,
              null,
              data._id
            );

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

// birim değişikliği silme işlemi
// delete  /personunits/:id
router.delete(
  "/:id",
  auth,
  Logger("DELETE /personunits/:id"),
  async (request, response) => {
    const id = request.params.id;
    if (!id) {
      return response.status(400).send({
        success: false,
        message: Messages.REQUIRED_FIELD,
      });
    }

    let personUnit = await PersonUnit.findOne({ _id: id });
    if (!personUnit) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_UNIT_NOT_FOUND,
      });
    }

    let person = await Person.findOne({ _id: personUnit.personID });

    // person objesinin gecmisBirimler listesinden silinir.
    person.gecmisBirimler = person.gecmisBirimler.filter((item) => item != id);

    person
      .save()
      .then((data) => {
        PersonUnit.findOneAndDelete(id).then((data) => {
          recordActivity(
            request.user.id,
            RequestTypeList.PERSON_UNIT_DELETE,
            personUnit.personID,
            null,
            null,
            null,
            data._id
          );

          response.send({
            success: true,
            data,
          });
        });
      })
      .catch((error) => {
        console.log(error);
        response.status(500).send({
          message: error.message || Messages.PERSON_UNIT_DELETE_ERROR,
        });
      });
  }
);

module.exports = router;
