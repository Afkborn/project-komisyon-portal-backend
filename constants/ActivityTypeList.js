const ActivityTypeList = {
  DEFAULT: {
    id: 0,
    name: "GENEL",
  },
  POST_PERSON: {
    id: 1,
    name: "kişi ekleme",
  },
  PUT_PERSON_ID: {
    id: 3,
    name: "ID kişi güncelleme",
  },
  PUT_PERSON_SICIL: {
    id: 4,
    name: "Özellik Aktar İle Güncelleme",
  },
};

// Dışa aktarım
module.exports = ActivityTypeList;
