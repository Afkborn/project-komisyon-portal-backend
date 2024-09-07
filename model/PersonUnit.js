const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const PersonUnitSchema = mongoose.Schema({
  personID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Person",
    required: [true, Messages.PERSON_ID_REQUIRED],
  },
  unitID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
    required: [true, Messages.UNIT_ID_REQUIRED],
  },
  startDate: {
    type: Date,
    required: [true, Messages.START_DATE_REQUIRED],
  },
  endDate: {
    type: Date,
    required: [true, Messages.END_DATE_REQUIRED],
  },
  detail : {
    type: String,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PersonUnit", PersonUnitSchema);
