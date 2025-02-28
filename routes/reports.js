const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person } = require("../model/Person");
const Title = require("../model/Title");
const { ObjectId } = require("mongodb");
const Unit = require("../model/Unit");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const getTimeForLog = require("../common/time");
require("dotenv/config");
const cacheDuration =
  process.env.CACHE_DURATION_IN_SECONDS * 1000 || 1 * 60 * 1000; // eğer .env dosyasında CACHE_DURATION_IN_SECONDS yoksa 1 dakika yap
let cacheEnabled = process.env.CACHE_ENABLED == "true";

const UnitTypeList = require("../constants/UnitTypeList").UnitTypeList;

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

const { getUnitTypeByUnitTypeId } = require("../actions/UnitTypeActions");

const {
  getInstitutionListByID,
  filterInfazKorumaTitleChartVisibleInstitutions,
} = require("../actions/InstitutionActions");
// acele isler
const {
  getUrgentExpiringTemporaryPersonnel,
  getUrgentExpiringLeaves,
  getUrgentExpiringSuspensions,
} = require("../actions/RushJobActions");

// eksikKatipAramasiYapilacakBirimler
router.get(
  "/eksikKatipAramasiYapilacakBirimler",
  auth,
  Logger("GET /eksikKatipAramasiYapilacakBirimler"),
  async (request, response) => {
    let institutionId = request.query.institutionId;
    if (!institutionId) {
      return response.status(400).send({
        success: false,
        message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      });
    }

    let processStartDate = new Date();

    let eksikKatipKontrolEdilecekBirimTipleri = [];
    UnitTypeList.forEach((unitType) => {
      if (unitType.eksikKatipKontrol) {
        eksikKatipKontrolEdilecekBirimTipleri.push(unitType.id);
      }
    });

    let eksikKatipKontrolEdilecekBirimler = await Unit.find({
      unitTypeID: { $in: eksikKatipKontrolEdilecekBirimTipleri },
      institutionID: institutionId,
    });

    eksikKatipKontrolEdilecekBirimler = eksikKatipKontrolEdilecekBirimler.map(
      (unit) => {
        return {
          birimAdi: unit.name,
          gerekenKatipSayisi: unit.minClertCount,
          oncelikSirasi: unit.oncelikSirasi,
        };
      }
    );

    let processEndDate = new Date();
    let processTime = processEndDate - processStartDate;
    console.log(
      getTimeForLog() +
        "USER " +
        request.user.username +
        " [REPORT][eksikKatipAramasiYapilacakBirimler] Process Time: " +
        processTime +
        " ms"
    );

    response.send({
      success: true,
      eksikKatipKontrolEdilecekBirimler: eksikKatipKontrolEdilecekBirimler,
    });
  }
);

// eksikKatibiOlanBirimler
router.get(
  "/eksikKatibiOlanBirimler",
  auth,
  Logger("GET /eksikKatibiOlanBirimler"),
  async (request, response) => {
    let processStartDate = new Date();
    let institutionId = request.query.institutionId;
    if (!institutionId) {
      return response.status(400).send({
        success: false,
        message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      });
    }

    let eksikKatipKontrolEdilecekBirimTipleri = [];
    UnitTypeList.forEach((unitType) => {
      if (unitType.eksikKatipKontrol) {
        eksikKatipKontrolEdilecekBirimTipleri.push(unitType.id);
      }
    });

    let eksikKatipKontrolEdilecekBirimler = await Unit.find({
      unitTypeID: { $in: eksikKatipKontrolEdilecekBirimTipleri },
      institutionID: institutionId,
    });

    let eksikKatipOlanBirimler = [];
    for (let i = 0; i < eksikKatipKontrolEdilecekBirimler.length; i++) {
      let unit = eksikKatipKontrolEdilecekBirimler[i];
      let personCount = 0;
      // aktif zabit katibi sayısını bul
      personCount += await Person.countDocuments({
        birimID: unit._id,
        status: true,
        kind: "zabitkatibi", // TODO: kind'i ZABİTKATİBİ olarak constant koymak biraz kötü oldu. Düzeltilecek.
      });

      // gecici birimi olan personelleri de ekle
      personCount += await Person.countDocuments({
        temporaryBirimID: unit._id,
        isTemporary: true,
        status: true,
        kind: "zabitkatibi",
      });

      if (personCount < unit.minClertCount) {
        eksikKatipOlanBirimler.push({
          _id: unit._id,
          birimAdi: unit.name,
          gerekenKatipSayisi: unit.minClertCount,
          mevcutKatipSayisi: personCount,
          eksikKatipSayisi: unit.minClertCount - personCount,
        });
      }
    }
    let processEndDate = new Date();
    let processTime = processEndDate - processStartDate;
    console.log(
      getTimeForLog() +
        "USER " +
        request.user.username +
        " [REPORT][eksikKatibiOlanBirimler] Process Time: " +
        processTime +
        " ms"
    );

    recordActivity(
      request.user.id,
      RequestTypeList.REPORT_EKSIKKATIPOLANBIRIMLER
    );

    response.send({
      success: true,
      eksikKatipOlanBirimler: eksikKatipOlanBirimler,
    });
  }
);

