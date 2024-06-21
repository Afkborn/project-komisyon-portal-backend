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
    izindeMi: {
      type: Boolean,
      default: false,
    },
    title: {
      type: Schema.Types.ObjectId,
      ref: "Title",
    },
  },
  options
);

const Person = mongoose.model("Person", personSchema);

const ZabitKatibi = Person.discriminator(
  "zabitkatibi",
  new Schema({
    durusmaKatibiMi: { type: Boolean, required: true },
    calistigiHakim: { type: Schema.Types.ObjectId, ref: "Person" },
  })
);

module.exports = {
  Person,
  // Baskan,
  // UyeHakim,
  zabitkatibi: ZabitKatibi,
  // Mubasir,
  // YaziİsleriMuduru,
};
