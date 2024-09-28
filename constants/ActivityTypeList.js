const ActivityTypeList = {
  DEFAULT: {
    id: 0,
    name: "GENEL",
  },

  PERSON_CREATE: {
    id: 1,
    name: "Personel Ekleme",
    field: "personID"
  },
  PERSON_UPDATE_ID: {
    id: 3,
    name: "Personel Güncelleme",
    
  },
  PERSON_UPDATE_SICIL: {
    id: 4,
    name: "Personel Güncelleme (Özellik Aktar)",
  },
  PERSON_DELETE: {
    id: 5,
    name: "Personel Silme",
  },

  TITLE_CREATE: {
    id: 6,
    name: "Title Oluşturma",
  },
  TITLE_UPDATE: {
    id: 7,
    name: "Title Güncelleme",
  },
  TITLE_DELETE: {
    id: 8,
    name: "Title Silme",
  },

  UNIT_CREATE: {
    id: 9,
    name: "Birim Oluşturma",
  },
  UNIT_UPDATE: {
    id: 10,
    name: "Birim Güncelleme",
    field: "unitID",
  },
  UNIT_DELETE: {
    id: 11,
    name: "Birim Silme",
  },

  PERSON_UNIT_CHANGE: {
    id: 13,
    name: "Personel Birim Güncelleme",
    field : "personID"
  },

  LEAVE_CREATE: {
    id: 14,
    name: "İzin Oluşturma",
  },
  LEAVE_DELETE: {
    id: 15,
    name: "İzin Silme",
  },

  REPORT_EKSIKKATIPOLANBIRIMLER: {
    id: 17,
    name: "Eksik Katibi Olan Birimler Raporu",
  },
  REPORT_IZINLIPERSONELLER: {
    id: 18,
    name: "İzinli Personeller Raporu",
  },
  REPORT_TOPLAMPERSONELSAYISI: {
    id: 19,
    name: "Toplam Personel Sayısı Raporu",
  },
  REPORT_PERSONELTABLO: {
    id: 21,
    name: "Personel Tablo Raporu",
  },
};

// Dışa aktarım
module.exports = ActivityTypeList;
