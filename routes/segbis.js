const express = require("express");
const router = express.Router();
const SegbisUnit = require("../model/SegbisUnit");
const SegbisPerson = require("../model/SegbisPerson");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const { NumberPlateList } = require("../constants/NumberPlateList");
const { CourthousePhones } = require("../constants/CourthousePhones");
const { Regions } = require("../constants/Regions");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// Plaka kodunu alma fonksiyonu
function getPlateCode(input) {
  if (!input) return "00";

  // Girdiyi büyük harfe çevir
  const cityName = input.toLocaleUpperCase("tr-TR").trim();

  // Önce direkt olarak tam eşleşme ara
  if (NumberPlateList[cityName]) {
    return NumberPlateList[cityName];
  }

  // Kelimelere bölerek ara - "İSTANBUL BAM" gibi bileşik isimleri kontrol eder
  const parts = cityName.split(" ");
  for (let i = parts.length; i > 0; i--) {
    const cityCandidate = parts.slice(0, i).join(" ");
    if (NumberPlateList[cityCandidate]) {
      return NumberPlateList[cityCandidate];
    }
  }

  // Il adının içinde herhangi bir kelime eşleşiyor mu kontrol et
  // const keys = Object.keys(NumberPlateList);
  // for (const key of keys) {
  //   if (cityName.includes(key)) {
  //     return NumberPlateList[key];
  //   }
  // }

  return "00"; // Eşleşme yoksa
}

// Bölge bilgisini getiren fonksiyon
function getRegion(cityName) {
  if (!cityName) return "Diğer";

  const normalizedCity = cityName.toLocaleUpperCase("tr-TR").trim();

  // Direkt eşleşme
  if (Regions[normalizedCity]) {
    return Regions[normalizedCity];
  }

  // Kısmi eşleşme
  const parts = normalizedCity.split(" ");
  for (let i = parts.length; i > 0; i--) {
    const cityCandidate = parts.slice(0, i).join(" ");
    if (Regions[cityCandidate]) {
      return Regions[cityCandidate];
    }
  }

  // // İçerik eşleşmesi
  // const keys = Object.keys(Regions);
  // for (const key of keys) {
  //   if (normalizedCity.includes(key)) {
  //     return Regions[key];
  //   }
  // }

  return "Diğer";
}

// İlleri getir
router.get("/cities", auth, Logger("GET /segbis/cities"), async (req, res) => {
  try {
    // Tüm birimlerin illerini çek ve benzersiz illeri bul
    const units = await SegbisUnit.find().select("il").lean();

    // Benzersiz illeri bul
    const uniqueCities = [...new Set(units.map((unit) => unit.il))];

    // İl listesini oluştur
    const cities = uniqueCities.map((city, index) => {
      // Plaka ve bölge bilgisini al
      const code = getPlateCode(city);
      const region = getRegion(city);

      // ADANA ve ADANA BAM için telefon numarası ekle
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
});

// Bir ile ait birimleri getir
router.get(
  "/cities/:cityName/units",
  auth,
  Logger("GET /segbis/cities/:cityName/units"),
  async (req, res) => {
    try {
      const cityName = req.params.cityName;

      // İsim veya ID ile arama yapabiliriz
      let query = {};
      if (isNaN(cityName)) {
        // İsim ile arama
        query = { il: cityName };
      } else {
        // Eğer sayı girilmişse, illerin listesinden id ile bul
        // Gerçek uygulamada bu mantık değişebilir
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

      // Birimler MongoDB'de il adına göre saklandığı için direkt arama yapılabilir
      const units = await SegbisUnit.find(query).lean();

      // Birim tipi belirlemek için basit bir mantık
      const getUnitType = (unitName) => {
        if (unitName.includes("CEZA")) return "Mahkeme";
        if (unitName.includes("HUKUK")) return "Mahkeme";
        if (unitName.includes("SAVCILIK")) return "Savcılık";
        if (unitName.includes("İCRA")) return "İcra Dairesi";
        return "Diğer";
      };

      // Frontend için uygun formata dönüştür
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
  }
);

// Bir birime ait personeli getir
router.get(
  "/units/:unitId/personel",
  auth,
  Logger("GET /segbis/units/:unitId/personnel"),
  async (req, res) => {
    try {
      const unitId = req.params.unitId;

      // Birim bilgilerini çek
      const unit = await SegbisUnit.findById(unitId).lean();
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: `${unitId} ID'li birim bulunamadı`,
        });
      }

  // Birime ait personelleri getir
  const personnel = await SegbisPerson.find({ mahkeme_id: unitId }).lean();

      // Frontend için uygun formata dönüştür
      const formattedPersonnel = personnel.map((person) => ({
        _id: person._id,
        name: person.name || "Belirtilmemiş",
        title: person.title || "Belirtilmemiş",
        phone: person.phoneNumber,
        createdAt : person.createdAt,
        isDefault: person.is_default || false,
      }));

      res.status(200).json({
        success: true,
        unit: {
          id: unit._id,
          name: unit.ad,
          city: unit.il,
        },
        personnel: formattedPersonnel,
      });

      recordActivity(
        req.user.id,
        RequestTypeList.SEGBIS_PERSONEL_LIST,
        null,
        `${unit.il} ${unit.ad} birimine ait personel listelendi`,
        unitId
      );
    } catch (error) {
      console.error("Personel listelenirken hata oluştu:", error);
      res.status(500).json({
        success: false,
        message: "Personel listelenirken bir hata oluştu",
      });
    }
  }
);

// Birime personel ekle
router.post(
  "/units/:unitId/personel",
  auth,
  Logger("POST /segbis/units/:unitId/personel"),
  async (req, res) => {
    try {
      const unitId = req.params.unitId;
      const { name, title, phoneNumber, is_default } = req.body;

      // Birim var mı kontrol et
      const unit = await SegbisUnit.findById(unitId);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: `${unitId} ID'li birim bulunamadı`,
        });
      }

      // Personel oluştur
      const newPerson = new SegbisPerson({
        name,
        title,
        phoneNumber,
        mahkeme_id: unitId,
        is_default: is_default || false,
      });

      await newPerson.save();

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

      recordActivity(
        req.user.id,
        RequestTypeList.SEGBIS_PERSONEL_ADD,
        null,
        `${unit.il} ${unit.ad} birimine yeni personel eklendi: ${name}`,
        unitId
      );
    } catch (error) {
      console.error("Personel eklenirken hata oluştu:", error);
      res.status(500).json({
        success: false,
        message: "Personel eklenirken bir hata oluştu",
      });
    }
  }
);

