const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const {
  Person,
  Baskan,
  Mubasir,
  UyeHakim,
  YaziİsleriMuduru,
  ZabitKatibi,
} = require("../model/Person");
const auth = require("../middleware/auth");

// get all persons
router.get("/", auth, (request, response) => {
  Person.find()
    .then((persons) => {
      response.send({
        success: true,
        personList: persons,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    });
});

// get a person by sicil
router.get("/:sicil", auth, (request, response) => {
  const sicil = request.params.sicil;

  Person.findOne({ sicil })
    .then((person) => {
      if (!person) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }
      response.send({
        success: true,
        person,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_FOUND,
      });
    });
});

// create a person
router.post("/", auth, (request, response) => {
  const modelMap = {
    Baskan,
    UyeHakim,
    ZabitKatibi,
    YaziİsleriMuduru,
    Mubasir,
  };

  const requiredFields = ["kind", "sicil", "ad", "soyad"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }
  const {
    //  PERSON
    sicil,
    ad,
    soyad,
    goreveBaslamaTarihi,
    kind,
    birimID,
    birimeBaslamaTarihi,
    status,

    //  ZABIT KATİBİ
    durusmaKatibiMi,
  } = request.body;

  const Model = modelMap[kind];
  if (!Model) {
    return response.status(400).send("Invalid kind");
  }

  let newPerson;
  const commonFields = {
    sicil,
    ad,
    soyad,
    goreveBaslamaTarihi,
    birimID,
    birimeBaslamaTarihi,
    status,
  };

  if (kind === "ZabitKatibi") {
    newPerson = new Model({ ...commonFields, durusmaKatibiMi });
  } else {
    newPerson = new Model(commonFields);
  }

  newPerson
    .save()
    .then((data) => {
      response.status(201).send(data);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_SAVED,
      });
    });
});

module.exports = router;
