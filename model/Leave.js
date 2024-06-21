const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const LeaveSchema = mongoose.Schema({
  personID: {
    type: String,
    required: [true, Messages.PERSONID_REQUIRED],
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
