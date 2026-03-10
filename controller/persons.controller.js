const Messages = require("../constants/Messages");
const fs = require("fs");
const path = require("path");
const {
  Person,
  zabitkatibi,
  yaziislerimudürü,
  mubasir,
} = require("../model/Person");
const PersonUnit = require("../model/PersonUnit");
const Leave = require("../model/Leave");
const Title = require("../model/Title");
const PersonAttributeList = require("../constants/PersonAttributeList");
const { getUnitTypeByUnitTypeId } = require("../actions/UnitTypeActions");
const { getInstitutionListByID } = require("../actions/InstitutionActions");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// Model Map
const modelMap = {
  Person,
  zabitkatibi,
  yaziislerimudürü,
  mubasir,
};

// Helper: Türkçe karakterleri küçük harfe dönüştür
function turkishToLowerCase(text) {
  if (!text) return "";
  return text
    .replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş")
    .replace(/İ/g, "i")
    .replace(/Ö/g, "ö")
    .replace(/Ç/g, "ç")
    .replace(/ı/g, "i");
}

// Helper: Uygun modeli seç
function getPersonModel(person) {
  if (person.durusmaKatibiMi !== undefined) {
    return zabitkatibi;
  }
  if (person.ikinciBirimID !== undefined) {
    if (person.kind === "yaziislerimudürü") {
      return yaziislerimudürü;
    }
    if (person.kind === "mubasir") {
      return mubasir;
    }
  }
  return Person;
}

// Helper: Populate konfigürasyonu
const populateConfig = {
  basic: [
    { path: "title", select: "-_id -__v -deletable" },
    { path: "birimID", select: "-__v -deletable" },
    { path: "ikinciBirimID", select: "-__v -deletable" },
    { path: "izinler", select: "-__v -personID" },
    { path: "temporaryBirimID", select: "-__v -deletable" },
  ],
  withHistory: [
    { path: "title", select: "-_id -__v -deletable" },
    { path: "birimID", select: "-__v -deletable" },
    { path: "ikinciBirimID", select: "-__v -deletable" },
    { path: "izinler", select: "-__v -personID" },
    { path: "temporaryBirimID", select: "-__v -deletable" },
    {
      path: "gecmisBirimler",
      select: "-__v -personID -createdDate",
      populate: { path: "unitID", select: "_id name" },
    },
  ],
  withCalisti: [
    { path: "title", select: "-_id -__v -deletable" },
    { path: "birimID", select: "-__v -deletable" },
    { path: "ikinciBirimID", select: "-__v -deletable" },
    { path: "izinler", select: "-__v -personID" },
    { path: "temporaryBirimID", select: "-__v -deletable" },
    {
      path: "gecmisBirimler",
      select: "-__v -personID -createdDate",
      populate: { path: "unitID", select: "_id name" },
    },
    {
      path: "calistigiKisi",
      populate: { path: "title", select: "-_id -__v -deletable" },
    },
  ],
};

// GET /persons
// Aktif personelleri listele
exports.getActivatePersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    if (!institutionId) {
      return response.status(400).send({
        success: false,
        message: `Kurum ID ${Messages.REQUIRED_FIELD}`,
      });
    }

    let persons = await Person.find({ status: true })
      .select("-_id -__v -kind -calistigiKisi")
      .populate(populateConfig.basic);

    persons = persons.map((person) => person.toObject());

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

    persons.forEach((person) => {
      let unitType = getUnitTypeByUnitTypeId(person.birimID.unitTypeID);
      person.birimID.oncelikSirasi = unitType.oncelikSirasi;
    });

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_ACTIVATED_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      false
    );

    response.send({
      success: true,
      personList: persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/byAdSoyad
// Ad/Soyada göre personel ara
exports.getPersonByAdSoyad = async (request, response) => {
  try {
    const { ad, soyad } = request.query;
    if (!ad && !soyad) {
      return response.status(400).send({
        success: false,
        message: `Ad veya Soyad ${Messages.REQUIRED_FIELD}`,
      });
    }

    const normalizedAd = turkishToLowerCase(ad);
    const normalizedSoyad = turkishToLowerCase(soyad);

    const persons = await Person.find(
      {
        ad: { $regex: new RegExp(normalizedAd, "iu") },
        soyad: { $regex: new RegExp(normalizedSoyad, "iu") },
      },
      null,
      { collation: { locale: "tr", strength: 1 } }
    ).populate(populateConfig.withCalisti);

    if (!persons || persons.length === 0) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    response.send({
      success: true,
      persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_FOUND,
    });
  }
};

// GET /persons/bySicil/:sicil
// Sicile göre personel ara
exports.getPersonBySicil = async (request, response) => {
  try {
    const person = await Person.findOne({ sicil: request.params.sicil }).populate(
      populateConfig.withCalisti
    );

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
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_FOUND,
    });
  }
};

