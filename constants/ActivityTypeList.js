const ActivityTypeList = {
  DEFAULT: {
    id: 0,
    name: "GENEL",
  },

  PERSON_CREATE: {
    id: 1,
    name: "kişi ekleme",
  },
  PERSON_UPDATE_ID: {
    id: 3,
    name: "ID kişi güncelleme",
  },
  PERSON_UPDATE_SICIL: {
    id: 4,
    name: "Özellik Aktar İle Güncelleme",
  },
  PERSON_DELETE: {
    id: 5,
    name: "Kişi Silme",
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
  },
  UNIT_DELETE: {
    id: 11,
    name: "Birim Silme",
  },

  PERSON_UNIT_CHANGE: {
    id: 13,
    name: "Personel Birim Güncelleme",
  },

  LEAVE_CREATE: {
    id: 14,
    name: "İzin Oluşturma",
  },
  LEAVE_DELETE: {
    id: 15,
    name: "İzin Silme",
  },



  REPORT_EKSIKKATIPOLANBIRIMLER : {
    id: 17,
    name: "Eksik Katibi Olan Birimler",
  },
  REPORT_IZINLIPERSONELLER : {
    id: 18,
    name: "İzinli Personeller",
  },
  REPORT_TOPLAMPERSONELSAYISI : {
    id: 19,
    name: "Toplam Personel Sayısı",
  },
  REPORT_PERSONELTABLO : {
    id: 21,
    name: "Personel Tablo",
  },

};

// Dışa aktarım
module.exports = ActivityTypeList;
