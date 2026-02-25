const SegbisUnit = require("../model/SegbisUnit");
const SegbisPerson = require("../model/SegbisPerson");
const { NumberPlateList } = require("../constants/NumberPlateList");
const { CourthousePhones } = require("../constants/CourthousePhones");
const { Regions } = require("../constants/Regions");
const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// Helper: Plaka kodunu alma fonksiyonu
function getPlateCode(input) {
  if (!input) return "00";

  const cityName = input.toLocaleUpperCase("tr-TR").trim();

  if (NumberPlateList[cityName]) {
    return NumberPlateList[cityName];
  }

  const parts = cityName.split(" ");
  for (let i = parts.length; i > 0; i--) {
    const cityCandidate = parts.slice(0, i).join(" ");
    if (NumberPlateList[cityCandidate]) {
      return NumberPlateList[cityCandidate];
    }
  }

  return "00";
}

// Helper: Bölge bilgisini getiren fonksiyon
function getRegion(cityName) {
  if (!cityName) return "Diğer";

  const normalizedCity = cityName.toLocaleUpperCase("tr-TR").trim();

  if (Regions[normalizedCity]) {
    return Regions[normalizedCity];
  }

  const parts = normalizedCity.split(" ");
  for (let i = parts.length; i > 0; i--) {
    const cityCandidate = parts.slice(0, i).join(" ");
    if (Regions[cityCandidate]) {
      return Regions[cityCandidate];
    }
  }

  return "Diğer";
}

// Helper: Birim tipi belirlemek
function getUnitType(unitName) {
  if (unitName.includes("CEZA")) return "Mahkeme";
  if (unitName.includes("HUKUK")) return "Mahkeme";
  if (unitName.includes("SAVCILIK")) return "Savcılık";
  if (unitName.includes("İCRA")) return "İcra Dairesi";
  return "Diğer";
}

// GET /segbis/cities
// İlleri getir
exports.getCities = async (req, res) => {
  try {
    const units = await SegbisUnit.find().select("il").lean();

    const uniqueCities = [...new Set(units.map((unit) => unit.il))];

    const cities = uniqueCities.map((city, index) => {
      const code = getPlateCode(city);
      const region = getRegion(city);

      let phone = null;
      if (CourthousePhones[city.toLocaleUpperCase("tr-TR")]) {
        phone = CourthousePhones[city.toLocaleUpperCase("tr-TR")];
      }

      return {
        id: index + 1,
        name: city,
        code: code,
        region: region,
        phone: phone,
      };
    });

    res.status(200).json({
      success: true,
      cities: cities,
    });
  } catch (error) {
    console.error("İller listelenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "İller listelenirken bir hata oluştu",
    });
  }
};

// GET /segbis/cities/:cityName/units
// Bir ile ait birimleri getir
exports.getUnitsByCity = async (req, res) => {
  try {
    const cityName = req.params.cityName;

    let query = {};
    if (isNaN(cityName)) {
      query = { il: cityName };
    } else {
      const cityId = parseInt(cityName);
      const units = await SegbisUnit.find().select("il").lean();
      const uniqueCities = [...new Set(units.map((unit) => unit.il))];

      if (cityId > 0 && cityId <= uniqueCities.length) {
        query = { il: uniqueCities[cityId - 1] };
      } else {
        return res.status(404).json({
          success: false,
          message: `${cityId} ID'li il bulunamadı`,
        });
      }
    }

    const units = await SegbisUnit.find(query).lean();

    const formattedUnits = units.map((unit, index) => ({
      id: unit._id,
      name: unit.ad,
      type: getUnitType(unit.ad),
      cityId: query.il || "Belirtilmemiş",
      personelCount: unit.personelList ? unit.personelList.length : 0,
    }));

    res.status(200).json({
      success: true,
      units: formattedUnits,
    });
  } catch (error) {
    console.error("Birimler listelenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Birimler listelenirken bir hata oluştu",
    });
  }
};

// GET /segbis/units/:unitId/personel
// Bir birime ait personeli getir
exports.getUnitPersonnel = async (req, res) => {
  try {
    const unitId = req.params.unitId;

    const unit = await SegbisUnit.findById(unitId).lean();
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: `${unitId} ID'li birim bulunamadı`,
      });
    }

    const personnel = await SegbisPerson.find({ mahkeme_id: unitId }).lean();

    const formattedPersonnel = personnel.map((person) => ({
      _id: person._id,
      name: person.name || "Belirtilmemiş",
      title: person.title || "Belirtilmemiş",
      phone: person.phoneNumber,
      createdAt: person.createdAt,
      isDefault: person.is_default || false,
    }));

    recordActivity(
      req.user.id,
      RequestTypeList.SEGBIS_PERSONEL_LIST,
      null,
      `${unit.il} ${unit.ad} birimine ait personel listelendi`,
      unitId
    );

    res.status(200).json({
      success: true,
      unit: {
        id: unit._id,
        name: unit.ad,
        city: unit.il,
      },
      personnel: formattedPersonnel,
    });
  } catch (error) {
    console.error("Personel listelenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Personel listelenirken bir hata oluştu",
    });
  }
};