// izinliPersoneller
router.get(
  "/izinliPersoneller",
  auth,
  Logger("GET /izinliPersoneller"),
  async (request, response) => {
    try {
      let processStartDate = new Date();

      // let institutionId = request.query.institutionId;
      let startDate = request.query.startDate;
      let endDate = request.query.endDate;
      let reason = request.query.reason;

      // if (!institutionId) {
      //   return response.status(400).send({
      //     success: false,
      //     message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      //   });
      // }
      // { institutionID: institutionId }
      let units = await Unit.find();

      let persons = await Person.find({
        status: true,
        birimID: { $in: units.map((unit) => unit._id) },
      })
        .populate("title", "-_id -__v -deletable")
        .populate("birimID", "-_id -__v -deletable")
        .populate("temporaryBirimID", "-_id -__v -deletable")
        .populate("izinler", "-__v -personID");

      // Tarihleri doğru formatta parse et
      let now = new Date();
      let start = startDate ? new Date(startDate) : null;
      let end = endDate ? new Date(endDate) : null;

      let izinliPersonel;
      let izinliPersonelList;

      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        // Belirli tarihler arasında izinde olan personelleri bul
        izinliPersonel = persons.filter((person) => {
          return person.izinler.some((leave) => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            return (
              startDate <= leaveEnd &&
              endDate >= leaveStart &&
              (!reason || leave.reason === reason)
            );
          });
        });
      } else {
        // Şu an izinde olan personelleri bul
        izinliPersonel = persons.filter((person) => {
          return person.izinler.some((leave) => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            return (
              leaveStart <= now &&
              now <= leaveEnd &&
              (!reason || leave.reason === reason)
            );
          });
        });
      }

      izinliPersonelList = izinliPersonel.map((person) => {
        const currentLeave = person.izinler.find((leave) => {
          return now >= leave.startDate && now <= leave.endDate;
        });

        return {
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
          birim: person.birimID.name,
          unvan: person.title,
          isTemporary: person.isTemporary,
          izinBaslangic: currentLeave ? currentLeave.startDate : null,
          izinBitis: currentLeave ? currentLeave.endDate : null,
          izinTur: currentLeave ? currentLeave.reason : null,
        };
      });

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][izinliPersoneller] Process Time: " +
          processTime +
          " ms"
      );

      recordActivity(request.user.id, RequestTypeList.REPORT_IZINLIPERSONELLER);

      response.send({
        success: true,
        izinliPersonelList: izinliPersonelList,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// geciciPersonel hesaba katılmıyor.
// toplamPersonelSayisi
router.get(
  "/toplamPersonelSayisi",
  auth,
  Logger("GET /toplamPersonelSayisi"),
  async (request, response) => {
    try {
      let processStartDate = new Date();
      let institutionId = request.query.institutionId;

      if (!institutionId) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
        });
      }

      let persons = await Person.find({}).populate("birimID");

      persons = persons.filter((person) => {
        // BİRİM ID'si olmayan personel varsa onları filtreliyoruz.
        if (!person.birimID) {
          return false;
        }
        return person.birimID.institutionID == institutionId && person.status;
      });
      let personCount = persons.length;

      // persons içinde dönüp title sayılarını bulalım, örneğin zaıbt 3, mübaşir 5 gibi

      let titleList = await Title.find();

      let titlePersonCountList = [];
      for (let i = 0; i < persons.length; i++) {
        let person = persons[i];
        // person.title'ı ObjectId'ye dönüştür
        let title = titleList.find((title) =>
          title._id.equals(new ObjectId(person.title))
        );

        if (!title) {
          continue;
        }

        let titlePersonCount = titlePersonCountList.find(
          (titlePersonCount) => titlePersonCount.title == title.name
        );

        if (!titlePersonCount) {
          titlePersonCountList.push({
            title: title.name,
            personCount: 1,
            oncelikSirasi: title.oncelikSirasi,
          });
        } else {
          titlePersonCount.personCount++;
        }
      }

      // titlePersonCountList'u title.oncelikSriasi ile sırala
      titlePersonCountList.sort((a, b) => {
        return a.oncelikSirasi - b.oncelikSirasi;
      });

      // birim bazlı personel sayılarınıda bulup ekleyelim. Örneğin 1. ağır ceza mahkemesi 3 gibi
      let unitList = await Unit.find({
        institutionID: institutionId,
      });

      unitList = unitList.map((unit) => {
        const unitType = getUnitTypeByUnitTypeId(unit.unitTypeID);
        return { ...unit._doc, unitType };
      });

      // unitList'i unitType.oncelikSirasina göre sort et
      unitList.sort((a, b) => {
        if (a.unitType.oncelikSirasi !== b.unitType.oncelikSirasi) {
          return a.unitType.oncelikSirasi - b.unitType.oncelikSirasi;
        }
        return a.series - b.series;
      });

      let unitPersonCountList = [];
      for (let i = 0; i < unitList.length; i++) {
        let unit = unitList[i];
        let unitPersons = await Person.find({
          birimID: unit._id,
        });

        // şimdide bu birimdeki personellerin ünvanlarını bulup ekleyelim
        let unitTitlePersonCountList = [];
        for (let j = 0; j < unitPersons.length; j++) {
          let unitPerson = unitPersons[j];
          let title = titleList.find((title) =>
            title._id.equals(new ObjectId(unitPerson.title))
          );

          if (!title) {
            continue;
          }

          let unitTitlePersonCount = unitTitlePersonCountList.find(
            (unitTitlePersonCount) => unitTitlePersonCount.title == title.name
          );

          if (!unitTitlePersonCount) {
            unitTitlePersonCountList.push({
              title: title.name,
              personCount: 1,
              oncelikSirasi: title.oncelikSirasi,
            });
          } else {
            unitTitlePersonCount.personCount++;
          }
        }
        unitTitlePersonCountList.sort((a, b) => {
          return a.oncelikSirasi - b.oncelikSirasi;
        });
        unitPersonCountList.push({
          unit: unit.name,
          personCount: unitPersons.length,
          titlePersonCountList: unitTitlePersonCountList,
        });
      }

      // eğer personCount 0 ise sil
      unitPersonCountList = unitPersonCountList.filter(
        (unitPersonCount) => unitPersonCount.personCount > 0
      );

      //unittypelist içinde dönüp unit sayılarını bulalım, örneğin Ağır Ceza 20, Asliye Hukuk 30 gibi
      let unitTypePersonCountList = [];
      for (let i = 0; i < persons.length; i++) {
        let person = persons[i];
        let unit = unitList.find((unit) =>
          unit._id.equals(new ObjectId(person.birimID))
        );

        if (!unit) {
          continue;
        }

        let unitType = UnitTypeList.find(
          (unitType) => unitType.id == unit.unitTypeID
        );

        if (!unitType) {
          continue;
        }

        let unitTypePersonCount = unitTypePersonCountList.find(
          (unitTypePersonCount) => unitTypePersonCount.unitType == unitType.name
        );

        if (!unitTypePersonCount) {
          unitTypePersonCountList.push({
            unitType: unitType.name,
            personCount: 1,
          });
        } else {
          unitTypePersonCount.personCount++;
          // console.log(unitTypePersonCount);
        }
      }

      // EĞER unitType içindeki personCount 0 ise sil
      // unitTypePersonCountList = unitTypePersonCountList.filter(
      //   (unitTypePersonCount) => unitTypePersonCount.personCount > 0
      // );

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][toplamPersonelSayisi] Process Time: " +
          processTime +
          " ms"
      );

      recordActivity(
        request.user.id,
        RequestTypeList.REPORT_TOPLAMPERSONELSAYISI
      );

      response.send({
        success: true,
        personCount: personCount,
        titlePersonCountList: titlePersonCountList,
        unitPersonCountList: unitPersonCountList,
        unitTypePersonCountList: unitTypePersonCountList,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// personelTabloKontrolEdilecekBirimler
router.get(
  "/personelTabloKontrolEdilecekBirimler",
  auth,
  Logger("GET /personelTabloKontrolEdilecekBirimler"),
  async (request, response) => {
    try {
      let processStartDate = new Date();
      let institutionId = request.query.institutionId;
      let queryUnitType = request.query.queryUnitType;

      if (!institutionId || !queryUnitType) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID veya Kurum Tipi ${Messages.REQUIRED_FIELD}`,
        });
      }

      let kontrolEdilecekBirimTipList = [];
      let tabloKontrolEdecekBirimTipleri = [];

      // tabloMevcutMu olan birim tiplerini topla
      UnitTypeList.forEach((unitType) => {
        if (unitType.tabloMevcutMu && unitType.unitType == queryUnitType) {
          tabloKontrolEdecekBirimTipleri.push(unitType.id);
          kontrolEdilecekBirimTipList.push(unitType);
        }
      });

      let kontrolEdilecekBirimlerList = await Unit.find({
        unitTypeID: { $in: tabloKontrolEdecekBirimTipleri },
        institutionID: institutionId,
      }).select(
        "-_id -__v -deletable -institutionID -createdDate -minClertCount"
      );

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][personelTabloKontrolEdilecekBirimler] Process Time: " +
          processTime +
          " ms"
      );

      response.send({
        success: true,
        unitTypeList: kontrolEdilecekBirimTipList,
        unitList: kontrolEdilecekBirimlerList,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// personelTablo
router.get(
  "/personelTablo",
  auth,
  Logger("GET /personelTablo"),
  async (request, response) => {
    try {
      let processStartDate = new Date();
      let institutionId = request.query.institutionId;
      let queryUnitType = request.query.queryUnitType;

      if (!institutionId || !queryUnitType) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID veya Kurum Tipi ${Messages.REQUIRED_FIELD}`,
        });
      }

      let kontrolEdilecekBirimTipleri = [];

      // tabloMevcutMu olan birim tiplerini topla
      UnitTypeList.forEach((unitType) => {
        if (unitType.tabloMevcutMu && unitType.unitType == queryUnitType) {
          kontrolEdilecekBirimTipleri.push(unitType.id);
        }
      });

      // Birimlerin listesini lean() kullanarak düz JS nesnesine dönüştür
      let kontrolEdilecekBirimler = await Unit.find({
        unitTypeID: { $in: kontrolEdilecekBirimTipleri },
        institutionID: institutionId,
      }).lean();

      // kontrolEdilecekBirimler listesindeki her bir birimi önce unitTypeID'sini unitTypeList'ten bul oncelik sırasına göre sırala, daha sonra
      // her bir birimi series'e göre sırala
      kontrolEdilecekBirimler.sort((a, b) => {
        return a.oncelikSirasi - b.oncelikSirasi;
      });

      kontrolEdilecekBirimler.sort((a, b) => {
        return a.series - b.series;
      });

      // Birimlere çalışanları ekle
      await Promise.all(
        kontrolEdilecekBirimler.map(async (unit) => {
          // person objesinin goreveBaslamaTarihi, birimID, birimeBaslamaTarihi, gecmisBirimler, izinler, calistigiKisi alanlarını getirme

          let persons = await Person.find({
            birimID: unit._id,
            status: true,
          })
            .populate("title", "-_id -__v -deletable")
            .populate("izinler", "-__v -personID")
            .select(
              "-__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi -birimID -gecmisBirimler"
            );

          // örneğin bir müdür 2 birime bakabiliyor, 2 birime bakan müdürlerde ikinciBirimID alanı var
          let sorumluMudur = await Person.find({
            kind: "yaziislerimudürü",
            ikinciBirimID: unit._id,
            status: true,
          })
            .populate("title", "-_id -__v -deletable")
            .populate("izinler", "-__v -personID")
            .select(
              "-__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi -birimID -gecmisBirimler"
            );

          if (sorumluMudur.length > 0) {
            persons = persons.concat(sorumluMudur);
          }

          // örneğin bir mübaşir 2 birime bakabiliyor, 2 birime bakan mübaşirlerde ikinciBirimID alanı var
          let sorumluMubasir = await Person.find({
            kind: "mubasir",
            ikinciBirimID: unit._id,
            status: true,
          })
            .populate("title", "-_id -__v -deletable")
            .populate("izinler", "-__v -personID")
            .select(
              "-__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi -birimID -gecmisBirimler"
            );

          if (sorumluMubasir.length > 0) {
            persons = persons.concat(sorumluMubasir);
          }

          // geçici personel olabiliyor.
          let geciciPersonel = await Person.find({
            temporaryBirimID: unit._id,
            isTemporary: true,
            status: true,
          })
            .populate("title", "-_id -__v -deletable")
            .populate("izinler", "-__v -personID")
            .select(
              "-__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi -birimID -gecmisBirimler"
            );

          if (geciciPersonel.length > 0) {
            persons = persons.concat(geciciPersonel);
          }

          unit.personCount = persons.length;
          unit.persons = persons;
        })
      );

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][personelTablo] Process Time: " +
          processTime +
          " ms"
      );

      recordActivity(request.user.id, RequestTypeList.REPORT_PERSONELTABLO);

      response.send({
        success: true,
        personelTablo: kontrolEdilecekBirimler,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// geciciPersonel hesaba katılmıyor.
// mahkeme ve savcılık katip sayısını dön
// ünvan bazlı personel sayısını dön
// bu işlem yaklaşık 100 ms sürüyor ancak sayfa her yenilendiğpinde tekrar ediyor. bundan dolayı cacheleme deneyelim.
let cachedChartReportData = null;
let lastChartDataCacheTime = 0;
let lastCacheInstitutionId = null;
router.get(
  "/chartData",
  auth,
  Logger("GET /mahkemeSavcilikKatipSayisi"),
  async (request, response) => {
    try {
      const currentTime = Date.now();
      let processStartDate = new Date();
      let institutionId = request.query.institutionId;

      if (!institutionId) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
        });
      }

      if (
        cacheEnabled &&
        cachedChartReportData &&
        currentTime - lastChartDataCacheTime < cacheDuration &&
        lastCacheInstitutionId == institutionId
      ) {
        let processEndDate = new Date();
        let processTime = processEndDate - processStartDate;
        console.log(
          getTimeForLog() +
            "USER " +
            request.user.username +
            " [CACHE][REPORT][mahkemeSavcilikKatipSayisi] Process Time: " +
            processTime +
            " ms"
        );
        return response.send(cachedChartReportData);
      }

      // get institution

      let institution = getInstitutionListByID(institutionId);
      if (institution.katipTitleChartVisible == false) {
        return response.status(400).send({
          success: false,
          katipTitleChartVisible: false,
          message: `Bu kurumda katip ve ünvan için tablo bulunmamaktadır.`,
        });
      }

      let units = await Unit.find({ institutionID: institutionId });

      // Process units to get institutionTypeId
      units = units.map((unit) => {
        unit = unit.toObject();
        let unitType = UnitTypeList.find(
          (unitType) => unitType.id == unit.unitTypeID
        );
        unit.institutionTypeId = unitType.institutionTypeId;
        return unit;
      });

      let mahkemeKatipSayisi = 0;
      let savcilikKatipSayisi = 0;
      let digerKatipSayisi = 0;

      // Use Promise.all to handle async countDocuments
      await Promise.all(
        units.map(async (unit) => {
          let zabitKatibiCount = await Person.countDocuments({
            birimID: unit._id,
            kind: "zabitkatibi",
            status: true,
          });

          if (unit.institutionTypeId == 0) {
            mahkemeKatipSayisi += zabitKatibiCount;
          } else if (unit.institutionTypeId == 1) {
            savcilikKatipSayisi += zabitKatibiCount;
          } else {
            digerKatipSayisi += zabitKatibiCount;
          }
        })
      );

      // ünvan bazında personelleri getirelim
      // getirilecek ünvanlar zabit katibi, mübaşir, yazı işleri müdürü
      let totalZabitKatibiSayisi = 0;
      let totalMubasirSayisi = 0;
      let totalYazıIsleriMuduruSayisi = 0;

      await Promise.all(
        units.map(async (unit) => {
          let zabitKatibiCount = await Person.countDocuments({
            birimID: unit._id,
            kind: "zabitkatibi",
            status: true,
          });

          let mubasirCount = await Person.countDocuments({
            birimID: unit._id,
            kind: "mubasir",
            status: true,
          });

          let yazıIsleriMuduruCount = await Person.countDocuments({
            birimID: unit._id,
            kind: "yaziislerimudürü",
            status: true,
          });

          totalZabitKatibiSayisi += zabitKatibiCount;
          totalMubasirSayisi += mubasirCount;
          totalYazıIsleriMuduruSayisi += yazıIsleriMuduruCount;
        })
      );

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][izinliPersoneller] Process Time: " +
          processTime +
          " ms"
      );

      // recordActivity(
      //   request.user.id,
      //   RequestTypeList.REPORT_MAHKEMESAVCILIKKATIP
      // );

      let katipPieChartData = [
        { title: "Mahkeme", value: mahkemeKatipSayisi, color: "#ad1313" },
        { title: "Savcılık", value: savcilikKatipSayisi, color: "#72ad13" },
        { title: "Diğer", value: digerKatipSayisi, color: "#4287f5" },
      ];
      let unvanPieChartData = [
        {
          title: "Zabit Katibi",
          value: totalZabitKatibiSayisi,
          color: "#ad1313",
        },
        { title: "Mübaşir", value: totalMubasirSayisi, color: "#72ad13" },
        {
          title: "Yazı İşleri Müdürü",
          value: totalYazıIsleriMuduruSayisi,
          color: "#4287f5",
        },
      ];
      lastCacheInstitutionId = institutionId;
      lastChartDataCacheTime = currentTime;
      cachedChartReportData = {
        success: true,
        katipPieChartData: katipPieChartData,
        unvanPieChartData: unvanPieChartData,
      };

      response.send({
        success: true,
        katipPieChartData: katipPieChartData,
        unvanPieChartData: unvanPieChartData,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// infaz korumalar için infaz koruma memur sayısını dön
router.get(
  "/infazKorumaMemurSayisi",
  auth,
  Logger("GET /mahkemeSavcilikKatipSayisi"),
  async (request, response) => {
    let processStartDate = new Date();
    let institutionId = request.query.institutionId;

    if (!institutionId) {
      return response.status(400).send({
        success: false,
        message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      });
    }

    // get institutio
    let institution = getInstitutionListByID(institutionId);

    if (institution.infazKorumaTitleChartVisible == false) {
      return response.status(400).send({
        success: false,
        infazKorumaTitleChartVisible: false,
        message: `Bu kurumda infaz koruma ve infaz baş koruma memurları için tablo bulunmamaktadır.`,
      });
    }

    let institutions = filterInfazKorumaTitleChartVisibleInstitutions();

    let infazKorumaSayi = [];

    await Promise.all(
      institutions.map(async (institution) => {
        let units = await Unit.find({ institutionID: institution.id });
        let infazKorumaMemurSayisi = 0;
        let infazKorumaBasMemurSayisi = 0;
        await Promise.all(
          units.map(async (unit) => {
            let infazKorumaMemurCount = await Person.countDocuments({
              birimID: unit._id,
              kind: "infazvekorumamemuru",
              status: true,
            });

            let infazKorumaBasMemurCount = await Person.countDocuments({
              birimID: unit._id,
              kind: "infazvekorumabasmemuru",
              status: true,
            });

            infazKorumaMemurSayisi += infazKorumaMemurCount;
            infazKorumaBasMemurSayisi += infazKorumaBasMemurCount;
          })
        );

        infazKorumaSayi.push({
          institutionName: institution.name,
          infazKorumaMemurSayisi: infazKorumaMemurSayisi,
          infazKorumaBasMemurSayisi: infazKorumaBasMemurSayisi,
        });
      })
    );

    // sort infazKorumaTable by institutionName
    infazKorumaSayi.sort((a, b) => {
      return a.institutionName.localeCompare(b.institutionName);
    });

    let processEndDate = new Date();
    let processTime = processEndDate - processStartDate;

    response.send({
      success: true,
      infazKorumaTable: infazKorumaSayi,
    });

    console.log(
      getTimeForLog() +
        "USER " +
        request.user.username +
        " [REPORT][infazKorumaMemurSayisi] Process Time: " +
        processTime +
        " ms"
    );
  }
);

// acele işler
// TODO: geciciPersonel ve kurumID durumunu değerlendir.
let cachedUrgentJobsData = null;
let lastUrgentJobsCacheTime = 0;
let lastUrgentJobsInstitutionId = null;
router.get(
  "/urgentJobs",
  auth,
  Logger("GET /urgentJobs"),
  async (request, response) => {
    try {
      const currentTime = Date.now();
      let processStartDate = new Date();
      let institutionId = request.query.institutionId;

      if (!institutionId) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
        });
      }

      if (
        cacheEnabled &&
        cachedUrgentJobsData &&
        currentTime - lastUrgentJobsCacheTime < cacheDuration &&
        lastUrgentJobsInstitutionId == institutionId
      ) {
        let processEndDate = new Date();
        let processTime = processEndDate - processStartDate;
        console.log(
          getTimeForLog() +
            "USER " +
            request.user.username +
            " [CACHE][REPORT][urgentjobs] Process Time: " +
            processTime +
            " ms"
        );
        return response.send(cachedUrgentJobsData);
      }

      let units = await Unit.find({ institutionID: institutionId });
      let urgentJobs = [];

      // Tüm acil işleri topla
      let expiringTemporaryPersonel = await getUrgentExpiringTemporaryPersonnel(
        units,
        14
      );
      expiringTemporaryPersonel.forEach((person) => {
        urgentJobs.push({
          urgentJobType: "Geçici Personel Karar Süresi",
          urgentJobEndDate: new Date(person.temporaryEndDate), // Date objesine çevir
          urgentJobDetail: person.temporaryReason,
          personID: person._id,
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
        });
      });

      let expiringLeavePersonel = await getUrgentExpiringLeaves(units, 14);
      expiringLeavePersonel.forEach((person) => {
        const currentLeave = person.izinler.find((leave) => {
          return new Date() >= leave.startDate && new Date() <= leave.endDate;
        });

        if (currentLeave) {
          urgentJobs.push({
            urgentJobType: "İzin Bitiş Süresi",
            urgentJobEndDate: new Date(currentLeave.endDate), // Date objesine çevir
            urgentJobDetail: currentLeave.izinNedeni,
            personID: person._id,
            sicil: person.sicil,
            ad: person.ad,
            soyad: person.soyad,
          });
        }
      });

      let expiringSuspensionPersonel = await getUrgentExpiringSuspensions(
        units,
        14
      );
      expiringSuspensionPersonel.forEach((person) => {
        urgentJobs.push({
          urgentJobType: "Uzaklaştırma Bitiş Süresi",
          urgentJobEndDate: new Date(person.suspensionEndDate), // Date objesine çevir
          urgentJobDetail: person.suspensionReason,
          personID: person._id,
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
        });
      });

      // Bitiş tarihine göre sırala (yakın tarihler önce)
      urgentJobs.sort((a, b) => a.urgentJobEndDate - b.urgentJobEndDate);

      let processEndDate = new Date();
      lastUrgentJobsCacheTime = currentTime;
      lastUrgentJobsInstitutionId = institutionId;
      cachedUrgentJobsData = {
        success: true,
        urgentJobs: urgentJobs,
      };
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "USER " +
          request.user.username +
          " [REPORT][urgentjobs] Process Time: " +
          processTime +
          " ms"
      );

      response.send({
        success: true,
        urgentJobs,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// Rapor endpointleri burada eklenir
router.get("/personnel-count", async (req, res) => {
  try {
    const count = await Person.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: Messages.ERROR });
  }
});

module.exports = router;
