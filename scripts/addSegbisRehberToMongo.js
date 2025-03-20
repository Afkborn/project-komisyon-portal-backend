/**
 * Bu script rehber.db SQLite veritabanındaki verileri MongoDB'ye aktarır.
 * SegbisUnit ve SegbisPerson koleksiyonlarını oluşturur.
 *
 * Kullanım:
 * node scripts/addSegbisRehberToMongo.js
 */

const mongoose = require("mongoose");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const SegbisUnit = require("../model/SegbisUnit");
const SegbisPerson = require("../model/SegbisPerson");
const Title = require("../model/Title");
require("dotenv").config();

// SQLite veritabanı yolu
const dbPath = path.join(__dirname, "..", "scripts", "rehber.db");

// MongoDB bağlantısı - migrateNobet.js stili
const connectToMongoDB = async () => {
  const connectionString = process.env.MONGO_DB_CONNECTION;

  if (!connectionString) {
    throw new Error(
      "MONGO_DB_CONNECTION bulunamadı! Lütfen .env dosyasını kontrol edin."
    );
  }

  console.log("MongoDB bağlantısı başlatılıyor...");
  await mongoose.connect(connectionString);
  console.log("MongoDB bağlantısı başarılı.");
};

// SQLite veritabanı bağlantısı
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    // Dosyanın varlığını kontrol et
    if (!fs.existsSync(dbPath)) {
      return reject(
        new Error(`SQLite veritabanı dosyası bulunamadı: ${dbPath}`)
      );
    }

    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`SQLite veritabanına bağlanıldı: ${dbPath}`);
        resolve(db);
      }
    });
  });
};

// Tüm ünvanları getir (cache için)
const getAllTitles = async () => {
  try {
    const titles = await Title.find({}).lean();
    console.log(`${titles.length} adet ünvan veritabanından yüklendi`);
    return titles;
  } catch (error) {
    console.error("Ünvanlar yüklenirken hata:", error);
    return [];
  }
};

// Ünvan eşleştirme - Geliştirilmiş versiyon
const findTitleId = async (titleText, allTitles) => {
  if (!titleText) {
    // Title belirtilmemişse bilinmiyor title'ını bul veya oluştur
    return await findOrCreateUnknownTitle(allTitles);
  }

  // Gelen metin uppercase olduğu için lowercase yapıp arama yapalım
  const normalizedText = titleText.toLowerCase().trim();

  // İlk önce tam eşleşme arayalım
  const exactMatch = allTitles.find(
    (t) =>
      t.name.toLowerCase() === normalizedText ||
      t.kind.toLowerCase() === normalizedText
  );

  if (exactMatch) return exactMatch._id;

  // Tam eşleşme bulunamadı, içerik eşleşmesi arayalım
  const partialMatch = allTitles.find(
    (t) =>
      t.name.toLowerCase().includes(normalizedText) ||
      normalizedText.includes(t.name.toLowerCase()) ||
      t.kind.toLowerCase().includes(normalizedText) ||
      normalizedText.includes(t.kind.toLowerCase())
  );

  if (partialMatch) return partialMatch._id;

  // Özel durumlar - görev adlarını standartlaştırma
  if (
    normalizedText.includes("zabit") ||
    normalizedText.includes("zabıt") ||
    normalizedText.includes("katip") ||
    normalizedText.includes("kâtip")
  ) {
    const katipTitle = allTitles.find(
      (t) =>
        t.name.toLowerCase().includes("kâtib") ||
        t.name.toLowerCase().includes("katib")
    );
    if (katipTitle) return katipTitle._id;
  }

  if (normalizedText.includes("müdür")) {
    const mudurTitle = allTitles.find((t) =>
      t.name.toLowerCase().includes("müdür")
    );
    if (mudurTitle) return mudurTitle._id;
  }

  if (
    normalizedText.includes("mübaşir") ||
    normalizedText.includes("mubasir")
  ) {
    const mubasirTitle = allTitles.find((t) =>
      t.name.toLowerCase().includes("mübaşir")
    );
    if (mubasirTitle) return mubasirTitle._id;
  }

  // Hiçbir eşleşme bulunamadı, "Bilinmiyor" ünvanını bul veya oluştur
  return await findOrCreateUnknownTitle(allTitles);
};

