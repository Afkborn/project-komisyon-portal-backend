const InstitutionList = require("../constants/InstitutionList").InstitutionList;

function getInstitutionListByID(typeId) {
  let result = InstitutionList.find((institutionID) => institutionID.id === typeId);
  return {
    id: result.id,
    name: result.name,
    
  }
}

module.exports = {
  getInstitutionListByID,
};
