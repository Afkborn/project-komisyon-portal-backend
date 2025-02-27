const Messages = require("../constants/Messages");

const checkRoles = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    const hasRequiredRole = req.user.roles.some(role => 
      requiredRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    next();
  };
};

module.exports = checkRoles;
