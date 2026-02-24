const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const Activity = require("../model/Activity");

// const RequestTypeList = require("../constants/ActivityTypeList");
const {
  getActivityWithID,
  getActivitiesWithFilterTypes,
  getActivityWithPersonelHaraketScreen,
  getActivitiesWithApp,
} = require("../actions/ActivityActions");

// Helper function: raporları filtrele
function getReportActivities() {
  const ActivityTypeList = require("../constants/ActivityTypeList");
  return Object.keys(ActivityTypeList)
    .filter((key) => ActivityTypeList[key].filterType === "report")
    .map((key) => ActivityTypeList[key]);
}

// get activities
router.get("/", auth, Logger("GET /activities/"), async (request, response) => {
  let { page = 1, limit = 10, pageSize, maxPageCount } = request.query; // Varsayılan değerleri veriyoruz
  page = parseInt(page) || 1; // Geçerli bir sayfa numarası değilse, 1 olarak al
  
  // pageSize parametresi varsa onu kullan, yoksa limit kullan
  limit = pageSize ? parseInt(pageSize) : parseInt(limit) || 10;

  app = request.query.app; // Uygulama adını al
  userID = request.query.userID; // Kullanıcı ID'sini al
  filterType = request.query.filterType; // Filtre tipini al
  hideReports = request.query.hideReports; // Raporları gizle

  startDate = request.query.startDate; // Başlangıç tarihini al
  endDate = request.query.endDate; // Bitiş tarihini al

  personelHareketleri = request.query.personelHareketleri; // Personel Hareket Ekranı için

  try {
    let activityFilter = {
      isVisible: true,
    };

    if (userID) {
      activityFilter.userID = userID;
    }
    
    if (startDate) {
      activityFilter.createdAt = {
        $gte: new Date(startDate),
      };
    }
    if (endDate) {
      activityFilter.createdAt = {
        ...activityFilter.createdAt,
        $lte: new Date(endDate + "T23:59:59.999Z"), // Bitiş tarihini günün sonuna ayarla
      };
    }

    // typeID filtreleri mantık: (filterType OR personelHareketleri) AND app, MINUS hideReports
    let typeIds = null; // null = no typeID filter

    // 1) filterType VEYA personelHareketleri ile BAŞLA (prioritized seçim)
    if (filterType) {
      typeIds = getActivitiesWithFilterTypes(filterType).map(t => t.id);
    } else if (personelHareketleri) {
      typeIds = getActivityWithPersonelHaraketScreen().map(t => t.id);
    }

    // 2) app varsa KESIŞIM al (her iki durumda da)
    if (app) {
      const appIds = getActivitiesWithApp(app).map(t => t.id);
      if (typeIds) {
        typeIds = typeIds.filter(id => appIds.includes(id));
      } else {
        typeIds = appIds;
      }
    }

    // 3) hideReports varsa HARİÇ TUT
    if (hideReports === "true") {
      const reportIds = getReportActivities().map(t => t.id);
      if (typeIds) {
        typeIds = typeIds.filter(id => !reportIds.includes(id));
      } else {
        activityFilter.typeID = { $nin: reportIds };
      }
    }

    // Sonuç typeID filtresini uygula
    if (typeIds) {
      activityFilter.typeID = { $in: typeIds };
    }

    const totalRecords = await Activity.countDocuments(activityFilter); // Toplam kayıt sayısı FİLTRELENEN veriye göre hesapla
    let pageCount = Math.ceil(totalRecords / limit); // Toplam sayfa sayısını hesapla

    // Eğer maxPageCount belirtilmişse ve pageCount'u aşıyorsa, pageCount'u maxPageCount ile sınırla
    if (maxPageCount) {
      maxPageCount = parseInt(maxPageCount);
      if (!isNaN(maxPageCount) && maxPageCount > 0) {
        pageCount = Math.min(pageCount, maxPageCount); // Maksimum sayfa sayısını aşma
      }
    }

    const activities = await Activity.find(activityFilter)
      .populate("userID", "-password -__v -createdDate -createdAt -updatedAt")
      .populate("titleID", "name")
      .populate("unitID", "name")
      .populate("personUnitID", "name")
      .populate("leaveID", "")
      .populate("personID", "sicil ad soyad")
      .select("-__v")
      .skip((page - 1) * limit) // sayfalama için düzeltildi
      .limit(limit) // Her sayfa için limit kadar sonuç getir
      .sort({ createdAt: -1 }); // Yeni aktiviteleri önce getir

    // Her activity içinde dönüp typeID'yi RequestTypeList'ten alınan değerle değiştiriyoruz
    const responseActivities = activities.map((element) => {
      const activityObj = element.toObject(); // Mongoose belgesini düz nesneye çevir
      let type = getActivityWithID(activityObj.typeID); // Type bilgisini bul
      activityObj.type = type; // Yeni 'type' alanını ekle
      delete activityObj.typeID; // Eski 'typeID' alanını sil
      return activityObj; // Yeni nesneyi döndür
    });

    response.json({
      success: true,
      pageCount: pageCount, // Toplam sayfa sayısı
      length: responseActivities.length, // Gelen sonuç sayısı
      activityList: responseActivities, // Dönüştürülmüş aktiviteler
    });
  } catch (error) {
    console.log(error);
    response.status(500).send(Messages.SERVER_ERROR);
  }
});

// get activity with userid
router.get(
  "/:userID",
  auth,
  Logger("GET /activities/"),
  async (request, response) => {
    try {
      let { page = 1, limit = 30, pageSize } = request.query; // Varsayılan değerler: page=1, limit=30
      page = parseInt(page) || 1;
      
      // pageSize parametresi varsa onu kullan, yoksa limit kullan
      limit = pageSize ? parseInt(pageSize) : parseInt(limit) || 30;

      const totalRecords = await Activity.countDocuments({
        userID: request.params.userID,
      });
      const pageCount = Math.ceil(totalRecords / limit);

      const activities = await Activity.find({
        userID: request.params.userID,
      })
        .populate("userID", "-password -__v -createdDate -createdAt -updatedAt")
        .populate("titleID", "name")
        .populate("unitID", "name")
        .populate("personUnitID", "name")
        .populate("leaveID", "")
        .populate("personID", "sicil ad soyad")
        .select("-__v")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Her activity içinde dönüp typeID'yi RequestTypeList'ten alınan değerle değiştiriyoruz
      const responseActivities = activities.map((element) => {
        const activityObj = element.toObject();
        let type = getActivityWithID(activityObj.typeID);
        activityObj.type = type;
        delete activityObj.typeID;
        return activityObj;
      });

      response.json({
        success: true,
        pageCount: pageCount,
        length: responseActivities.length,
        activityList: responseActivities,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send(Messages.SERVER_ERROR);
    }
  }
);



module.exports = router;