// POST /segbis/units/:unitId/personel
// Birime personel ekle
exports.addPersonnelToUnit = async (req, res) => {
  try {
    const unitId = req.params.unitId;
    const { name, title, phoneNumber, is_default } = req.body;

    const unit = await SegbisUnit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: `${unitId} ID'li birim bulunamadı`,
      });
    }

    const newPerson = new SegbisPerson({
      name,
      title,
      phoneNumber,
      mahkeme_id: unitId,
      is_default: is_default || false,
    });

    await newPerson.save();

    recordActivity(
      req.user.id,
      RequestTypeList.SEGBIS_PERSONEL_ADD,
      null,
      `${unit.il} ${unit.ad} birimine yeni personel eklendi: ${name}`,
      unitId
    );

    res.status(201).json({
      success: true,
      message: "Personel başarıyla eklendi",
      person: {
        id: newPerson._id,
        name: newPerson.name,
        title: newPerson.title,
        phone: newPerson.phoneNumber,
        isDefault: newPerson.is_default,
      },
    });
  } catch (error) {
    console.error("Personel eklenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Personel eklenirken bir hata oluştu",
    });
  }
};

// DELETE /segbis/units/:unitId/personel/:personId
// Birimden personel sil
exports.deletePersonnelFromUnit = async (req, res) => {
  try {
    const { unitId, personId } = req.params;

    const person = await SegbisPerson.findOne({
      _id: personId,
      mahkeme_id: unitId,
    });
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Personel bulunamadı",
      });
    }

    await SegbisPerson.deleteOne({ _id: personId });

    recordActivity(
      req.user.id,
      RequestTypeList.SEGBIS_PERSONEL_DELETE,
      null,
      `${unitId} biriminden personel silindi: ${person.name}`,
      unitId
    );

    res.status(200).json({
      success: true,
      message: "Personel başarıyla silindi",
    });
  } catch (error) {
    console.error("Personel silinirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Personel silinirken bir hata oluştu",
    });
  }
};

// PUT /segbis/units/:unitId/personel/:personId
// Personel güncelle
exports.updatePersonnel = async (req, res) => {
  try {
    const { unitId, personId } = req.params;
    const { name, title, phoneNumber, is_default } = req.body;

    const person = await SegbisPerson.findOne({
      _id: personId,
      mahkeme_id: unitId,
    });
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Personel bulunamadı",
      });
    }

    if (name !== undefined) person.name = name;
    if (title !== undefined) person.title = title;
    if (phoneNumber !== undefined) person.phoneNumber = phoneNumber;
    if (is_default !== undefined) person.is_default = is_default;

    await person.save();

    recordActivity(
      req.user.id,
      RequestTypeList.SEGBIS_PERSONEL_UPDATE,
      null,
      `${unitId} birimindeki personel güncellendi: ${person.name}`,
      unitId
    );

    res.status(200).json({
      success: true,
      message: "Personel başarıyla güncellendi",
      person: {
        id: person._id,
        name: person.name,
        title: person.title,
        phone: person.phoneNumber,
        isDefault: person.is_default,
      },
    });
  } catch (error) {
    console.error("Personel güncellenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Personel güncellenirken bir hata oluştu",
    });
  }
};

// POST /segbis/units
// Yeni birim ekle
exports.addUnit = async (req, res) => {
  try {
    const { ad, il } = req.body;

    if (!ad || !il) {
      return res.status(400).json({
        success: false,
        message: "Birim adı ve il alanı zorunludur",
      });
    }

    const newUnit = new SegbisUnit({
      ad,
      il,
    });

    await newUnit.save();

    recordActivity(
      req.user.id,
      RequestTypeList.SEGBIS_UNIT_ADD,
      null,
      `${il} iline yeni birim eklendi: ${ad}`,
      newUnit._id
    );

    res.status(201).json({
      success: true,
      message: "Birim başarıyla eklendi",
      unit: {
        id: newUnit._id,
        ad: newUnit.ad,
        il: newUnit.il,
      },
    });
  } catch (error) {
    console.error("Birim eklenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Birim eklenirken bir hata oluştu",
    });
  }
};
