const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

// kurumID : Number [OK] [institutionID]
// altBirimID : Number [OK] [unitTypeID]
// heyetDurum : String [ok] [delegationType]
// mahkemeDurum : bool [ok] [status]
// mahkemeSayi : Number [OK] [series]
// minKatipSayisi : Number [OK] [minClertCount]
// name: String   [OK] [name]

// kurumName : string  [GEREK YOK]
// altBirimName : String [GEREK YOK]
// birimTurID : Number [GEREK YOK] ÇÜNKÜ ALT BİRİMDEN GELİYOR
// birimTurName : String [GEREK YOK]  ÇÜNKÜ ALT BİRİMDEN GELİYOR

const UnitSchema = mongoose.Schema({
  institutionID: {
    type: Number,
    required: [true, Messages.INSTITUTIONID_REQUIRED],
  },
  unitTypeID: {
    type: Number,
    required: [true, Messages.UNIT_ID_REQUIRED],
  },
  delegationType: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
  series: {
    type: Number,
    default: 0,
  },
  minClertCount: {
    type: Number,
    default: 1,
  },
  name: {
    type: String,
    required: [true, Messages.UNIT_NAME_REQUIRED],
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  clerks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clerk",
    },
  ],
});

module.exports = mongoose.model("Unit", UnitSchema);
