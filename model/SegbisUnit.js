const mongoose = require("mongoose");

const SegbisUnitSchema = mongoose.Schema(
  {
    ad: {
      type: String,
      required: [true, "Mahkeme adı gereklidir"],
    },
    il: {
      type: String,
      required: [true, "Mahkeme ili gereklidir"],
    },
    personelList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SegbisPerson",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SegbisUnit", SegbisUnitSchema);
