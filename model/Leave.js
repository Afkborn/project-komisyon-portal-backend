const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const { Schema } = mongoose;

const LeaveSchema = mongoose.Schema({
  personID: {
    type: Schema.Types.ObjectId,
    ref: "Person",
    required: [true, Messages.PERSON_ID_REQUIRED],
  },
  startDate: {
    type: Date,
    required: [true, Messages.START_DATE_REQUIRED],
  },
  endDate: {
    type: Date,
    required: [true, Messages.END_DATE_REQUIRED],
  },
  reason: {
    type: String,
    required: [true, Messages.REASON_REQUIRED],
    enum: [
      "YILLIK_IZIN",
      "RAPOR_IZIN",
      "UCRETSIZ_IZIN",
      "MAZERET_IZIN",
      "DOGUM_IZIN",
      "OLUM_IZIN",
      "EVLENME_IZIN",
      "REFAKAT_IZIN",
      "DIGER_IZIN",
    ],
  },
  dayCount: {
    type: Number,
    required: [true, Messages.DAY_COUNT_REQUIRED],
  },
  comment: {
    type: String,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Leave", LeaveSchema);
