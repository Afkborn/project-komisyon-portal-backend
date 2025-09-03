const express = require("express");
const router = express.Router();
const axios = require("axios");

// Baro Levha Proxy Endpoint
router.post("/list", async (req, res) => {
  try {
    const { action, name, surname, sicil } = req.body;

    const params = new URLSearchParams();
    params.append("action", action || "list");
    params.append("name", name || "");
    params.append("surname", surname || "");
    params.append("sicil", sicil || "");

    const response = await axios.post(
      "https://eskisehirbarosu.org.tr/ajax/baro-levha.php",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseType: "text",
      }
    );

    // HTML'den avukatları ayıkla
    const html = response.data;
    const regex =
      /getDetail\('info','(\d+)','([^']+)','([^']+)','[^']+'\);\s*"\s*title="[^"]*"[^>]*>[^<]+<\/a>/g;
    const results = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        sicil: match[1],
        name: match[2],
        surname: match[3],
      });
    }

    res.status(200).json({
      success: true,
      lawyers: results,
    });
  } catch (error) {
    console.error("Baro Levha Proxy Hatası:", error);
    res.status(500).json({
      success: false,
      message: "Baro Levha verisi alınırken hata oluştu",
    });
  }
});

router.post("/info", async (req, res) => {
  try {
    const { sicil } = req.body;
    if (!sicil) {
      return res.status(400).json({
        success: false,
        message: "Sicil numarası gereklidir",
      });
    }

    const params = new URLSearchParams();
    params.append("action", "info");
    params.append("sicil", sicil);

    const response = await axios.post(
      "https://eskisehirbarosu.org.tr/ajax/baro-levha.php",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseType: "text",
      }
    );

    const html = response.data;

    // Ad Soyad (birleşik)
    const nameMatch = html.match(/<h3>([^<]+)<\/h3>/);
    const fullName = nameMatch ? nameMatch[1].trim() : "";

    // Sicil
    const sicilMatch = html.match(/Sicil No:\s*<strong>(\d+)<\/strong>/);
    const sicilNo = sicilMatch ? sicilMatch[1] : sicil;

    // Fotoğraf
    const photoMatch = html.match(/<img src="([^"]+)"[^>]*>/);
    let photoUrl = photoMatch ? photoMatch[1] : "";
    if (photoUrl && !photoUrl.startsWith("http")) {
      photoUrl =
        "https://eskisehirbarosu.org.tr/" + photoUrl.replace(/^\//, "");
    }

    // İletişim bilgileri
    let phone = "";
    let fax = "";
    let email = "";
    let address = "";

    // contact-info içeriğini bul
    const contactUlMatch = html.match(
      /<ul class="contact-info">([\s\S]*?)<\/ul>/
    );
    if (contactUlMatch) {
      const ulContent = contactUlMatch[1];

      // Her bir <li> için ayıkla
      const liRegex = /<li>([\s\S]*?)<\/li>/g;
      let liMatch;
      while ((liMatch = liRegex.exec(ulContent)) !== null) {
        const liHtml = liMatch[1];

        // Telefon
        if (liHtml.includes("fa-phone")) {
          const phoneMatch = liHtml.match(/<a[^>]*>([^<]+)<\/a>/);
          if (phoneMatch) phone = phoneMatch[1].trim();
        }
        // Faks
        else if (liHtml.includes("fa-fax")) {
          const faxMatch = liHtml.match(/<a[^>]*>([^<]+)<\/a>/);
          if (faxMatch) fax = faxMatch[1].trim();
        }
        // Email
        else if (liHtml.includes("fa-envelope")) {
          const emailMatch = liHtml.match(/href="mailto:([^"]+)"/);
          if (emailMatch) email = emailMatch[1].trim();
        }
        // Adres
        else if (liHtml.includes("fa-map-marker")) {
          // Adres genellikle <span ...></span> ADRES şeklinde geliyor
          const addressMatch = liHtml.match(
            /fa-map-marker[^>]*><\/span>\s*([^<]+)/
          );
          if (addressMatch) address = addressMatch[1].trim();
        }
      }
    }

    res.status(200).json({
      success: true,
      lawyer: {
        fullName,
        sicil: sicilNo,
        phone,
        fax,
        email,
        address,
        photoUrl,
      },
    });
  } catch (error) {
    console.error("Baro Levha Info Proxy Hatası:", error);
    res.status(500).json({
      success: false,
      message: "Baro Levha detay verisi alınırken hata oluştu",
    });
  }
});

module.exports = router;
