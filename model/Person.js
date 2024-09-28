// models/person.js
const mongoose = require("mongoose");
const Messages = require("../constants/Messages");
const { Schema } = mongoose;

const options = {
  discriminatorKey: "kind",
  collection: "persons",
  timestamps: true,
};

const personSchema = new Schema(
  {
    // sicil 6 veya 5
    sicil: {
      type: Number,
      required: [true, Messages.PERSON_SICIL_REQUIRED],
      unique: true,
      validate: {
        validator: function (v) {
          return v.toString().length === 5 || v.toString().length === 6;
        },
        message: (props) => Messages.VALID_SICIL(props.value),
      },
    },
    ad: {
      type: String,
      required: [true, Messages.PERSON_NAME_REQUIRED],
      validate: [
        {
          validator: function (v) {
            return v.length > 1;
          },
          message: "İsim en az 2 karakter olmalıdır",
        },
        {
          validator: function (v) {
            return v.length <= 20;
          },
          message: "İsim en fazla 20 karakter olmalıdır",
        },
      ],
    },
    soyad: {
      type: String,
      required: [true, Messages.PERSON_SURNAME_REQUIRED],
      validate: [
        {
          validator: function (v) {
            return v.length > 1;
          },
          message: "Soyisim en az 2 karakter olmalıdır",
        },
        {
          validator: function (v) {
            return v.length <= 20;
          },
          message: "Soyisim en fazla 20 karakter olmalıdır",
        },
      ],
    },
    goreveBaslamaTarihi: {
      type: Date,
      // default: Date.now,
      //   required: [true, Messages.PERSON_GOREVE_BASLAMA_TARIHI_REQUIRED],
    },
    birimID: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
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
      validate: [
        {
          validator: function (v) {
            return v.length <= 100;
          },
          message: "Açıklama en fazla 100 karakter olmalıdır",
        },
      ],
    },
    level: {
      type: Number,
      min: 1,
      max: 5,
    },

    tckn: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{11}$/.test(v);
        },
        message: (props) => Messages.VALID_TCKN(props.value),
      },
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => Messages.VALID_PHONE(props.value),
      },
    },
    email: {
      type: String,
    },
    birthDate: {
      type: Date,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-", ""],
      default: "",
    },
    keyboardType: {
      type: String,
      enum: ["F", "Q", ""],
      default: "",
    },
  },
  options
);

// GPT ABİM MÜTHİŞ YAZDI BURAYI.
// Buradaki virtual field'ı kullanarak, bir kişinin izinde olup olmadığını kontrol edebiliriz.
personSchema.virtual("izindeMi").get(function () {
  const now = new Date();
  if (!this.izinler || this.izinler.length === 0) {
    return false; // Eğer izinler yoksa false döner
  }
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
    durusmaKatibiMi: { type: Boolean, default: false },
    calistigiKisi: {
      type: Schema.Types.ObjectId,
      ref: "Person",
      default: null,
    },
  })
);

const YaziIsleriMuduru = Person.discriminator(
  "yaziislerimudürü", // ü harfi var ancak sabit title böyle olduğu için değiştiremiyorum.
  new Schema({
    ikinciBirimID: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
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
  yaziislerimudürü: YaziIsleriMuduru,
};