// GET /persons/byId/:id
// ID'ye göre personel ara
exports.getPersonById = async (request, response) => {
  try {
    const id = request.params.id;

    const person = await Person.findById(id)
      .populate("title", "-_id -__v -deletable")
      .populate("birimID", "-__v -deletable")
      .populate("ikinciBirimID", "-__v -deletable")
      .populate("temporaryBirimID", "-__v -deletable")
      .populate({
        path: "gecmisBirimler",
        select: "-__v -personID -createdDate",
        populate: { path: "unitID", select: "_id name" },
      });

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
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_FOUND,
    });
  }
};

// GET /persons/attributeList
// Personel attribute listesini getir
exports.getAttributeList = async (request, response) => {
  try {
    response.send({
      success: true,
      personAttributeList: PersonAttributeList.PersonAttributeList,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

// GET /persons/deactivated
// Deaktif personelleri listele
exports.getDeactivatedPersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    let persons = await Person.find({
      $or: [{ status: false }, { kurumIciNaklenAtamaVarmi: true }],
    })
      .select("-_id -__v -goreveBaslamaTarihi -kind -calistigiKisi -birimeBaslamaTarihi")
      .populate(populateConfig.basic);

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
      request.user.id,
      RequestTypeList.PERSON_DEACTIVATED_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    response.send({
      success: true,
      personList: persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/temporary
// Geçici personelleri listele
exports.getTemporaryPersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    let persons = await Person.find({ isTemporary: true })
      .select("-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi")
      .populate(populateConfig.basic);

    persons = persons.map((person) => person.toObject());

    const personsWithTemporaryUnit = [];
    const warnings = [];

    persons.forEach((person) => {
      if (!person.temporaryBirimID) {
        console.warn(
          `${person.sicil} sicil sayılı personel geçici personel olarak işaretlenmiş ancak birimi mevcut değil, geçici birimi ekleyin`
        );
        warnings.push({
          sicil: person.sicil,
          ad: person.ad,
          soyad: person.soyad,
          message: `${person.sicil} sicil sayılı personel geçici personel olarak işaretlenmiş ancak birimi mevcut değil, geçici birimi ekleyin`,
        });
      } else {
        personsWithTemporaryUnit.push(person);
      }
    });

    persons = personsWithTemporaryUnit;

    if (institutionId) {
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return person.birimID.institutionID == institutionId;
      });
    }

    persons.forEach((person) => {
      person.birimID.institution = getInstitutionListByID(
        person.birimID.institutionID
      );
      person.temporaryBirimID.institution = getInstitutionListByID(
        person.temporaryBirimID.institutionID
      );
    });

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_TEMPORARY_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    response.send({
      success: true,
      personList: persons,
      warnings: warnings.length > 0 ? warnings : null,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/suspended
// Askıya alınan personelleri listele
exports.getSuspendedPersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    let persons = await Person.find({ isSuspended: true })
      .select("-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi")
      .populate(populateConfig.basic);

    persons = persons.map((person) => person.toObject());

    if (institutionId) {
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return person.birimID.institutionID == institutionId;
      });
    }

    persons.forEach((person) => {
      person.birimID.institution = getInstitutionListByID(
        person.birimID.institutionID
      );
    });

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_SUSPENDED_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    response.send({
      success: true,
      personList: persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/disabled
// Engelli personelleri listele
exports.getDisabledPersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    let persons = await Person.find({ isDisabled: true, status: true })
      .select("-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi")
      .populate(populateConfig.basic);

    persons = persons.map((person) => person.toObject());

    if (institutionId) {
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return person.birimID.institutionID == institutionId;
      });
    }

    persons.forEach((person) => {
      person.birimID.institution = getInstitutionListByID(
        person.birimID.institutionID
      );
    });

    recordActivity(
      request.user.id,
      RequestTypeList.REPORT_PERSON_DISABLED_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    response.send({
      success: true,
      personList: persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/martyrRelative
// Şehit gazi yakını personelleri listele
exports.getMartyrRelativePersons = async (request, response) => {
  try {
    let institutionId = request.query.institutionId;

    let persons = await Person.find({ isMartyrRelative: true, status: true })
      .select("-_id -__v -goreveBaslamaTarihi -kind -gecmisBirimler -calistigiKisi -birimeBaslamaTarihi")
      .populate(populateConfig.basic);

    persons = persons.map((person) => person.toObject());

    if (institutionId) {
      persons = persons.filter((person) => {
        if (person.birimID === null) {
          console.log("birimID null olan person: ", person);
          return false;
        }
        return person.birimID.institutionID == institutionId;
      });
    }

    persons.forEach((person) => {
      person.birimID.institution = getInstitutionListByID(
        person.birimID.institutionID
      );
    });

    recordActivity(
      request.user.id,
      RequestTypeList.REPORT_PERSON_MARTYR_RELATIVE_LIST,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    response.send({
      success: true,
      personList: persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSONS_NOT_FOUND,
    });
  }
};

// GET /persons/:birimID
// Birime göre personelleri listele
exports.getPersonsByBirimId = async (request, response) => {
  try {
    const birimID = request.params.birimID;

    let persons = await Person.find({ birimID, status: true })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .populate("calistigiKisi", "-__v -personID")
      .select("-kind");

    const yaziislerimudürüPersons = await Person.find({
      kind: "yaziislerimudürü",
      ikinciBirimID: birimID,
      status: true,
    })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .select("-kind");

    persons = persons.concat(yaziislerimudürüPersons);

    const mubasirPersons = await Person.find({
      kind: "mubasir",
      ikinciBirimID: birimID,
      status: true,
    })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .select("-kind");

    persons = persons.concat(mubasirPersons);

    const zabitkaatibiPersons = await Person.find({
      kind: "zabitkatibi",
      calistigiKisi: birimID,
      status: true,
    })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .select("-kind");

    persons = persons.concat(zabitkaatibiPersons);

    const zabitKatibiIkinciBirimPersons = await Person.find({
      kind: "zabitkatibi",
      ikinciBirimID: birimID,
      status: true,
    })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .select("-kind");

    persons = persons.concat(zabitKatibiIkinciBirimPersons);

    const temporaryPersons = await Person.find({
      temporaryBirimID: birimID,
      status: true,
    })
      .populate("title", "-_id -__v -deletable")
      .populate("izinler", "-__v -personID")
      .select("-kind");

    persons = persons.concat(temporaryPersons);

    response.send({
      success: true,
      persons,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_FOUND,
    });
  }
};

// POST /persons
// Yeni personel oluştur
exports.createPerson = async (request, response) => {
  try {
    const requiredFields = ["sicil", "ad", "soyad", "titleID"];
    const missingFields = requiredFields.filter((field) => !request.body[field]);
    
    if (missingFields.length > 0) {
      return response.status(400).send({
        success: false,
        message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
      });
    }

    const {
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
      temporaryReason,
      temporaryEndDate,
      temporaryBirimID,
      isPartTime,
      partTimeStartDate,
      partTimeEndDate,
      partTimeReason,
      durusmaKatibiMi,
      calistigiKisi,
      ikinciBirimID,
      nobetTutuyorMu,
    } = request.body;

    // Ad/Soyad formatı
    const adDuzenle = ad
      .split(" ")
      .map(
        (kelime) =>
          kelime.charAt(0).toLocaleUpperCase("tr-TR") +
          kelime.slice(1).toLocaleLowerCase("tr-TR")
      )
      .join(" ");

    const soyadDuzenle = soyad.toUpperCase();

    // Title kontrolü
    const title = await Title.findById(titleID);
    if (!title) {
      return response.status(404).send({
        success: false,
        message: Messages.TITLE_NOT_FOUND,
      });
    }

    let kind = title.kind;
    let Model = modelMap[kind] || Person;

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
      isPartTime,
      partTimeStartDate,
      partTimeEndDate,
      partTimeReason,
      title: title._id,
      kind,
    };

    let newPerson;

    if (kind === "zabitkatibi") {
      newPerson = new Model({
        ...commonFields,
        ikinciBirimID,
        durusmaKatibiMi,
        calistigiKisi,
        nobetTutuyorMu,
      });
    } else if (kind === "yaziislerimudürü") {
      newPerson = new Model({ ...commonFields, ikinciBirimID });
    } else if (kind === "mubasir") {
      newPerson = new Model({ ...commonFields, ikinciBirimID, nobetTutuyorMu });
    } else {
      newPerson = new Model(commonFields);
    }

    const savedPerson = await newPerson.save();

    recordActivity(
      request.user.id,
      RequestTypeList.PERSON_CREATE,
      savedPerson._id,
      `Sicil:${savedPerson.sicil} Ad:${savedPerson.ad} Soyad:${savedPerson.soyad}`
    );

    response.status(201).send(savedPerson);
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_SAVED,
      code: error.code,
    });
  }
};

// PUT /persons/updateBySicil/:sicil
// Sicile göre personeli güncelle
exports.updatePersonBySicil = async (request, response) => {
  try {
    const sicil = request.params.sicil;
    const updateData = request.body;
    const options = { new: true, runValidators: true, context: "query" };

    const person = await Person.findOne({ sicil });
    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    // Status false yapılırsa geçici görevlendirme ve yarı zamanlı bilgisini temizle
    if (updateData.status === false) {
      updateData.isTemporary = false;
      updateData.temporaryReason = null;
      updateData.temporaryEndDate = null;
      updateData.temporaryBirimID = null;
      updateData.isPartTime = false;
      updateData.partTimeReason = null;
      updateData.partTimeStartDate = null;
      updateData.partTimeEndDate = null;
    }

    if (updateData.kurumIciNaklenAtamaVarmi === false) {
      updateData.kurumIciNaklenAtamaAciklama = null;
      updateData.kurumIciNaklenAtamaTarihi = null;
    }

    // Birime başlama tarihi kontrolü
    const goreveBaslamaTarihi =
      updateData.goreveBaslamaTarihi || person.goreveBaslamaTarihi;
    if (updateData.birimeBaslamaTarihi && goreveBaslamaTarihi) {
      const birimeBaslamaTarihi = new Date(updateData.birimeBaslamaTarihi);
      const goreveBaslamaTarihiDate = new Date(goreveBaslamaTarihi);
      if (birimeBaslamaTarihi < goreveBaslamaTarihiDate) {
        return response.status(400).send({
          success: false,
          message: "Birime başlama tarihi, göreve başlama tarihinden önce olamaz.",
        });
      }
    }

    const Model = getPersonModel(person);
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
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_UPDATED,
    });
  }
};

// PUT /persons/:id
// ID'ye göre personeli güncelle
exports.updatePersonById = async (request, response) => {
  try {
    const id = request.params.id;
    const updateData = request.body;
    const options = { new: true, runValidators: true, context: "query" };

    const person = await Person.findById(id);
    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    // Status false yapılırsa geçici görevlendirme ve yarı zamanlı bilgisini temizle
    if (updateData.status === false) {
      updateData.isTemporary = false;
      updateData.temporaryReason = null;
      updateData.temporaryEndDate = null;
      updateData.temporaryBirimID = null;
      updateData.isPartTime = false;
      updateData.partTimeReason = null;
      updateData.partTimeStartDate = null;
      updateData.partTimeEndDate = null;
    }

    if (updateData.kurumIciNaklenAtamaVarmi === false) {
      updateData.kurumIciNaklenAtamaAciklama = null;
      updateData.kurumIciNaklenAtamaTarihi = null;
    }

    // Birime başlama tarihi kontrolü
    const goreveBaslamaTarihi =
      updateData.goreveBaslamaTarihi || person.goreveBaslamaTarihi;
    if (updateData.birimeBaslamaTarihi && goreveBaslamaTarihi) {
      const birimeBaslamaTarihi = new Date(updateData.birimeBaslamaTarihi);
      const goreveBaslamaTarihiDate = new Date(goreveBaslamaTarihi);
      if (birimeBaslamaTarihi < goreveBaslamaTarihiDate) {
        return response.status(400).send({
          success: false,
          message: "Birime başlama tarihi, göreve başlama tarihinden önce olamaz.",
        });
      }
    }

    const Model = getPersonModel(person);
    const updatedPerson = await Model.findByIdAndUpdate(id, updateData, options);

    if (!updatedPerson) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    // Activity logging
    if (updateData.status === false) {
      recordActivity(
        request.user.id,
        RequestTypeList.PERSON_DEACTIVATE,
        updatedPerson._id
      );
    } else if (updateData.isSuspended === true) {
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

    response.send({
      success: true,
      message: Messages.PERSON_UPDATED,
    });
  } catch (error) {
    console.log(error);
    const statusCode = error.statusCode || 500;
    response.status(statusCode).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_UPDATED,
    });
  }
};

// PUT /persons/:id/photo
// Personel fotoğrafı yükle
exports.uploadPersonPhoto = async (request, response) => {
  if (!request.file) {
    return response.status(400).send({
      success: false,
      message: "Fotoğraf dosyası gereklidir",
    });
  }

  try {
    const person = await Person.findById(request.params.id);

    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    if (person.photo) {
      const oldFileName = path.basename(person.photo);
      const oldFilePath = path.join(__dirname, "..", "uploads", "persons", oldFileName);

      try {
        await fs.promises.unlink(oldFilePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Eski personel fotoğrafı silinemedi:", error);
        }
      }
    }

    person.photo = `/uploads/persons/${request.file.filename}`;
    await person.save();

    return response.status(200).send({
      success: true,
      message: "Personel fotoğrafı güncellendi",
      photo: person.photo,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).send({
      success: false,
      message: "Personel fotoğrafı güncellenemedi",
      error: error.message,
    });
  }
};

// DELETE /persons/:id/photo
// Personel fotoğrafını sil
exports.deletePersonPhoto = async (request, response) => {
  try {
    const person = await Person.findById(request.params.id);

    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    if (person.photo) {
      const fileName = path.basename(person.photo);
      const filePath = path.join(__dirname, "..", "uploads", "persons", fileName);

      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Personel fotoğrafı silinemedi:", error);
        }
      }
    }

    person.photo = null;
    await person.save();

    return response.status(200).send({
      success: true,
      message: "Personel fotoğrafı silindi",
    });
  } catch (error) {
    console.error(error);
    return response.status(500).send({
      success: false,
      message: "Personel fotoğrafı silinemedi",
      error: error.message,
    });
  }
};

// DELETE /persons/:id
// Personeli sil
exports.deletePerson = async (request, response) => {
  try {
    const id = request.params.id;

    const person = await Person.findById(id);
    if (!person) {
      return response.status(404).send({
        success: false,
        message: Messages.PERSON_NOT_FOUND,
      });
    }

    const silinenPersonData = person.toObject();

    // Perform all deletions in parallel
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

    await Person.findOneAndDelete({ _id: id });

    response.send({
      success: true,
      message: Messages.PERSON_DELETED,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || Messages.PERSON_NOT_DELETED,
    });
  }
};
