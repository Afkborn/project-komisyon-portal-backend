const ActivityTypeList = {
  DEFAULT: {
    id: 0,
    name: "GENEL",
  },

  PERSON_CREATE: {
    id: 1,
    name: "Personel Ekleme",
    field: "personID",
  },
  PERSON_UPDATE_ID: {
    id: 3,
    name: "Personel Güncelleme",
    field: "personID",
  },
  PERSON_UPDATE_SICIL: {
    id: 4,
    name: "Personel Güncelleme (Özellik Aktar)",
    field: "personID",
  },
  PERSON_DELETE: {
    id: 5,
    name: "Personel Silme",
  },

  TITLE_CREATE: {
    id: 6,
    name: "Ünvan Ekleme",
    field: "titleID",
  },
  TITLE_UPDATE: {
    id: 7,
    name: "Ünvan Özellik Güncelleme",
    field: "titleID",
  },
  TITLE_DELETE: {
    id: 8,
    name: "Ünvan Silme",
  },

  UNIT_CREATE: {
    id: 9,
    name: "Birim Ekleme",
    field: "unitID",
  },
  UNIT_UPDATE: {
    id: 10,
    name: "Birim Özellik Güncelleme",
    field: "unitID",
  },
  UNIT_DELETE: {
    id: 11,
    name: "Birim Silme",
  },

  PERSON_UNIT_CHANGE: {
    id: 13,
    name: "Personel Birim Güncelleme",
    field: "personID",
  },

  LEAVE_CREATE: {
    id: 14,
    name: "İzin Oluşturma",
    field: "personID",
  },
  LEAVE_DELETE: {
    id: 15,
    name: "İzin Silme",
    field: "personID",
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
  REPORT_MAHKEMESAVCILIKKATIP: {
    id: 22,
    name: "Mahkeme Savcılık Katip Raporu",
  },
  PERSON_DEACTIVATED_LIST: {
    id: 23,
    name: "Pasif Personel Listesi",
  },
  PERSON_ACTIVATED_LIST: {
    id: 24,
    name: "Aktif Personel Listesi",
  },
};

// Dışa aktarım
module.exports = ActivityTypeList;
