const Activity = require("../model/Activity");
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

/**
 * Tüm aktiviteleri getir (filtrelenmiş)
 */
async function getAllActivities(request, response) {
  try {
    let { page = 1, limit = 10, pageSize, maxPageCount } = request.query;
    page = parseInt(page) || 1;

    // pageSize parametresi varsa onu kullan, yoksa limit kullan
    limit = pageSize ? parseInt(pageSize) : parseInt(limit) || 10;

    const app = request.query.app;
    const userID = request.query.userID;
    const filterType = request.query.filterType;
    const hideReports = request.query.hideReports;

    const startDate = request.query.startDate;
    const endDate = request.query.endDate;

    const personelHareketleri = request.query.personelHareketleri;

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
        $lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    // typeID filtreleri mantık: (filterType OR personelHareketleri) AND app, MINUS hideReports
    let typeIds = null;

    // 1) filterType VEYA personelHareketleri ile BAŞLA
    if (filterType) {
      typeIds = getActivitiesWithFilterTypes(filterType).map((t) => t.id);
    } else if (personelHareketleri) {
      typeIds = getActivityWithPersonelHaraketScreen().map((t) => t.id);
    }

    // 2) app varsa KESIŞIM al
    if (app) {
      const appIds = getActivitiesWithApp(app).map((t) => t.id);
      if (typeIds) {
        typeIds = typeIds.filter((id) => appIds.includes(id));
      } else {
        typeIds = appIds;
      }
    }

    // 3) hideReports varsa HARİÇ TUT
    if (hideReports === "true") {
      const reportIds = getReportActivities().map((t) => t.id);
      if (typeIds) {
        typeIds = typeIds.filter((id) => !reportIds.includes(id));
      } else {
        activityFilter.typeID = { $nin: reportIds };
      }
    }

    // Sonuç typeID filtresini uygula
    if (typeIds) {
      activityFilter.typeID = { $in: typeIds };
    }

    const totalRecords = await Activity.countDocuments(activityFilter);
    let pageCount = Math.ceil(totalRecords / limit);

    // Eğer maxPageCount belirtilmişse ve pageCount'u aşıyorsa, sınırla
    if (maxPageCount) {
      maxPageCount = parseInt(maxPageCount);
      if (!isNaN(maxPageCount) && maxPageCount > 0) {
        pageCount = Math.min(pageCount, maxPageCount);
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
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Her activity içinde typeID'yi RequestTypeList'ten alınan değerle değiştir
    const responseActivities = activities.map((element) => {
      const activityObj = element.toObject();
      let type = getActivityWithID(activityObj.typeID);
      activityObj.type = type;
      delete activityObj.typeID;
      return activityObj;
    });

    return response.json({
      success: true,
      pageCount: pageCount,
      length: responseActivities.length,
      activityList: responseActivities,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send({
      success: false,
      message: error.message || "SERVER_ERROR",
    });
  }
}

/**
 * Belirtilen kullanıcının aktivitelerini getir
 */
async function getActivitiesByUserId(request, response) {
  try {
    let { page = 1, limit = 30, pageSize } = request.query;
    page = parseInt(page) || 1;

    // pageSize parametresi varsa onu kullan, yoksa limit kullan
    limit = pageSize ? parseInt(pageSize) : parseInt(limit) || 30;

    const userID = request.params.userID;

    const totalRecords = await Activity.countDocuments({
      userID: userID,
    });
    const pageCount = Math.ceil(totalRecords / limit);

    const activities = await Activity.find({
      userID: userID,
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

    // Her activity içinde typeID'yi RequestTypeList'ten alınan değerle değiştir
    const responseActivities = activities.map((element) => {
      const activityObj = element.toObject();
      let type = getActivityWithID(activityObj.typeID);
      activityObj.type = type;
      delete activityObj.typeID;
      return activityObj;
    });

    return response.json({
      success: true,
      pageCount: pageCount,
      length: responseActivities.length,
      activityList: responseActivities,
    });
  } catch (error) {
    console.log(error);
    return response.status(500).send({
      success: false,
      message: error.message || "SERVER_ERROR",
    });
  }
}

module.exports = {
  getAllActivities,
  getActivitiesByUserId,
  getReportActivities,
};
