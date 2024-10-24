const AccessRecord = require("../model/Activity");

const ActivityTypeList = require("../constants/ActivityTypeList");

async function recordActivity(
  userID,
  type,
  personID = null,
  description = null,
  titleID = null,
  unitID = null,
  personUnitID = null,
  leaveID = null,
  isVisible = true
) {
  const accessLog = new AccessRecord({
    userID,
    typeID: type.id,
    personID,
    description,
    titleID,
    unitID,
    personUnitID,
    leaveID,
    isVisible,
  });

  return new Promise((resolve, reject) => {
    accessLog
      .save()
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getActivityWithID(typeID) {
  const key = Object.keys(ActivityTypeList).find(
    (key) => ActivityTypeList[key].id === typeID
  );
  return key ? ActivityTypeList[key] : null; // Eğer anahtar bulunursa nesneyi döndür, yoksa null döndür
}

function getActivitiesWithFilterTypes(filterTypes) {
  return Object.keys(ActivityTypeList)
    .filter((key) => filterTypes.includes(ActivityTypeList[key].filterType)) // filterType'lara uyanları filtrele
    .map((key) => ActivityTypeList[key]); // Uyanları döndür
}


module.exports = { recordActivity, getActivityWithID, getActivitiesWithFilterTypes };
