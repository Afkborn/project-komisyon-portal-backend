const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const titleSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, Messages.TITLE_NAME_REQUIRED],
    unique: true,
  },
  kind: {
    type: String,
    required: true,
    unique: true,
  },
  deletable: {
    type: Boolean,
    default: true,
  },
  oncelikSirasi: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Title", titleSchema);
