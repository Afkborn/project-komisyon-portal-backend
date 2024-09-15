const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const getTimeForLog = require("../common/time");
const auth = require("../middleware/auth");
const toSHA256 = require("../common/hashing");
const Logger = require("../middleware/logger");
const e = require("express");

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
          role: user.role,
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
router.post(
  "/register",
  auth,
  Logger("POST /register"),
  (request, response) => {
    if (request.user.role !== "admin") {
      return response.status(403).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    const requiredFields = ["username", "password", "name", "surname"];
    const missingFields = requiredFields.filter(
      (field) => !request.body[field]
    );
    if (missingFields.length > 0) {
      return response.status(400).send({
        success: false,
        message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
      });
    }

    const password = toSHA256(request.body.password);
    const user = new User({
      username: request.body.username,
      name: request.body.name,
      surname: request.body.surname,
      password: password,
      role: request.body.role,
    });

    if (request.body.email) {
      user.email = request.body.email;
    }

    if (request.body.phone) {
      user.phone = request.body.phone;
    }

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
  }
);

// get details from token
router.get("/details", auth, (request, response) => {
  User.findOne({ username: request.user.username })
    .then((user) => {
      user = user.toObject();
      delete user.__v;
      delete user.password;
      response.status(200).send({
        message: Messages.USER_DETAILS,
        user: user,
      });
    })
    .catch((error) => {
      response.status(404).send({
        message: Messages.USER_NOT_FOUND,
        error,
      });
    });
});

// update user
router.put("/", auth, Logger("PUT /"), (request, response) => {
  User.findOneAndUpdate({ username: request.user.username }, request.body, {
    new: true, // Return the updated document
    runValidators: true, // Validate the update operation
    useFindAndModify: false,
  })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      response.status(200).send({
        message: Messages.USER_UPDATED,
        user,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_UPDATED,
        error,
      });
    });
});

// change user password
router.put("/password", auth, Logger("PUT /password"), (request, response) => {
  const requiredFields = ["oldPassword", "newPassword"];

  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  User.findOne({ username: request.user.username })
    .then((user) => {
      if (user.password !== toSHA256(request.body.oldPassword)) {
        return response.status(401).send({
          message: Messages.PASSWORD_INCORRECT,
        });
      }
      user.password = toSHA256(request.body.newPassword);
      user
        .save()
        .then((result) => {
          response.status(200).send({
            message: Messages.PASSWORD_CHANGED,
            result,
          });
        })
        .catch((error) => {
          response.status(500).send({
            message: Messages.PASSWORD_NOT_CHANGED,
            error,
          });
        });
    })
    .catch((error) => {
      response.status(404).send({
        message: Messages.USER_NOT_FOUND,
        error,
      });
    });
});

// delete user
router.delete("/", auth, Logger("DELETE /"), (request, response) => {
  const requiredFields = ["password"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  User.findOneAndDelete({ username: request.user.username })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      let password = toSHA256(request.body.password);

      if (user.password !== password) {
        return response.status(401).send({
          message: Messages.PASSWORD_INCORRECT,
        });
      }
      response.status(200).send({
        message: Messages.USER_DELETED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_DELETED,
        error,
      });
    });
});

module.exports = router;
