const mongoose = require("mongoose");
const Messages = require("../constants/Messages");
const { Schema } = mongoose;

const titleSchema = new Schema({
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
});

module.exports = mongoose.model("Title", titleSchema);
