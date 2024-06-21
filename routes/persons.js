const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person, zabitkatibi } = require("../model/Person");
const Title = require("../model/Title");
const auth = require("../middleware/auth");

// get all persons
// router.get("/", auth, (request, response) => {
//   Person.find()
//     .then((persons) => {
//       response.send({
//         success: true,
//         personList: persons,
//       });
//     })
//     .catch((error) => {
//       response.status(500).send({
//         message: error.message || Messages.PERSONS_NOT_FOUND,
//       });
//     });
// });

// get a person by sicil
// router.get("/:sicil", auth, (request, response) => {
//   const sicil = request.params.sicil;

//   Person.findOne({ sicil })
//     .then((person) => {
//       if (!person) {
//         return response.status(404).send({
//           success: false,
//           message: Messages.PERSON_NOT_FOUND,
//         });
//       }
//       response.send({
//         success: true,
//         person,
//       });
//     })
//     .catch((error) => {
//       response.status(500).send({
//         message: error.message || Messages.PERSON_NOT_FOUND,
//       });
//     });
// });

// get a persons by birimID
router.get("/:birimID", auth, (request, response) => {
  const birimID = request.params.birimID;
  // get all persons by birimID with title , without kind
  Person.find({ birimID })
    // get title without _id -v
    .populate("title", "-_id -__v -deletable")
    .select("-kind")
    .then((persons) => {
      if (!persons) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }
      response.send({
        success: true,
        persons,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_FOUND,
      });
    });
});

// create a person
router.post("/", auth, async (request, response) => {
  const modelMap = {
    zabitkatibi,
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

  let Model = modelMap[kind];

  if (!Model) {
    Model = Person;
  }

  // find title by kind
  let title = await Title.findOne({ kind });

  if (!title) {
    return response.status(404).send({
      success: false,
      message: Messages.TITLE_NOT_FOUND,
    });
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
    title: title._id,
  };

  if (kind === "zabitkatibi") {
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
        code: error.code,
      });
    });
});

module.exports = router;
