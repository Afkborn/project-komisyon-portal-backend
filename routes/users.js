const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const getTimeForLog = require("../common/time");
const auth = require("../middleware/auth");
const toSHA256 = require("../common/hashing");

// login user
router.post("/login", (request, response) => {
  const requiredFields = ["username", "password"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  User.findOne({ username: request.body.username })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }

      if (user.password !== toSHA256(request.body.password)) {
        return response.status(401).send({
          message: Messages.PASSWORD_INCORRECT,
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          userPermission: user.permission,
        },
        "RANDOM-TOKEN",
        { expiresIn: "7d" }
      );
      const clientIP =
        request.headers["x-forwarded-for"] || request.socket.remoteAddress;
      console.log(
        getTimeForLog() + "User",
        user.username,
        "logged in with token [" + clientIP + "]"
      );

      response.status(200).send({
        message: Messages.LOGIN_SUCCESSFUL,
        _id: user._id,
        username: user.username,
        token,
      });
    })
    .catch((e) => {
      response.status(404).send({
        message: Messages.TOKEN_NOT_FOUND,
        e,
      });
    });
});

// register endpoint
router.post("/register", auth, (request, response) => {
  if (request.user.userPermission !== "admin") {
    return response.status(403).send({
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }
  const password = toSHA256(request.body.password);
  const user = new User({
    username: request.body.username,
    password: password,
  });
  user
    .save()
    .then((result) => {
      response.status(201).send({
        message: Messages.USER_CREATED_SUCCESSFULLY,
        result,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_CREATE_FAILED,
        error,
      });
    });
});



module.exports = router;
