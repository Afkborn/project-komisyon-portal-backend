const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const getTimeForLog = require("../common/time");
const auth = require("../middleware/auth");
const toSHA256 = require("../common/hashing");
const Logger = require("../middleware/logger");
const checkRoles = require("../middleware/checkRoles");
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
          roles: user.roles, // role yerine roles
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
  checkRoles(["admin"]), // admin rolüne sahip olanlar kullanabilir
  Logger("POST users/register"),
  (request, response) => {
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
      roles: request.body.roles || ["user"], // varsayılan rol
    });

    if (request.body.email) {
      user.email = request.body.email;
    }

    if (request.body.phoneNumber) {
      user.phoneNumber = request.body.phoneNumber;
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

// update user with id
router.put(
  "/:id",
  auth,
  checkRoles(["admin"]),
  Logger("PUT users/:id"),
  (request, response) => {
    // eğer password değişiyoprsa hashle
    if (request.body.password) {
      request.body.password = toSHA256(request.body.password);
    }

    User.findByIdAndUpdate(request.params.id, request.body, {
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
  }
);

// update user
router.put("/", auth, Logger("PUT users/"), (request, response) => {
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
router.put(
  "/password",
  auth,
  Logger("PUT users/password"),
  (request, response) => {
    const requiredFields = ["oldPassword", "newPassword"];

    const missingFields = requiredFields.filter(
      (field) => !request.body[field]
    );
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
  }
);

// delete user with username and password
router.delete("/", auth, Logger("DELETE users/"), (request, response) => {
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

// delete user with id
router.delete(
  "/:id",
  auth,
  checkRoles(["admin"]),
  Logger("DELETE users/:id"),
  (request, response) => {
    User.findByIdAndDelete(request.params.id)
      .then((user) => {
        if (!user) {
          return response.status(404).send({
            message: Messages.USER_NOT_FOUND,
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
  }
);

// get all users
router.get(
  "/",
  auth,
  checkRoles(["admin"]),
  Logger("GET users/"),
  (request, response) => {
    User.find()
      .then((users) => {
        // remove password field from response
        users = users.map((user) => {
          user = user.toObject();
          delete user.password;
          delete user.__v;
          return user;
        });

        response.status(200).send({
          message: Messages.USERS_LIST,
          users,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: Messages.USERS_GET_FAILED,
          error,
        });
      });
  }
);

// get all users name and surname
router.get("/names", auth, Logger("GET users/names"), (request, response) => {
  User.find({}, "name surname")
    .then((users) => {
      response.status(200).send({
        message: Messages.USERS_LIST,
        users,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USERS_GET_FAILED,
        error,
      });
    });
});

module.exports = router;