// Birimden personel sil
router.delete(
  "/units/:unitId/personel/:personId",
  auth,
  Logger("DELETE /segbis/units/:unitId/personel/:personId"),
  async (req, res) => {
    try {
      const { unitId, personId } = req.params;

      // Personel var mı kontrol et
      const person = await SegbisPerson.findOne({ _id: personId, mahkeme_id: unitId });
      if (!person) {
        return res.status(404).json({
          success: false,
          message: "Personel bulunamadı",
        });
      }

      await SegbisPerson.deleteOne({ _id: personId });

      res.status(200).json({
        success: true,
        message: "Personel başarıyla silindi",
      });

      recordActivity(
        req.user.id,
        RequestTypeList.SEGBIS_PERSONEL_DELETE,
        null,
        `${unitId} biriminden personel silindi: ${person.name}`,
        unitId
      );
    } catch (error) {
      console.error("Personel silinirken hata oluştu:", error);
      res.status(500).json({
        success: false,
        message: "Personel silinirken bir hata oluştu",
      });
    }
  }
);

// Personel güncelle
router.put(
  "/units/:unitId/personel/:personId",
  auth,
  Logger("PUT /segbis/units/:unitId/personel/:personId"),
  async (req, res) => {
    try {
      const { unitId, personId } = req.params;
      const { name, title, phoneNumber, is_default } = req.body;

      // Personel var mı kontrol et
      const person = await SegbisPerson.findOne({ _id: personId, mahkeme_id: unitId });
      if (!person) {
        return res.status(404).json({
          success: false,
          message: "Personel bulunamadı",
        });
      }

      // Alanları güncelle
      if (name !== undefined) person.name = name;
      if (title !== undefined) person.title = title;
      if (phoneNumber !== undefined) person.phoneNumber = phoneNumber;
      if (is_default !== undefined) person.is_default = is_default;

      await person.save();

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

      recordActivity(
        req.user.id,
        RequestTypeList.SEGBIS_PERSONEL_UPDATE,
        null,
        `${unitId} birimindeki personel güncellendi: ${person.name}`,
        unitId
      );
    } catch (error) {
      console.error("Personel güncellenirken hata oluştu:", error);
      res.status(500).json({
        success: false,
        message: "Personel güncellenirken bir hata oluştu",
      });
    }
  }
);

// Yeni birim ekle
router.post(
  "/units",
  auth,
  Logger("POST /segbis/units"),
  async (req, res) => {
    try {
      const { ad, il } = req.body;

      // Zorunlu alanlar kontrolü
      if (!ad || !il) {
        return res.status(400).json({
          success: false,
          message: "Birim adı ve il alanı zorunludur",
        });
      }

      // Birim oluştur
      const newUnit = new SegbisUnit({
        ad,
        il,
      });

      await newUnit.save();

      res.status(201).json({
        success: true,
        message: "Birim başarıyla eklendi",
        unit: {
          id: newUnit._id,
          ad: newUnit.ad,
          il: newUnit.il,
        },
      });

      recordActivity(
        req.user.id,
        RequestTypeList.SEGBIS_UNIT_ADD,
        null,
        `${il} iline yeni birim eklendi: ${ad}`,
        newUnit._id
      );
    } catch (error) {
      console.error("Birim eklenirken hata oluştu:", error);
      res.status(500).json({
        success: false,
        message: "Birim eklenirken bir hata oluştu",
      });
    }
  }
);

module.exports = router;