// "Bilinmiyor" ünvanını bul veya oluştur - Yeni fonksiyon
const findOrCreateUnknownTitle = async (allTitles) => {
  // Önce mevcut Bilinmiyor ünvanını ara
  const unknownTitle = allTitles.find(
    (t) =>
      t.name.toLowerCase() === "bilinmiyor" ||
      t.kind.toLowerCase() === "bilinmiyor"
  );

  if (unknownTitle) return unknownTitle._id;

  // Bilinmiyor ünvanı bulunamadıysa oluştur
  try {
    console.log("Bilinmiyor ünvanı oluşturuluyor...");
    const newUnknownTitle = await Title.create({
      name: "Bilinmiyor",
      kind: "bilinmiyor",
      deletable: false,
      oncelikSirasi: 999,
    });

    // Cache'i güncelle
    allTitles.push(newUnknownTitle);

    console.log("Bilinmiyor ünvanı oluşturuldu:", newUnknownTitle._id);
    return newUnknownTitle._id;
  } catch (error) {
    console.error("Bilinmiyor ünvanı oluşturulurken hata:", error);
    throw new Error("Title kaydedilemiyor ve zorunlu alan");
  }
};

// Telefon numarasını formatlama
const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  // Sadece rakamları al
  const digitsOnly = phone.replace(/\D/g, "");

  // 10 haneli değilse kontrol et
  if (digitsOnly.length !== 10) {
    // Başında 0 varsa ve 11 haneliyse ilk karakteri at
    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      return digitsOnly.substring(1);
    }
    // Diğer durumlarda orijinali döndür ya da null
    return digitsOnly.length === 10 ? digitsOnly : null;
  }

  return digitsOnly;
};

// İsim ve soyadı ayırma
const extractNameParts = (fullName) => {
  if (!fullName || typeof fullName !== "string") {
    return { ad: "", soyad: "" };
  }

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return { ad: "", soyad: "" };
  }

  // Son kelimeyi soyad, geri kalanı ad olarak al
  const parts = trimmedName.split(" ");
  if (parts.length === 1) {
    return { ad: parts[0], soyad: "" };
  }

  const soyad = parts.pop();
  const ad = parts.join(" ");

  return { ad, soyad };
};

