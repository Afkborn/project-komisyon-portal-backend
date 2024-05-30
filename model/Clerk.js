const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const ClerkSchema = mongoose.Schema({
  institutionID: {
    type: String,
    required: [true, Messages.INSTITUTIONID_REQUIRED],
  },
  unitTypeID: {
    type: Number,
    required: [true, Messages.UNIT_ID_REQUIRED],
    unique: [true, Messages.UNIT_ID_EXIST],
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
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Clerk", ClerkSchema);
