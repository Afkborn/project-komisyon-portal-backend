const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, Messages.USERNAME_REQUIRED],
    unique: [true, Messages.USERNAME_EXIST],
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
});

module.exports = mongoose.model("User", UserSchema);
