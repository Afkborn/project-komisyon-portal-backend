const Messages = require("../constants/Messages");
const mongoose = require("mongoose");
const PersonUnit = require("../model/PersonUnit");
const Unit = require("../model/Unit");
const { Person } = require("../model/Person");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// POST /personunits/changeUnit
// birim değiştirme işlemi
exports.changeUnit = async (request, response) => {
  try {
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
    const unit = await Unit.findOne({
      _id: newUnitID,
    });

    if (!unit) {
      return response.status(404).send({
        success: false,
        message: Messages.UNIT_NOT_FOUND,
      });
    }

    const person = await Person.findOne({ _id: personID });
    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    const startDate = person.birimeBaslamaTarihi;
    const unitID = person.birimID;

    const personUnit = new PersonUnit({
      personID,
      unitID,
      startDate,
      endDate,
      detail,
    });

    const savedPersonUnit = await personUnit.save();

    // person objesinin birimID ve birimeBaslamaTarihi güncellenir.
    person.birimID = newUnitID;
    person.birimeBaslamaTarihi = endDate;
    person.gecmisBirimler.push(savedPersonUnit._id);

    await person.save();

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_UNIT_CHANGE,
      personID,
      null,
      null,
      null,
      savedPersonUnit._id
    );

    response.send({
      success: true,
      data: savedPersonUnit,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_UNIT_CREATE_ERROR,
    });
  }
};

// DELETE /personunits/:id
// birim değişikliği silme işlemi
exports.deletePersonUnit = async (request, response) => {
  try {
    const id = request.params.id;
    if (!id) {
      return response.status(400).send({
        success: false,
        message: Messages.REQUIRED_FIELD,
      });
    }

    const personUnit = await PersonUnit.findOne({ _id: id });
    if (!personUnit) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_UNIT_NOT_FOUND,
      });
    }

    const person = await Person.findOne({ _id: personUnit.personID });

    // person objesinin gecmisBirimler listesinden silinir.
    person.gecmisBirimler = person.gecmisBirimler.filter((item) => item != id);

    await person.save();

    const deletedPersonUnit = await PersonUnit.findOneAndDelete({ _id: id });

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_UNIT_DELETE,
      personUnit.personID,
      null,
      null,
      null,
      deletedPersonUnit._id
    );

    response.send({
      success: true,
      data: deletedPersonUnit,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_UNIT_DELETE_ERROR,
    });
  }
};
