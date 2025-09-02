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
// ...existing code...
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

// ...existing code...

// ...existing code...

// ...existing code...

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

// Ünvan ve isim formatlama fonksiyonu
function formatTitleOrName(str) {
  if (!str) return "";
  // mb, mbş, müb, ' mbş' gibi varyasyonlar için kontrol
  const normalized = str.toLowerCase().replace(/\s+/g, "").replace(/ş/g, "ş");
  if (
    normalized === "mb" ||
    normalized === "mbş" ||
    normalized === "müb" ||
    normalized === "mbasir" ||
    normalized === "mubasir" ||
    normalized === "mübaşir" ||
    normalized === "mub" ||
    normalized === "mbas" ||
    normalized === "mbasir" ||
    normalized === "mbş" ||
    normalized === "mbş".replace(/\s+/g, "")
  ) {
    return "Mübaşir";
  }
  // Başında/sonunda boşluk varsa da yakala
  if (
    /^mbş$|^mb$|^müb$|^mbasir$|^mubasir$|^mübaşir$|^mub$|^mbas$/i.test(
      normalized
    )
  ) {
    return "Mübaşir";
  }
  // İlk harf büyük, gerisi küçük
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Personelleri SQLite'dan MongoDB'ye aktarma
const migratePersonnel = async (db, courtMap) => {
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

          // Ad ve soyadı ayırma kaldırıldı, doğrudan name olarak kullan
          const fullName = formatTitleOrName(row.ad ? row.ad.trim() : "");

          // Ünvanı özel kurala göre string olarak al
          const title = formatTitleOrName(row.gorev ? row.gorev.trim() : "");

          // Telefon numarasını formatla
          const phoneNumber = formatPhoneNumber(row.telefon_no);

          if (!phoneNumber) {
            console.warn(`Geçersiz telefon numarası: ${row.telefon_no}`);
            continue; // Bu personeli atla
          }

          const personData = {
            _id: new mongoose.Types.ObjectId(),
            name: fullName, // Ad ve soyad birleşik olarak kaydedildi
            title: title, // Artık string olarak aktarılıyor
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

        // ...existing code...

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

    // Mahkemeleri aktar ve mahkeme ID mapping'i al
    const courtMap = await migrateCourts(db);

    // Personelleri aktar
    const personnelCount = await migratePersonnel(db, courtMap);

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