// Mahkemeleri SQLite'dan MongoDB'ye aktarma
const migrateCourts = async (db, allTitles) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM Mahkeme", async (err, rows) => {
      if (err) {
        return reject(err);
      }

      console.log(`${rows.length} adet mahkeme kaydı okundu`);

      // MongoDB'de mevcut SegbisUnit kayıtlarını temizle
      try {
        await SegbisUnit.deleteMany({});
        console.log("Mevcut SegbisUnit kayıtları silindi");

        const courts = [];
        const courtMap = {}; // ID -> ObjectId eşleştirmesi için map

        // SQLite verileri MongoDB formatına dönüştür
        for (const row of rows) {
          const courtData = {
            _id: new mongoose.Types.ObjectId(), // Yeni ObjectId oluştur
            ad: row.ad ? row.ad.trim() : "Bilinmiyor",
            il: row.il ? row.il.trim() : "Bilinmiyor",
            personelList: [],
            sqliteId: row.id, // SQLite ID'sini sakla - Kritik değişiklik!
          };

          courts.push(courtData);

          // SQLite ID'sini MongoDB ObjectId ile eşleştir
          if (row.id) {
            courtMap[row.id] = courtData._id;
          }
        }

        // MongoDB'ye toplu olarak ekle
        if (courts.length > 0) {
          await SegbisUnit.insertMany(courts);
          console.log(`${courts.length} adet mahkeme MongoDB'ye aktarıldı`);
        }

        resolve(courtMap);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Personelleri SQLite'dan MongoDB'ye aktarma
const migratePersonnel = async (db, courtMap, allTitles) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM Personel", async (err, rows) => {
      if (err) {
        return reject(err);
      }

      console.log(`${rows.length} adet personel kaydı okundu`);

      // MongoDB'de mevcut SegbisPerson kayıtlarını temizle
      try {
        await SegbisPerson.deleteMany({});
        console.log("Mevcut SegbisPerson kayıtları silindi");

        const personnel = [];
        const unknownCourtIds = new Set();
        const unknownTitleIds = new Set();

        // SQLite verileri MongoDB formatına dönüştür
        for (const row of rows) {
          // Personel tablosunda mahkeme_id bir sayı olarak bulunuyor
          const courtId = row.mahkeme_id;
          let mahkemeId = null;

          // Mahkeme ID'sini sayı olarak bul
          if (courtMap[courtId]) {
            mahkemeId = courtMap[courtId];
          } else {
            // Mahkeme bulunamadı, hata log'u
            unknownCourtIds.add(courtId);
            continue; // Bu personeli atla
          }

          // Ad ve soyadı ayır
          const { ad, soyad } = extractNameParts(row.ad);

          // Ünvan ID'sini bul - Şimdi async olduğu için await ile çağırıyoruz
          const titleId = await findTitleId(row.gorev, allTitles);
          if (!titleId) {
            unknownTitleIds.add(row.gorev);
            continue; // Bu personeli atla
          }

          // Telefon numarasını formatla
          const phoneNumber = formatPhoneNumber(row.telefon_no);

          const personData = {
            _id: new mongoose.Types.ObjectId(),
            ad: ad,
            soyad: soyad,
            title: titleId, // Her durumda bir title ID'si olacak
            phoneNumber: phoneNumber,
            mahkeme_id: mahkemeId,
            is_default: row.is_default === 1,
          };

          personnel.push(personData);

          // Mahkeme'nin personelList dizisine bu personeli ekle
          if (mahkemeId) {
            await SegbisUnit.findByIdAndUpdate(mahkemeId, {
              $push: { personelList: personData._id },
            });
          }
        }

        // MongoDB'ye toplu olarak ekle
        if (personnel.length > 0) {
          await SegbisPerson.insertMany(personnel);
          console.log(`${personnel.length} adet personel MongoDB'ye aktarıldı`);
        }

        // Hata logları
        if (unknownCourtIds.size > 0) {
          console.warn(
            `Bulunamayan ${unknownCourtIds.size} mahkeme ID'si var.`
          );
          console.warn(
            `İlk 10 ID: ${[...unknownCourtIds].slice(0, 10).join(", ")}`
          );
        }

        if (unknownTitleIds.size > 0) {
          console.warn(`Eşlenemeyen ${unknownTitleIds.size} görev/ünvan var:`);
          console.warn(
            `Örnekler: ${[...unknownTitleIds].slice(0, 5).join(", ")}`
          );
        }

        resolve(personnel.length);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Aktarım işlemini başlat
const startMigration = async () => {
  let db;
  try {
    console.log("Aktarım işlemi başlatılıyor...");

    // MongoDB'ye bağlan - migrateNobet.js stili
    await connectToMongoDB();

    // SQLite veritabanına bağlan
    db = await openDatabase();

    // Tüm ünvanları getir
    const allTitles = await getAllTitles();

    // Artık eksik ünvan kontrolünü findTitleId fonksiyonu içinde yapıyoruz
    // Bu kısım artık gerekli değil:
    // const unknownTitle = allTitles.find(
    //   (t) => t.name.toLowerCase() === "bilinmiyor"
    // );
    // if (!unknownTitle) {
    //   console.log('"Bilinmiyor" ünvanı bulunamadı, ekleniyor...');
    //   const newUnknownTitle = new Title({
    //     name: "Bilinmiyor",
    //     kind: "Bilinmiyor",
    //     deletable: false,
    //     oncelikSirasi: 999,
    //   });
    //   await newUnknownTitle.save();
    //   allTitles.push(newUnknownTitle);
    // }

    // Mahkemeleri aktar ve mahkeme ID mapping'i al
    const courtMap = await migrateCourts(db, allTitles);

    // Personelleri aktar
    const personnelCount = await migratePersonnel(db, courtMap, allTitles);

    console.log("Aktarım işlemi başarıyla tamamlandı.");
    console.log(
      `Toplam ${
        Object.keys(courtMap).length
      } mahkeme ve ${personnelCount} personel aktarıldı.`
    );
  } catch (error) {
    console.error("Aktarım işlemi sırasında hata:", error);
  } finally {
    // SQLite bağlantısını kapat
    if (db) {
      db.close((err) => {
        if (err) {
          console.error("SQLite bağlantısı kapatılırken hata:", err);
        } else {
          console.log("SQLite bağlantısı kapatıldı");
        }

        // MongoDB bağlantısını kapat
        mongoose.connection
          .close()
          .then(() => {
            console.log("MongoDB bağlantısı kapatıldı");
            process.exit(0);
          })
          .catch((err) => {
            console.error("MongoDB bağlantısı kapatılırken hata:", err);
            process.exit(1);
          });
      });
    } else {
      // MongoDB bağlantısını kapat
      mongoose.connection
        .close()
        .then(() => {
          console.log("MongoDB bağlantısı kapatıldı");
          process.exit(0);
        })
        .catch((err) => {
          console.error("MongoDB bağlantısı kapatılırken hata:", err);
          process.exit(1);
        });
    }
  }
};

// Başlangıç noktası
startMigration()
  .then(() => {
    console.log("İşlem tamamlandı.");
  })
  .catch((err) => {
    console.error("İşlem sırasında hata oluştu:", err);
    process.exit(1);
  });

// Süreci çıkış sinyalleri ile düzgün sonlandır
process.on("SIGTERM", () => {
  console.log("SIGTERM sinyali alındı. İşlem sonlandırılıyor...");
  mongoose.connection
    .close()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

process.on("SIGINT", () => {
  console.log("SIGINT sinyali alındı. İşlem sonlandırılıyor...");
  mongoose.connection
    .close()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
