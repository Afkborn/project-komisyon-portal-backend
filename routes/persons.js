const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const {
  Person,
  zabitkatibi,
  yaziislerimudürü,
  mubasir,
} = require("../model/Person");
const PersonUnit = require("../model/PersonUnit");
const Leave = require("../model/Leave");
const Title = require("../model/Title");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const PersonAttributeList = require("../constants/PersonAttributeList");
const { getUnitTypeByUnitTypeId } = require("../actions/UnitTypeActions");
const { getInstitutionListByID } = require("../actions/InstitutionActions");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// MODELMAP
const modelMap = {
  Person,
  zabitkatibi,
  yaziislerimudürü,
  mubasir,
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
    .populate("temporaryBirimID", "-__v -deletable")
    .then((persons) => {
      persons = persons.map((person) => person.toObject());

      // filter persons by institutionId
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return (
          person.birimID.institutionID == institutionId ||
          (person.temporaryBirimID &&
            person.temporaryBirimID.institutionID == institutionId)
        );
      });

      //birimID içindeki unitTypeID'yi unitTypeList içindeki id ile eşleştir ve unitType'ı al
      persons.forEach((person) => {
        let unitType = getUnitTypeByUnitTypeId(person.birimID.unitTypeID);
        person.birimID.oncelikSirasi = unitType.oncelikSirasi;
      });

      recordActivity(
        request.user.id, // userID
        RequestTypeList.PERSON_ACTIVATED_LIST, // type
        null, // personID
        null, // description
        null, // titleID
        null, // unitID
        null, // personUnitID
        null, // leaveID
        false // isVisible
      );

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

const turkishToLowerCase = (text) => {
  if (!text) return "";
  return text
    .replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş")
    .replace(/İ/g, "i")
    .replace(/Ö/g, "ö")
    .replace(/Ç/g, "ç")
    .replace(/ı/g, "i");
};

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

    // Türkçe karakter uyumlu küçük harfe dönüştürme
    const normalizedAd = turkishToLowerCase(ad);
    const normalizedSoyad = turkishToLowerCase(soyad);

    Person.find(
      {
        ad: { $regex: new RegExp(normalizedAd, "iu") },
        soyad: { $regex: new RegExp(normalizedSoyad, "iu") },
      },
      null,
      { collation: { locale: "tr", strength: 1 } }
    )
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", " -__v -deletable")
      .populate("ikinciBirimID", " -__v -deletable") // yaziislerimüdürü için 2. birim olursa populate ediyoruz.
      .populate("izinler", "-__v -personID")
      .populate("temporaryBirimID", "-__v -deletable")

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
      .populate("temporaryBirimID", "-__v -deletable")

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

    // if (!institutionId) {
    //   return response.status(400).send({
    //     success: false,
    //     message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
    //   });
    // }
    Person.find({ status: false })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .populate("birimID", "-_id -__v -deletable")
      .then((persons) => {
        // filter persons by institutionId
        if (institutionId) {
          persons = persons.filter((person) => {
            if (person.birimID === null) {
              console.log("birimID null olan person: ", person);
              return false;
            }
            return person.birimID.institutionID == institutionId;
          });
        }

        recordActivity(
          request.user.id, // userID
          RequestTypeList.PERSON_DEACTIVATED_LIST, // type
          null, // personID
          null, // description
          null, // titleID
          null, // unitID
          null, // personUnitID
          null, // leaveID
          true // isVisible
        );

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

// get isTemporary true persons
router.get(
  "/temporary",
  auth,
  Logger("GET /persons/temporary"),
  (request, response) => {
    let institutionId = request.query.institutionId;

    Person.find({ isTemporary: true })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .populate("temporaryBirimID", "-__v -deletable")
      .then((persons) => {
        persons = persons.map((person) => person.toObject());
        // filter persons by institutionId
        if (institutionId) {
          persons = persons.filter((person) => {
            if (person.birimID === null) {
              console.log("birimID null olan person: ", person);
              return false;
            }
            return person.birimID.institutionID == institutionId;
          });
        }

        // personlar'daki InstitutionID'ye göre ilgili birimi ekle
        persons.forEach((person) => {
          person.birimID.institution = getInstitutionListByID(
            person.birimID.institutionID
          );
          person.temporaryBirimID.institution = getInstitutionListByID(
            person.temporaryBirimID.institutionID
          );
        });

        recordActivity(
          request.user.id, // userID
          RequestTypeList.PERSON_TEMPORARY_LIST, // type
          null, // personID
          null, // description
          null, // titleID
          null, // unitID
          null, // personUnitID
          null, // leaveID
          true // isVisible
        );

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

// get isSuspended true persons
router.get(
  "/suspended",
  auth,
  Logger("GET /persons/suspended"),
  (request, response) => {
    let institutionId = request.query.institutionId;

    Person.find({ isSuspended: true })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .then((persons) => {
        persons = persons.map((person) => person.toObject());
        // filter persons by institutionId
        if (institutionId) {
          persons = persons.filter((person) => {
            if (person.birimID === null) {
              console.log("birimID null olan person: ", person);
              return false;
            }
            return person.birimID.institutionID == institutionId;
          });
        }

        // personlar'daki InstitutionID'ye göre ilgili birimi ekle
        persons.forEach((person) => {
          person.birimID.institution = getInstitutionListByID(
            person.birimID.institutionID
          );
        });

        recordActivity(
          request.user.id, // userID
          RequestTypeList.PERSON_SUSPENDED_LIST, // type
          null, // personID
          null, // description
          null, // titleID
          null, // unitID
          null, // personUnitID
          null, // leaveID
          true // isVisible
        );

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

// get isDisabled true persons
// engelli personel
router.get(
  "/disabled",
  auth,
  Logger("GET /persons/disabled"),
  (request, response) => {
    let institutionId = request.query.institutionId;

    Person.find({ isDisabled: true, status: true })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .then((persons) => {
        persons = persons.map((person) => person.toObject());
        // filter persons by institutionId
        if (institutionId) {
          persons = persons.filter((person) => {
            if (person.birimID === null) {
              console.log("birimID null olan person: ", person);
              return false;
            }
            return person.birimID.institutionID == institutionId;
          });
        }

        // personlar'daki InstitutionID'ye göre ilgili birimi ekle
        persons.forEach((person) => {
          person.birimID.institution = getInstitutionListByID(
            person.birimID.institutionID
          );
        });

        recordActivity(
          request.user.id, // userID
          RequestTypeList.REPORT_PERSON_DISABLED_LIST, // type
          null, // personID
          null, // description
          null, // titleID
          null, // unitID
          null, // personUnitID
          null, // leaveID
          true // isVisible
        );

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

// get isMartyrRelative true persons
// ŞEHİT GAZİ YAKINI PERSONEL
router.get(
  "/martyrRelative",
  auth,
  Logger("GET /persons/martyrRelative"),
  (request, response) => {
    let institutionId = request.query.institutionId;

    Person.find({ isMartyrRelative: true, status: true })
      .select(
        "-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi"
      )
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-_id -__v -deletable")
      .then((persons) => {
        persons = persons.map((person) => person.toObject());
        // filter persons by institutionId
        if (institutionId) {
          persons = persons.filter((person) => {
            if (person.birimID === null) {
              console.log("birimID null olan person: ", person);
              return false;
            }
            return person.birimID.institutionID == institutionId;
          });
        }

        // personlar'daki InstitutionID'ye göre ilgili birimi ekle
        persons.forEach((person) => {
          person.birimID.institution = getInstitutionListByID(
            person.birimID.institutionID
          );
        });

        recordActivity(
          request.user.id, // userID
          RequestTypeList.REPORT_PERSON_MARTYR_RELATIVE_LIST, // type
          null, // personID
          null, // description
          null, // titleID
          null, // unitID
          null, // personUnitID
          null, // leaveID
          true // isVisible
        );

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
      .populate("calistigiKisi", "-__v -personID")
      .select("-kind")
      .then((persons) => {
        if (!persons) {
          return response.status(404).send({
            success: false,
            message: Messages.PERSON_NOT_FOUND,
          });
        }

        //bu birimID değerine sahip olan bir yaziislerimüdürü ve mubasir olabilir
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

            // mubasirleri de ekleyelim
            Person.find({
              kind: "mubasir",
              ikinciBirimID: birimID,
              status: true,
            })
              .populate("title", "-_id -__v -deletable")
              .populate("izinler", "-__v -personID")
              .select("-kind")
              .then((mubasir) => {
                persons = persons.concat(mubasir);

                // zabit katibileri de ekleyelim
                Person.find({
                  kind: "zabitkatibi",
                  calistigiKisi: birimID,
                  status: true,
                })
                  .populate("title", "-_id -__v -deletable")
                  .populate("izinler", "-__v -personID")
                  .select("-kind")
                  .then((zabitkatibi) => {
                    persons = persons.concat(zabitkatibi);

                    // geçici personel vasra onlarıda ekleyelim
                    Person.find({
                      temporaryBirimID: birimID,
                      status: true,
                    })
                      .populate("title", "-_id -__v -deletable")
                      .populate("izinler", "-__v -personID")
                      .select("-kind")
                      .then((temporaryPersons) => {
                        persons = persons.concat(temporaryPersons);

                        response.send({
                          success: true,
                          persons,
                        });
                      });
                  });
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

    // geçici personel özellikleri
    isTemporary,
    temporaryReason,
    temporaryEndDate,
    temporaryBirimID,

    //  ZABIT KATİBİ
    durusmaKatibiMi,
    calistigiKisi,

    // YAZI İŞLERİ MÜDÜRÜ ve MÜBAŞİR
    ikinciBirimID,

    // ZABİT KATİBİ ve MÜBAŞİR
    nobetTutuyorMu
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
    temporaryReason,
    temporaryEndDate,
    temporaryBirimID,
    title: title._id,
    kind,
  };

  if (kind === "zabitkatibi") {
    newPerson = new Model({ ...commonFields, durusmaKatibiMi, calistigiKisi, nobetTutuyorMu });
  } else if (kind === "yaziislerimudürü") {
    newPerson = new Model({ ...commonFields, ikinciBirimID });
  } else if (kind === "mubasir") {
    newPerson = new Model({ ...commonFields, ikinciBirimID, nobetTutuyorMu });
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
        if (person.kind === "yaziislerimudürü") {
          Model = yaziislerimudürü;
        }
        if (person.kind === "mubasir") {
          Model = mubasir;
        }
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
        if (person.kind === "yaziislerimudürü") {
          Model = yaziislerimudürü;
        }
        if (person.kind === "mubasir") {
          Model = mubasir;
        }
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

      // eğer personelin status'u false olduysa recordavctivity değiştir
      if (updateData.status === false) {
        recordActivity(
          request.user.id,
          RequestTypeList.PERSON_DEACTIVATE,
          updatedPerson._id
        );
      } else {
        // eğer personelin status'u true ancak isSuspended true olduysa recordavctivity değiştir
        if (updateData.isSuspended === true) {
          recordActivity(
            request.user.id,
            RequestTypeList.PERSON_SUSPEND,
            updatedPerson._id
          );
        } else {
          recordActivity(
            request.user.id,
            RequestTypeList.PERSON_UPDATE_ID,
            updatedPerson._id
          );
        }
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
