const Messages = require("../constants/Messages");
const UnitTypeList = require("../constants/UnitTypeList").UnitTypeList;

// GET /unit_types
// Birim türlerini listele, isteğe bağlı olarak kurum türüne göre filtrele
exports.getUnitTypes = async (request, response) => {
  try {
    const institutionTypeId = request.query.institutionTypeId;

    if (institutionTypeId) {
      const unitTypes = UnitTypeList.filter(
        (unitType) => unitType.institutionTypeId === parseInt(institutionTypeId)
      );
      if (unitTypes && unitTypes.length > 0) {
        response.status(200).send(unitTypes);
      } else {
        response.status(404).send({
          success: false,
          message: Messages.UNIT_TYPE_NOT_FOUND,
        });
      }
    } else {
      response.status(200).send(UnitTypeList);
    }
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || "Birim türleri alınırken bir hata oluştu",
    });
  }
};
