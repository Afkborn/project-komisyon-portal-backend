const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, Messages.USERNAME_REQUIRED],
    unique: [true, Messages.USERNAME_EXIST],
  },
  name: {
    type: String,
    required: [true, Messages.NAME_REQUIRED],
  },
  surname: {
    type: String,
    required: [true, Messages.SURNAME_REQUIRED],
  },
  password: {
    type: String,
    required: [true, Messages.PASSWORD_REQUIRED],
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  permission: {
    type: String,
    default: "user",
  },
  email: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
});

module.exports = mongoose.model("User", UserSchema);
