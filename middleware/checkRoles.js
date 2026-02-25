const Messages = require("../constants/Messages");

const checkRoles = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    // Admin (ID: 1) her zaman tüm yetkilere sahiptir
    if (req.user.roles && req.user.roles.includes(1)) {
      return next();
    }

    const hasRequiredRole = req.user.roles && req.user.roles.some(role => 
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
