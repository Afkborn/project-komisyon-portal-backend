// models/person.js
const mongoose = require("mongoose");
const Messages = require("../constants/Messages");
const { Schema } = mongoose;

const options = {
  discriminatorKey: "kind",
  collection: "persons",
};

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
      // default: Date.now,
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
    gecmisBirimler: [
      {
        type: Schema.Types.ObjectId,
        ref: "PersonUnit",
      },
    ],
    status: {
      type: Boolean,
      default: true,
    },
    deactivationReason: {
      type: String,
    },
    deactivationDate: {
      type: Date,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    izinler: [
      {
        type: Schema.Types.ObjectId,
        ref: "Leave",
      },
    ],
    title: {
      type: Schema.Types.ObjectId,
      ref: "Title",
    },
    description: {
      type: String,
    },
    level: {
      type: Number,
    },
  },
  options
);

// GPT ABİM MÜTHİŞ YAZDI BURAYI.
// Buradaki virtual field'ı kullanarak, bir kişinin izinde olup olmadığını kontrol edebiliriz.
personSchema.virtual("izindeMi").get(function () {
  const now = new Date();
  return this.izinler.some((leave) => {
    return now >= leave.startDate && now <= leave.endDate;
  });
});

personSchema.set("toJSON", { virtuals: true });
personSchema.set("toObject", { virtuals: true });

const Person = mongoose.model("Person", personSchema);

const ZabitKatibi = Person.discriminator(
  "zabitkatibi",
  new Schema({
    durusmaKatibiMi: { type: Boolean, required: true, default: false },
    calistigiKisi: {
      type: Schema.Types.ObjectId,
      ref: "Person",
      default: null,
    },
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
