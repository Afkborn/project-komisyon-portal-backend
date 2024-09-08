const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Unit = require("../model/Unit");
const { Person, zabitkatibi } = require("../model/Person");
const auth = require("../middleware/auth");
const {
  getUnitTypesByType,
  getUnitTypeByUnitTypeId,
} = require("../actions/UnitTypeActions");
const Logger = require("../middleware/logger");

// get all units
// institutionTypeId params is optional
// if institutionTypeId is provided, it will return all units of that type
router.get("/", auth, Logger("GET /units"), (request, response) => {
  const institutionTypeId = request.query.institutionTypeId;
  if (institutionTypeId) {
    const unitTypes = getUnitTypesByType(institutionTypeId);
    // unitTypes örneğin şimdi 9001,9002,9003 olarak gidiyor.
    // unitTypes'ı 9001,9002,9003 olan bütün unit'leri döndür.
    Unit.find({ unitTypeID: { $in: unitTypes.map((unitType) => unitType.id) } })
      .then((units) => {
        response.send({
          success: true,
          unitList: units,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: error.message || Messages.UNITS_NOT_FOUND,
        });
      });
  } else {
    Unit.find()
      .then((units) => {
        response.send({
          success: true,
          unitList: units,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: error.message || Messages.UNITS_NOT_FOUND,
        });
      });
  }
});

// get all units
// institutionId params is required
// it will return all units of that institution
router.get(
  "/institution/:institutionId",
  auth,
  Logger("GET /units/institution"),
  (request, response) => {
    const institutionId = request.params.institutionId;
    Unit.find({ institutionID: institutionId })
      .then((units) => {
        // unitlerinin her birine institutionTypeId ekleyelim.
        /// bunun için unitTypeID alalım
        // unitTypeID'nin institutionTypeId'sini almak için UnitTypeActions.js'deki getInstitutionTypeIdByUnitTypeId fonksiyonunu kullanalım.
        // bu fonksiyonun içinde UnitTypeList'ten ilgili unitTypeID'ye ait institutionTypeID'yi döndürelim.

        units = units.map((unit) => {
          const unitType = getUnitTypeByUnitTypeId(unit.unitTypeID);
          return { ...unit._doc, unitType };
        });

        response.send({
          success: true,
          unitList: units,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: error.message || Messages.UNITS_NOT_FOUND,
        });
      });
  }
);

// post a unit
router.post("/", auth, Logger("POST /units"), (request, response) => {
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

//upddate a unit
router.put("/:id", auth, Logger("PUT /units"), (request, response) => {
  const id = request.params.id;

  Unit.findByIdAndUpdate(id, request.body, { useFindAndModify: false })
    .then((unit) => {
      if (!unit) {
        return response.status(404).send({
          success: false,
          message: Messages.UNIT_NOT_FOUND,
        });
      }
      response.send({
        success: true,
        message: Messages.UNIT_UPDATED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.UNIT_NOT_UPDATED,
      });
    });
});

// delete a unit
// bu unit'e ait personel varsa silme işlemi gerçekleştirilemez.
router.delete("/:id", auth, Logger("DELETE /units"), (request, response) => {
  const id = request.params.id;
  Person.find({ birimID: id })
    .then((persons) => {
      if (persons.length > 0) {
        console.log("persons", persons);
        console.log("personel var silinemez.")
        return response.status(400).send({
          success: false,
          message: Messages.UNIT_NOT_DELETABLE_REASON_PERSON,
        });
      }
      Unit.findByIdAndRemove(id)
        .then((unit) => {
          if (!unit) {
            return response.status(404).send({
              success: false,
              message: Messages.UNIT_NOT_FOUND,
            });
          }
          response.send({
            success: true,
            message: Messages.UNIT_DELETED,
          });
        })
        .catch((error) => {
          response.status(500).send({
            message: error.message || Messages.UNIT_NOT_DELETED,
          });
        });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.UNIT_NOT_DELETED,
      });
    });
});
 

// get all units name  with institution id
// bu route'un amacı, institution id'si verilen unit'in adını ve id'sini döndürmek.
// örneğin, institution id'si 1 olan unit'lerin adlarını ve id'lerini döndür.
router.get(
  "/institution/:institutionId/name",
  auth,
  Logger("GET /units/institution/name"),
  (request, response) => {
    const institutionId = request.params.institutionId;
    Unit.find({ institutionID: institutionId }, { name: 1 })
      .then((units) => {
        response.send({
          success: true,
          unitList: units,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: error.message || Messages.UNITS_NOT_FOUND,
        });
      });
  }
);

module.exports = router;
