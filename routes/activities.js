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
  getActivityWithPersonelHaraketScreen
} = require("../actions/ActivityActions");




// get last activities
router.get("/", auth, Logger("GET /activities/"), async (request, response) => {
  let { page = 1, limit = 10, maxPageCount } = request.query; // Varsayılan değerleri veriyoruz
  page = parseInt(page) || 1; // Geçerli bir sayfa numarası değilse, 1 olarak al
  limit = parseInt(limit) || 10; // Geçerli bir limit numarası değilse, 10 olarak al

  userID = request.query.userID; // Kullanıcı ID'sini al
  filterType = request.query.filterType; // Filtre tipini al

  startDate = request.query.startDate; // Başlangıç tarihini al
  endDate = request.query.endDate; // Bitiş tarihini al

  personelHareketleri = request.query.personelHareketleri; // Personel Hareket Ekranı için

  try {
    const totalRecords = await Activity.countDocuments(); // Toplam kayıt sayısı
    let pageCount = Math.ceil(totalRecords / limit); // Toplam sayfa sayısını hesapla

    // Eğer maxPageCount belirtilmişse ve pageCount'u aşıyorsa, pageCount'u maxPageCount ile sınırla
    if (maxPageCount) {
      maxPageCount = parseInt(maxPageCount);
      if (!isNaN(maxPageCount) && maxPageCount > 0) {
        pageCount = Math.min(pageCount, maxPageCount); // Maksimum sayfa sayısını aşma
      }
    }

    let activityFilter = {
      isVisible: true,
    };
    if (userID) {
      activityFilter.userID = userID;
    }
    if (filterType) {
      // get all activities with type
      let activityType = getActivitiesWithFilterTypes(filterType);
      activityFilter.typeID = { $in: activityType.map((type) => type.id) };
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

    if (personelHareketleri) {
      let activityType = getActivityWithPersonelHaraketScreen(filterType);
      activityFilter.typeID = { $in: activityType.map((type) => type.id) };
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
      const activities = await Activity.find({
        userID: request.params.userID,
      })
        .populate("userID", "-password -__v -createdDate -createdAt -updatedAt")
        .populate("titleID", "name")
        .populate("unitID", "name")
        .populate("personUnitID", "name")
        .populate("leaveID", "")
        .populate("personID", "sicil ad soyad")
        .select("-__v");

      // Her activity içinde dönüp typeID'yi RequestTypeList'ten alınan değerle değiştiriyoruz
      const responseActivities = activities.map((element) => {
        const activityObj = element.toObject(); // Mongoose belgesini düz nesneye çevir
        let type = getActivityWithID(activityObj.typeID);
        activityObj.type = type; // Yeni 'type' alanını ekle
        delete activityObj.typeID; // Eski 'typeID' alanını sil
        return activityObj; // Yeni nesneyi döndür
      });

      response.json({
        success: true,
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
