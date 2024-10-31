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
    name: "Personel Ekleme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  PERSON_UPDATE_ID: {
    id: 3,
    name: "Personel Güncelleme",
    field: "personID",
    filterType: "person",
  },
  PERSON_UPDATE_SICIL: {
    id: 4,
    name: "Personel Güncelleme (Özellik Aktar)",
    field: "personID",
    filterType: "person",
  },
  PERSON_DELETE: {
    id: 5,
    name: "Personel Silme",
    filterType: "person",
    showPersonelHareketScreen: true,
  },

  TITLE_CREATE: {
    id: 6,
    name: "Ünvan Ekleme",
    field: "titleID",
    filterType: "title",
  },
  TITLE_UPDATE: {
    id: 7,
    name: "Ünvan Özellik Güncelleme",
    field: "titleID",
    filterType: "title",
  },
  TITLE_DELETE: {
    id: 8,
    name: "Ünvan Silme",
    filterType: "title",
  },
  UNIT_CREATE: {
    id: 9,
    name: "Birim Ekleme",
    field: "unitID",
    filterType: "unit",
  },
  UNIT_UPDATE: {
    id: 10,
    name: "Birim Özellik Güncelleme",
    field: "unitID",
    filterType: "unit",
  },
  UNIT_DELETE: {
    id: 11,
    name: "Birim Silme",
    filterType: "unit",
  },
  PERSON_UNIT_CHANGE: {
    id: 13,
    name: "Personel Birim Güncelleme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
  LEAVE_CREATE: {
    id: 14,
    name: "İzin Oluşturma",
    field: "personID",
    filterType: "person",
  },
  LEAVE_DELETE: {
    id: 15,
    name: "İzin Silme",
    field: "personID",
    filterType: "person",
  },

  REPORT_EKSIKKATIPOLANBIRIMLER: {
    id: 17,
    name: "Eksik Katibi Olan Birimler Raporu",
    filterType: "report",
  },
  REPORT_IZINLIPERSONELLER: {
    id: 18,
    name: "İzinli Personeller Raporu",
    filterType: "report",
  },
  REPORT_TOPLAMPERSONELSAYISI: {
    id: 19,
    name: "Toplam Personel Sayısı Raporu",
    filterType: "report",
  },
  REPORT_PERSONELTABLO: {
    id: 21,
    name: "Personel Tablo Raporu",
    filterType: "report",
  },
  REPORT_MAHKEMESAVCILIKKATIP: {
    id: 22,
    name: "Mahkeme Savcılık Katip Raporu",
    filterType: "report",
  },
  PERSON_DEACTIVATED_LIST: {
    id: 23,
    name: "Pasif Personel Listesi",
    filterType: "report",
  },
  PERSON_ACTIVATED_LIST: {
    id: 24,
    name: "Aktif Personel Listesi",
    filterType: "report",
  },
  PERSON_TEMPORARY_LIST: {
    id: 25,
    name: "Geçici Personel Listesi",
    filterType: "report",
  },
  PERSON_UNIT_DELETE: {
    id: 26,
    name: "Personel Birim Silme",
    field: "personID",
    filterType: "person",
  },
  PERSON_DEACTIVATE: {
    id: 27,
    name: "Personel Pasif Duruma Getirme",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },

  PERSON_SUSPENDED_LIST: {
    id: 28,
    name: "Personel Uzaklaştırma",
    field: "personID",
    filterType: "person",
    showPersonelHareketScreen: true,
  },
};

// Dışa aktarım
module.exports = ActivityTypeList;
