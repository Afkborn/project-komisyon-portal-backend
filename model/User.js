const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const UserSchema = mongoose.Schema(
  {
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
    roles: {
      type: [String],
      required: [true, Messages.ROLE_REQUIRED],
      validate: {
        validator: function(roles) {
          return roles.length > 0;
        },
        message: 'En az bir rol gereklidir'
      }
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
