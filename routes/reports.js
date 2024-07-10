const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person } = require("../model/Person");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

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
      console.log(persons);
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
          unvan: person.title.name,
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
          unvan: person.title.name,
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
      console.log("Process Time: " + processTime + " ms");

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
