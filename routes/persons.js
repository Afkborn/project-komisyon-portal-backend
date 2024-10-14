const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const { Person, zabitkatibi, yaziislerimudürü } = require("../model/Person");
const PersonUnit = require("../model/PersonUnit");
const Leave = require("../model/Leave");
const Title = require("../model/Title");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const PersonAttributeList = require("../constants/PersonAttributeList");
const { getUnitTypeByUnitTypeId } = require("../actions/UnitTypeActions");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");
// MODELMAP
const modelMap = {
  Person,
  zabitkatibi,
  yaziislerimudürü,
};

// get all persons
router.get("/", auth, Logger("GET /persons/"), (request, response) => {
  let institutionId = request.query.institutionId;

  if (!institutionId) {
    return response.status(400).send({
      success: false,
      message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
    });
  }
  Person.find({ status: true })
    .select(
      "-_id -__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi"
    )
    .populate("title", "-_id -__v -deletable")
    .populate("izinler", "-__v -personID")
    .populate("birimID", "-_id -__v -deletable")
    .then((persons) => {
      persons = persons.map((person) => person.toObject());

      // filter persons by institutionId
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return person.birimID.institutionID == institutionId;
      });

      //birimID içindeki unitTypeID'yi unitTypeList içindeki id ile eşleştir ve unitType'ı al
      persons.forEach((person) => {
        let unitType = getUnitTypeByUnitTypeId(person.birimID.unitTypeID);
        person.birimID.oncelikSirasi = unitType.oncelikSirasi;
      });

      response.send({
        success: true,
        personList: persons,
      });
    })
    .catch((error) => {
      console.log(error);
      console.log(error.message || Messages.PERSONS_NOT_FOUND);
      response.status(500).send({
        message: error.message || Messages.PERSONS_NOT_FOUND,
      });
    });
});

// get a person by ad soyad
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

    Person.find({
      ad: { $regex: new RegExp(ad, "iu") },
      soyad: { $regex: new RegExp(soyad, "iu") },
    })
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", " -__v -deletable")
      .populate("ikinciBirimID", " -__v -deletable") // yaziislerimüdürü için 2. birim olursa populate ediyoruz.
      .populate("izinler", "-__v -personID")

      .populate({
        path: "gecmisBirimler",
        select: "-__v -personID -createdDate",
        populate: {
          path: "unitID", // `gecmisBirimler` içindeki `unitID`'yi doldur
          select: "_id name", // `unitID` içindeki belirli alanları seç
        },
      })

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
      .populate("birimID", " -__v -deletable")
      .populate("ikinciBirimID", " -__v -deletable") // yaziislerimüdürü için 2. birim olursa populate ediyoruz.
      .populate("izinler", "-__v -personID")

      .populate({
        path: "gecmisBirimler",
        select: "-__v -personID -createdDate",
        populate: {
          path: "unitID", // `gecmisBirimler` içindeki `unitID`'yi doldur
          select: "_id name", // `unitID` içindeki belirli alanları seç
        },
      })

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

// get a person attribute data
router.get(
  "/attributeList",
  auth,
  Logger("GET /persons/attributeList"),
  (request, response) => {
    response.send({
      success: true,
      personAttributeList: PersonAttributeList.PersonAttributeList,
    });
  }
);

// get status false persons
router.get(
  "/deactivated",
  auth,
  Logger("GET /persons/deactivated"),
  (request, response) => {
    let institutionId = request.query.institutionId;

    if (!institutionId) {
      return response.status(400).send({
        success: false,
        message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      });
    }
    Person.find({ status: false })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .populate("birimID", "-_id -__v -deletable")
      .then((persons) => {
        // filter persons by institutionId
        persons = persons.filter((person) => {
          if (person.birimID === null) {
            console.log("birimID null olan person: ", person);
            return false;
          }
          return person.birimID.institutionID == institutionId;
        });

        response.send({
          success: true,
          personList: persons,
        });
      })
      .catch((error) => {
        console.log(error.message || Messages.PERSONS_NOT_FOUND);
        response.status(500).send({
          message: error.message || Messages.PERSONS_NOT_FOUND,
        });
      });
  }
);

