const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person } = require("../model/Person");
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
    let processStartDate = new Date();

    let eksikKatipKontrolEdilecekBirimTipleri = [];
    UnitTypeList.forEach((unitType) => {
      if (unitType.eksikKatipKontrol) {
        eksikKatipKontrolEdilecekBirimTipleri.push(unitType.id);
      }
    });

    let eksikKatipKontrolEdilecekBirimler = await Unit.find({
      unitTypeID: { $in: eksikKatipKontrolEdilecekBirimTipleri },
    });

    eksikKatipKontrolEdilecekBirimler = eksikKatipKontrolEdilecekBirimler.map(
      (unit) => {
        return {
          birimAdi: unit.name,
          gerekenKatipSayisi: unit.minClertCount,
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

    let eksikKatipKontrolEdilecekBirimTipleri = [];
    UnitTypeList.forEach((unitType) => {
      if (unitType.eksikKatipKontrol) {
        eksikKatipKontrolEdilecekBirimTipleri.push(unitType.id);
      }
    });

    let eksikKatipKontrolEdilecekBirimler = await Unit.find({
      unitTypeID: { $in: eksikKatipKontrolEdilecekBirimTipleri },
    });

    let eksikKatipOlanBirimler = [];
    for (let i = 0; i < eksikKatipKontrolEdilecekBirimler.length; i++) {
      let unit = eksikKatipKontrolEdilecekBirimler[i];
      let personCount = await Person.countDocuments({
        birimID: unit._id,
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

module.exports = router;
