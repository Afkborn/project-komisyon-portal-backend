// models/person.js
const mongoose = require("mongoose");
const Messages = require("../constants/Messages");
const Leave = require("./Leave");
const { Schema } = mongoose;

const options = { discriminatorKey: "kind", collection: "persons" };

const personSchema = new Schema(
  {
    sicil: {
      type: Number,
      required: [true, Messages.PERSON_SICIL_REQUIRED],
      unique: true,
    },
    ad: {
      type: String,
      required: [true, Messages.PERSON_NAME_REQUIRED],
    },
    soyad: {
      type: String,
      required: [true, Messages.PERSON_SURNAME_REQUIRED],
    },
    goreveBaslamaTarihi: {
      type: Date,
      //   required: [true, Messages.PERSON_GOREVE_BASLAMA_TARIHI_REQUIRED],
    },
    birimID: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
    },
    birimeBaslamaTarihi: {
      type: Date,
      //   required: [true, Messages.BIRIME_BASLAMA_TARIHI_REQUIRED],
    },
    status: {
      type: Boolean,
      default: true,
    },
    izinler: [
      {
        type: Schema.Types.ObjectId,
        ref: "Leave",
      },
    ],
  },
  options
);

const Person = mongoose.model("Person", personSchema);

const Baskan = Person.discriminator(
  "Baskan",
  new Schema({
    // Başkan'a özgü özellikler buraya eklenebilir
  })
);

const UyeHakim = Person.discriminator(
  "UyeHakim",
  new Schema({
    // Üye Hakim'e özgü özellikler buraya eklenebilir
  })
);

const ZabitKatibi = Person.discriminator(
  "ZabitKatibi",
  new Schema({
    durusmaKatibiMi: { type: Boolean, required: true },
  })
);

const Mubasir = Person.discriminator(
  "Mubasir",
  new Schema({
    // Mübaşir'e özgü özellikler buraya eklenebilir
  })
);

const YaziİsleriMuduru = Person.discriminator(
  "YaziİsleriMuduru",
  new Schema({
    // Yazı İşleri Müdürü'ne özgü özellikler buraya eklenebilir
  })
);

module.exports = {
  Person,
  Baskan,
  UyeHakim,
  ZabitKatibi,
  Mubasir,
  YaziİsleriMuduru,
};