// get a persons by birimID
router.get(
  "/:birimID",
  auth,
  Logger("GET /persons/byBirimID"),
  async (request, response) => {
    const birimID = request.params.birimID;
    // get all persons by birimID with title , without kind
    Person.find({ birimID, status: true })
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

        //bu birimID değerine sahip olan bir yaziislerimüdürü olabilir
        // o yüzden ikinciBirimID değeri birimID olanları getir ve persons'a ekle
        Person.find({
          kind: "yaziislerimudürü",
          ikinciBirimID: birimID,
          status: true,
        })
          .populate("title", "-_id -__v -deletable")
          .populate("izinler", "-__v -personID")
          .select("-kind")
          .then((yaziislerimudürü) => {
            persons = persons.concat(yaziislerimudürü);
            response.send({
              success: true,
              persons,
            });
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
  const requiredFields = ["sicil", "ad", "soyad", "titleID"];
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
    titleID,
    birimID,
    birimeBaslamaTarihi,
    status,
    description,
    level,
    isTemporary,

    //  ZABIT KATİBİ
    durusmaKatibiMi,
    calistigiKisi,

    // YAZI İŞLERİ MÜDÜRÜ
    ikinciBirimID,
  } = request.body;

  // Ad ilk harfi büyük, diğerleri küçük olacak şekilde düzenleme
  // Soyad hepsi büyük olacak şekilde düzenleme
  const adDuzenle = ad
    .split(" ")
    .map(
      (kelime) =>
        kelime.charAt(0).toLocaleUpperCase("tr-TR") +
        kelime.slice(1).toLocaleLowerCase("tr-TR")
    )
    .join(" ");

  const soyadDuzenle = soyad.toUpperCase(); // Soyadı tamamen büyük harfe çevir

  // find title by id
  const title = await Title.findById(titleID);

  if (!title) {
    return response.status(404).send({
      success: false,
      message: Messages.TITLE_NOT_FOUND,
    });
  }

  let kind = title.kind;

  let Model = modelMap[kind];

  if (!Model) {
    Model = Person;
  }

  let newPerson;
  const commonFields = {
    sicil,
    ad: adDuzenle,
    soyad: soyadDuzenle,
    goreveBaslamaTarihi,
    birimID,
    birimeBaslamaTarihi,
    status,
    description,
    level,
    isTemporary,
    title: title._id,
    kind,
  };

  if (kind === "zabitkatibi") {
    newPerson = new Model({ ...commonFields, durusmaKatibiMi, calistigiKisi });
  } else if (kind === "yaziislerimudürü") {
    newPerson = new Model({ ...commonFields, ikinciBirimID });
  } else {
    newPerson = new Model(commonFields);
  }

  newPerson
    .save()
    .then((data) => {
      recordActivity(
        request.user.id,
        RequestTypeList.PERSON_CREATE,
        data._id,
        `Sicil:${data.sicil} Ad:${data.ad} Soyad:${data.soyad}`
      );

      response.status(201).send(data);
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_SAVED,
        code: error.code,
      });
    });
});

// update a person with sicil
router.put(
  "/updateBySicil/:sicil",
  auth,
  Logger("PUT /persons/updateBySicil"),
  async (request, response) => {
    const sicil = request.params.sicil;
    const updateData = request.body;
    const options = { new: true, runValidators: true, context: "query" };

    try {
      const person = await Person.findOne({ sicil });

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
      if (person.ikinciBirimID !== undefined) {
        Model = yaziislerimudürü;
      }

      const updatedPerson = await Model.findOneAndUpdate(
        { sicil },
        updateData,
        options
      );

      if (!updatedPerson) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }

      recordActivity(
        request.user.id,
        RequestTypeList.PERSON_UPDATE_SICIL,
        updatedPerson._id
      );

      response.send({
        success: true,
        message: Messages.PERSON_UPDATED,
      });
    } catch (error) {
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_UPDATED,
      });
    }
  }
);

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
      if (person.ikinciBirimID !== undefined) {
        Model = yaziislerimudürü;
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

      recordActivity(
        request.user.id,
        RequestTypeList.PERSON_UPDATE_ID,
        updatedPerson._id
      );

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
router.delete(
  "/:id",
  auth,
  Logger("DELETE /persons/"),
  async (request, response) => {
    const id = request.params.id;

    try {
      const person = await Person.findById(id);
      if (!person) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }
      let silinenPersonData = person.toObject();

      // Perform all deletions in parallel and wait for them to complete
      await Promise.all([
        Leave.deleteMany({ personID: id }),
        PersonUnit.deleteMany({ personID: id }),
      ]);

      recordActivity(
        request.user.id,
        RequestTypeList.PERSON_DELETE,
        silinenPersonData._id,
        `Sicil: ${silinenPersonData.sicil} Ad: ${silinenPersonData.ad} Soyad: ${silinenPersonData.soyad}`
      );

      // Now delete the person
      await Person.findOneAndDelete({ _id: id });

      response.send({
        success: true,
        message: Messages.PERSON_DELETED,
      });
    } catch (error) {
      console.log(error);
      response.status(500).send({
        message: error.message || Messages.PERSON_NOT_DELETED,
      });
    }
  }
);

module.exports = router;
