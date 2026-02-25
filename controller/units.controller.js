const Messages = require("../constants/Messages");
const Unit = require("../model/Unit");
const { Person } = require("../model/Person");
const {
  getUnitTypesByType,
  getUnitTypeByUnitTypeId,
} = require("../actions/UnitTypeActions");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");
const { getInstitutionListByID } = require("../actions/InstitutionActions");
const { InstitutionList } = require("../constants/InstitutionList");
const { UnitTypeList } = require("../constants/UnitTypeList");

// GET /units
// Tüm birimleri listele, isteğe bağlı olarak kurum türüne göre filtrele
exports.getAllUnits = async (request, response) => {
  try {
    const institutionTypeId = request.query.institutionTypeId;
    
    if (institutionTypeId) {
      const unitTypes = getUnitTypesByType(institutionTypeId);
      const units = await Unit.find({
        unitTypeID: { $in: unitTypes.map((unitType) => unitType.id) },
      });

      response.send({
        success: true,
        unitList: units,
      });
    } else {
      const units = await Unit.find();

      response.send({
        success: true,
        unitList: units,
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNITS_NOT_FOUND,
    });
  }
};

// GET /units/search
// Birim adına göre arama
exports.searchUnits = async (request, response) => {
  try {
    const q = request.query.q;
    let limit = parseInt(request.query.limit) || 10;

    // Validation
    if (!q || q.trim().length < 2) {
      return response.status(400).send({
        success: false,
        message: "Arama metni en az 2 karakter olmalıdır.",
      });
    }

    // Limit must be between 1 and 50
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    // Case-insensitive regex for partial match
    const searchRegex = new RegExp(q, "i");

    const units = await Unit.find({
      name: searchRegex,
    }).limit(limit);

    // Map units with institution and unitType information
    const unitsWithDetails = units.map((unit) => {
      const institution = InstitutionList.find(
        (inst) => inst.id === unit.institutionID
      );
      const unitType = UnitTypeList.find((ut) => ut.id === unit.unitTypeID);

      return {
        _id: unit._id,
        name: unit.name,
        unitType: unitType
          ? {
              id: unitType.id,
              name: unitType.name,
            }
          : null,
        institutionID: institution
          ? {
              id: institution.id,
              name: institution.name,
            }
          : null,
      };
    });

    // Count total records matching the search
    const total = await Unit.countDocuments({ name: searchRegex });

    response.send({
      success: true,
      data: {
        units: unitsWithDetails,
        count: unitsWithDetails.length,
        total: total,
      },
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNITS_NOT_FOUND,
    });
  }
};

// GET /units/institution/:institutionId
// Kuruma ait tüm birimleri listele
exports.getUnitsByInstitution = async (request, response) => {
  try {
    const institutionId = request.params.institutionId;

    const units = await Unit.find({ institutionID: institutionId });

    const unitsWithType = units.map((unit) => {
      const unitType = getUnitTypeByUnitTypeId(unit.unitTypeID);
      return { ...unit._doc, unitType };
    });

    response.send({
      success: true,
      institution: getInstitutionListByID(institutionId),
      unitList: unitsWithType,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNITS_NOT_FOUND,
    });
  }
};

// GET /units/institution/:institutionId/name
// Kuruma ait birimlerin adlarını ve ID'lerini listele
exports.getUnitNamesByInstitution = async (request, response) => {
  try {
    const institutionId = request.params.institutionId;

    const units = await Unit.find(
      { institutionID: institutionId },
      { name: 1 }
    );

    response.send({
      success: true,
      unitList: units,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNITS_NOT_FOUND,
    });
  }
};

// POST /units
// Yeni birim ekle
exports.createUnit = async (request, response) => {
  try {
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

    const savedUnit = await unit.save();

    recordActivity(
      request.user.id,
      RequestTypeList.UNIT_CREATE,
      null,
      `Birim ${savedUnit.name} eklendi`,
      null,
      savedUnit._id
    );

    response.status(201).send(savedUnit);
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNIT_NOT_SAVED,
    });
  }
};

// PUT /units/:id
// Birim güncelle
exports.updateUnit = async (request, response) => {
  try {
    const id = request.params.id;

    const unit = await Unit.findByIdAndUpdate(id, request.body, {
      useFindAndModify: false,
    });

    if (!unit) {
      return response.status(404).send({
        success: false,
        message: Messages.UNIT_NOT_FOUND,
      });
    }

    recordActivity(
      request.user.id,
      RequestTypeList.UNIT_UPDATE,
      null,
      null,
      null,
      id
    );

    response.send({
      success: true,
      message: Messages.UNIT_UPDATED,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNIT_NOT_UPDATED,
    });
  }
};

// DELETE /units/:id
// Birim sil (kuruma ait personel yoksa)
exports.deleteUnit = async (request, response) => {
  try {
    const id = request.params.id;

    // Bu birime ait personel var mı kontrol et
    const persons = await Person.find({ birimID: id });

    if (persons.length > 0) {
      return response.status(400).send({
        success: false,
        message: Messages.UNIT_NOT_DELETABLE_REASON_PERSON,
      });
    }

    const unit = await Unit.findByIdAndDelete(id);

    if (!unit) {
      return response.status(404).send({
        success: false,
        message: Messages.UNIT_NOT_FOUND,
      });
    }

    const unitObj = unit.toObject();

    recordActivity(
      request.user.id,
      RequestTypeList.UNIT_DELETE,
      null,
      `Birim: ${unitObj.name} silindi`,
      null,
      id
    );

    response.send({
      success: true,
      message: Messages.UNIT_DELETED,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.UNIT_NOT_DELETED,
    });
  }
};
