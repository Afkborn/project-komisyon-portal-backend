// field ana ekranda gösterilecek detayı belirlemek için kullanılıyore
// filterType ise filtreleme yapılırken kullanılacak alanı belirler
// filterType = person, title, unit, rapor
const ActivityTypeList = {
  DEFAULT: {
    id: 0,
    name: "GENEL",
  },

  PERSON_CREATE: {
    id: 1,
    app: "EPSİS",
    name: "Personel Ekleme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  PERSON_UPDATE_ID: {
    id: 3,
    app: "EPSİS",
    name: "Personel Güncelleme",
    field: "personID",
    filterType: "person",
  },
  PERSON_UPDATE_SICIL: {
    id: 4,
    app: "EPSİS",
    name: "Personel Güncelleme (Özellik Aktar)",
    field: "personID",
    filterType: "person",
  },
  PERSON_DELETE: {
    id: 5,
    app: "EPSİS",
    name: "Personel Silme",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  TITLE_CREATE: {
    id: 6,
    app: "EPSİS",
    name: "Ünvan Ekleme",
    field: "titleID",
    filterType: "title",
  },
  TITLE_UPDATE: {
    id: 7,
    app: "EPSİS",
    name: "Ünvan Özellik Güncelleme",
    field: "titleID",
    filterType: "title",
  },
  TITLE_DELETE: {
    id: 8,
    app: "EPSİS",
    name: "Ünvan Silme",
    filterType: "title",
  },
  UNIT_CREATE: {
    id: 9,
    app: "EPSİS",
    name: "Birim Ekleme",
    field: "unitID",
    filterType: "unit",
  },
  UNIT_UPDATE: {
    id: 10,
    app: "EPSİS",
    name: "Birim Özellik Güncelleme",
    field: "unitID",
    filterType: "unit",
  },
  UNIT_DELETE: {
    id: 11,
    app: "EPSİS",
    name: "Birim Silme",
    filterType: "unit",
  },
  PERSON_UNIT_CHANGE: {
    id: 13,
    app: "EPSİS",
    name: "Personel Birim Güncelleme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  LEAVE_CREATE: {
    id: 14,
    app: "EPSİS",
    name: "İzin Oluşturma",
    field: "personID",
    filterType: "person",
  },
  LEAVE_DELETE: {
    id: 15,
    app: "EPSİS",
    name: "İzin Silme",
    field: "personID",
    filterType: "person",
  },
  REPORT_EKSIKKATIPOLANBIRIMLER: {
    id: 17,
    app: "EPSİS",
    name: "Eksik Katibi Olan Birimler Raporu",
    filterType: "report",
  },
  REPORT_IZINLIPERSONELLER: {
    id: 18,
    app: "EPSİS",
    name: "İzinli Personeller Raporu",
    filterType: "report",
  },
  REPORT_TOPLAMPERSONELSAYISI: {
    id: 19,
    app: "EPSİS",
    name: "Toplam Personel Sayısı Raporu",
    filterType: "report",
  },
  REPORT_PERSONELTABLO: {
    id: 21,
    app: "EPSİS",
    name: "Personel Tablo Raporu",
    filterType: "report",
  },
  REPORT_MAHKEMESAVCILIKKATIP: {
    id: 22,
    app: "EPSİS",
    name: "Mahkeme Savcılık Katip Raporu",
    filterType: "report",
  },
  PERSON_DEACTIVATED_LIST: {
    id: 23,
    app: "EPSİS",
    name: "Pasif Personel Listesi",
    filterType: "report",
  },
  PERSON_ACTIVATED_LIST: {
    id: 24,
    app: "EPSİS",
    name: "Aktif Personel Listesi",
    filterType: "report",
  },
  PERSON_TEMPORARY_LIST: {
    id: 25,
    app: "EPSİS",
    name: "Geçici Personel Listesi",
    filterType: "report",
  },
  PERSON_UNIT_DELETE: {
    id: 26,
    app: "EPSİS",
    name: "Personel Birim Silme",
    field: "personID",
    filterType: "person",
  },
  PERSON_DEACTIVATE: {
    id: 27,
    app: "EPSİS",
    name: "Personel Pasif Duruma Getirme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },

  PERSON_SUSPENDED_LIST: {
    id: 28,
    app: "EPSİS",
    name: "Uzaklaştırılmış Personel Listesi",
    field: "personID",
    filterType: "person",
  },
  PERSON_SUSPEND: {
    id: 29,
    app: "EPSİS",
    name: "Personeli Uzaklaştırma",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  REPORT_PERSON_DISABLED_LIST: {
    id: 30,
    app: "EPSİS",
    name: "Engelli Personel Listesi",
    filterType: "report",
  },
  REPORT_PERSON_MARTYR_RELATIVE_LIST: {
    id: 31,
    app: "EPSİS",
    name: "Şehit Gazi Yakını Personel Listesi",
    filterType: "report",
  },

  SEGBIS_PERSONEL_LIST : {
    id: 32,
    app: "SEGBİS",
    name: "Mahkeme Personel Listeleme",
    filterType: "SEGBİS",
  }
};

// Dışa aktarım
module.exports = ActivityTypeList;
