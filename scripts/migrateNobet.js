const mongoose = require("mongoose");
const { Person } = require("../model/Person");
require("dotenv").config();

async function migrateNobetTutuyorMu() {
  try {
    const connectionString = process.env.MONGO_DB_CONNECTION;

    if (!connectionString) {
      throw new Error(
        "MONGO_DB_CONNECTION bulunamadı! Lütfen .env dosyasını kontrol edin."
      );
    }

    console.log("MongoDB bağlantısı başlatılıyor...");
    await mongoose.connect(connectionString);
    console.log("MongoDB bağlantısı başarılı.");

    const zabitKatibleri = await Person.find({
      kind: "zabitkatibi",
    });
    console.log(`Zabıt Katibi ${zabitKatibleri.length} kullanıcı bulundu.`);

    let migratedCount = 0;
    for (const person of zabitKatibleri) {
      // Mevcut yapıyı görmek için log alalım
      console.log(
        `Checking person ${person.ad} ${person.soyad} (${person.kind}):`
      );
      // person'ın nobetTutuyorMu field'ı yoksa, default olarak false ata
      if (!person.nobetTutuyorMu) {
        person.nobetTutuyorMu = false;
        await person.save();
        migratedCount++;
        console.log(
          `✓ Added NobetTutuyorMu attr to: ${person.ad} ${person.soyad} (${migratedCount}/${zabitKatibleri.length})`
        );
      }
    }

    const mubasirler = await Person.find({
      kind: "mubasir",
    });
    console.log(`Mübaşir ${mubasirler.length} kullanıcı bulundu.`);
    for (const person of mubasirler) {
      // Mevcut yapıyı görmek için log alalım
      console.log(
        `Checking person ${person.ad} ${person.soyad} (${person.kind}):`
      );
      // person'ın nobetTutuyorMu field'ı yoksa, default olarak false ata
      if (!person.nobetTutuyorMu) {
        person.nobetTutuyorMu = false;
        await person.save();
        migratedCount++;
        console.log(
          `✓ Added NobetTutuyorMu attr to: ${person.ad} ${person.soyad} (${migratedCount}/${mubasirler.length})`
        );
      }
    }

    console.log(
      `\nMigration tamamlandı. ${migratedCount} kullanıcı güncellendi.`
    );
    process.exit(0);
  } catch (error) {
    console.error("Migration hatası:", error.message);
    process.exit(1);
  }
}

migrateNobetTutuyorMu();
