const jwt = require("jsonwebtoken");
const User = require("../model/User");
const Messages = require("../constants/Messages");

module.exports = async (request, response, next) => {
  try {
    const token = await request.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, "RANDOM-TOKEN");
    const user = decodedToken;
    if (user.exp < Date.now() / 1000) {
      return response.status(401).json({
        error: "Token expired",
      });
    }
    await User.findOne({ username: user.username })
      .then((user) => {
        // OK
        return user;
      })
      .catch((err) => {
        response.status(404).send({
          message: Messages.USER_NOT_FOUND,
          err,
        });
        return; // to prevent further execution
      });

    request.user = user;
    next();
  } catch (err) {
    response.status(401).json({
      error: "Authentication failed",
    });
  }
};
