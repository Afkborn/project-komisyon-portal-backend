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

const UnitTypeList = require("../constants/UnitTypeList").UnitTypeList;

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
        "[REPORT][eksikKatipAramasiYapilacakBirimler] Process Time: " +
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
      let personCount = await Person.countDocuments({
        birimID: unit._id,
        kind: "zabitkatibi", // TODO: kind'i ZABİTKATİBİ olarak constant koymak biraz kötü oldu. Düzeltilecek.
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
        "[REPORT][eksikKatibiOlanBirimler] Process Time: " +
        processTime +
        " ms"
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
      let institutionId = request.query.institutionId;
      let startDate = request.query.startDate;
      let endDate = request.query.endDate;

      if (!institutionId) {
        return response.status(400).send({
          success: false,
          message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
        });
      }

      // tüm personelleri getir, ne kadar verimli ilerde anlarız.
      let persons = await Person.find({})
        .populate("title", "-_id -__v -deletable")
        .populate("birimID", "-_id -__v -deletable")
        .populate("izinler", "-__v -personID");

      persons = persons.filter((person) => {
        return person.birimID.institutionID == institutionId;
      });

      // İzinli personelleri filtrele

      // Tarihleri doğru formatta parse et
      let now = new Date();
      let start = startDate ? new Date(startDate) : null;
      let end = endDate ? new Date(endDate) : null;

      let izinliPersonel;
      let izinliPersonelList;

      if (start && end) {
        // Belirli tarihler arasında izinde olan personelleri bul
        izinliPersonel = persons.filter((person) => {
          return person.izinler.some((leave) => {
            return start <= leave.endDate && end >= leave.startDate;
          });
        });

        izinliPersonelList = izinliPersonel.map((person) => ({
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
          birim: person.birimID.name,
          unvan: person.title,
          izinBaslangic: person.izinler.find((leave) => {
            return start <= leave.endDate && end >= leave.startDate;
          }).startDate,
          izinBitis: person.izinler.find((leave) => {
            return start <= leave.endDate && end >= leave.startDate;
          }).endDate,
        }));
      } else {
        // Şu an izinde olan personelleri bul
        izinliPersonel = persons.filter((person) => {
          return person.izinler.some((leave) => {
            return now >= leave.startDate && now <= leave.endDate;
          });
        });

        izinliPersonelList = izinliPersonel.map((person) => ({
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
          birim: person.birimID.name,
          unvan: person.title,
          izinBaslangic: person.izinler.find((leave) => {
            return now >= leave.startDate && now <= leave.endDate;
          }).startDate,
          izinBitis: person.izinler.find((leave) => {
            return now >= leave.startDate && now <= leave.endDate;
          }).endDate,
        }));
      }
      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "[REPORT][izinliPersoneller] Process Time: " +
          processTime +
          " ms"
      );

      response.send({
        success: true,
        izinliPersonelList: izinliPersonelList,
      });
    } catch (error) {
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    }
  }
);

// TODO: işlem yavaş çalışıyor, hızlandır.
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
        return person.birimID.institutionID == institutionId;
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
          });
        } else {
          titlePersonCount.personCount++;
        }
      }

      // birim bazlı personel sayılarınıda bulup ekleyelim. Örneğin 1. ağır ceza mahkemesi 3 gibi
      let unitList = await Unit.find();
      let unitPersonCountList = [];
      for (let i = 0; i < unitList.length; i++) {
        let unit = unitList[i];
        let unitPersonCount = await Person.countDocuments({
          birimID: unit._id,
        });
        unitPersonCountList.push({
          unit: unit.name,
          personCount: unitPersonCount,
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
          "[REPORT][toplamPersonelSayisi] Process Time: " +
          processTime +
          " ms"
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
        if (unitType.tabloMevcutMu && unitType.unitType == queryUnitType ) {
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
          "[REPORT][personelTabloKontrolEdilecekBirimler] Process Time: " +
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
          })
            .populate("title", "-_id -__v -deletable")
            .select(
              "-__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi -birimID -gecmisBirimler"
            );

          unit.personCount = persons.length;
          unit.persons = persons;
        })
      );

      let processEndDate = new Date();
      let processTime = processEndDate - processStartDate;
      console.log(
        getTimeForLog() +
          "[REPORT][personelTablo] Process Time: " +
          processTime +
          " ms"
      );

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

module.exports = router;
