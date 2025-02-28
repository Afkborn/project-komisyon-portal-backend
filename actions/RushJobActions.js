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

  // şu an izinli olanları al
  let izinliPersonel = persons.filter((person) => {
    return person.izinler.some(
      (leave) => now >= leave.startDate && now <= leave.endDate
    );
  });

  // sadece şu an aktif izni olanları al ve onların bitiş tarihi 14 gün içinde mi kontrol et
  izinliPersonel = izinliPersonel.filter((person) => {
    return person.izinler
      .filter((leave) => now >= leave.startDate && now <= leave.endDate) // sadece aktif izinler
      .some((leave) => leave.endDate - now <= day * 24 * 60 * 60 * 1000);
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
