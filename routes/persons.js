const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person, zabitkatibi } = require("../model/Person");
const Title = require("../model/Title");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

// MODELMAP
const modelMap = {
  Person,
  zabitkatibi,
};

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

router.get(
  "/byAdSoyad",
  auth,
  Logger("GET /persons/byAdSoyad"),
  (request, response) => {
    const { ad, soyad } = request.query;
    if (!ad && !soyad) {
      return response.status(400).send({
        success: false,
        message: `Ad veya Soyad ${Messages.REQUIRED_FIELD}`,
      });
    }
    // ad ve soyad ile ararken küçük büyük harf duyarlılığı olmaması için
    // $regex: new RegExp(ad, "i") kullanıldı
    Person.find({
      ad: { $regex: new RegExp(ad, "i") },
      soyad: { $regex: new RegExp(soyad, "i") },
    })
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .populate({
        path: "calistigiKisi",
        populate: {
          path: "title",
          select: "-_id -__v -deletable",
        },
      })
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
  }
);

// get a person by sicil
router.get(
  "/bySicil/:sicil",
  auth,
  Logger("GET /persons/bySicil"),
  (request, response) => {
    Person.findOne({ sicil: request.params.sicil })
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .populate({
        path: "calistigiKisi",
        populate: {
          path: "title",
          select: "-_id -__v -deletable",
        },
      })
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
  }
);

// get a persons by birimID
router.get(
  "/:birimID",
  auth,
  Logger("GET /persons/byBirimID"),
  (request, response) => {
    const birimID = request.params.birimID;
    // get all persons by birimID with title , without kind
    Person.find({ birimID })
      // get title without _id -v
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
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
  }
);

// create a person
router.post("/", auth, Logger("POST /persons/"), async (request, response) => {
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
    calistigiKisi,
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
    newPerson = new Model({ ...commonFields, durusmaKatibiMi, calistigiKisi });
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

// Update a person with id
router.put("/:id", auth, Logger("PUT /persons/"), async (request, response) => {
  const id = request.params.id;
  const updateData = request.body;
  const options = { new: true, runValidators: true, context: "query" };

  Person.findById(id)
    .then((person) => {
      if (!person) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }

      let Model = Person;
      if (person.durusmaKatibiMi !== undefined) {
        Model = zabitkatibi;
      }
      // YENİ MODEL EKLENDİĞİNDE BURAYA EKLEME YAPILMALI

      return Model.findByIdAndUpdate(id, updateData, options);
    })
    .then((updatedPerson) => {
      if (!updatedPerson) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }

      response.send({
        success: true,
        message: Messages.PERSON_UPDATED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_UPDATED,
      });
    });
});

// Delete a person with id
router.delete("/:id", auth, Logger("DELETE /persons/"), (request, response) => {
  const id = request.params.id;

  Person.findById(id)
    .then((person) => {
      if (!person) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }
      Person.findOneAndDelete({ _id: id })
        .then(() => {
          response.send({
            success: true,
            message: Messages.PERSON_DELETED,
          });
        })
        .catch((error) => {
          response.status(500).send({
            message: error.message || Messages.PERSON_NOT_DELETED,
          });
        });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_DELETED,
      });
    });
});

module.exports = router;
