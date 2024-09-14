const UnitTypeList = require("../constants/UnitTypeList").UnitTypeList;
// {
//     id: 9001,
//     name: "Ağır Ceza Mahkemesi",
//     type: 0,
//     oncelikSirasi: 1,
//   },

// her bir unit type'da type adında bir property var.
// bu fonksiyona verilen type parametresi ile eşleşen unit type'ları döndürür.
function getUnitTypesByType(type) {
  return UnitTypeList.filter(
    (unitType) => unitType.institutionTypeId === parseInt(type)
  );
}


function getUnitTypeByUnitTypeId(unitTypeID) {
  return UnitTypeList.find((unitType) => unitType.id === unitTypeID);
}

module.exports = {
  getUnitTypesByType,
  getUnitTypeByUnitTypeId,
};
