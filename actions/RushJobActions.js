const { Person } = require("../model/Person");

// geçici personel bitiş kararı yaklaşanlar
async function getUrgentExpiringTemporaryPersonnel(units, day = 14) {
  // get persons who isTemporary is true and isTemporaryEndDate is less than day
  const persons = await Person.find({
    unitID: { $in: units },
    isTemporary: true,
    temporaryEndDate: {
      $lte: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
    },
  });

  return persons;
}

// izinde olup izni bitmeye yaklaşanlar
async function getUrgentExpiringLeaves(units, day = 14) {
  // get persons who isTemporary is true and isTemporaryEndDate is less than day
  const persons = await Person.find({
    unitID: { $in: units },
  }).populate("izinler", "-__v -personID");

  let now = new Date();
  let izinliPersonel = persons.filter((person) => {
    return person.izinler.some((leave) => {
      return now >= leave.startDate && now <= leave.endDate;
    });
  });

  // izinliPersonel içinde dön, bitiş tarihi day gün sonra olacak olanları al
  izinliPersonel = izinliPersonel.filter((person) => {
    return person.izinler.some((leave) => {
      return leave.endDate - now <= day * 24 * 60 * 60 * 1000;
    });
  });

  return izinliPersonel;
}


// uzaklaştırması olup bitiş tarihi yaklaşanlar
async function getUrgentExpiringSuspensions(units, day = 14) {
  // get persons who isTemporary is true and isTemporaryEndDate is less than day
  const persons = await Person.find({
    unitID: { $in: units },
    isSuspended: true,
    suspensionEndDate: {
      $lte: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
    },
  });

  return persons;
}


module.exports = {
  getUrgentExpiringTemporaryPersonnel,
  getUrgentExpiringLeaves,
  getUrgentExpiringSuspensions,
};
