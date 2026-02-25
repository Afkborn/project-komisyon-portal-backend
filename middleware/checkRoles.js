const Messages = require("../constants/Messages");
const RoleList = require("../constants/RoleList").RoleList;

const checkRoles = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    // Kullanıcının role adlarından ID'leri bul
    const userRoleIds = [];
    if (req.user.roles && Array.isArray(req.user.roles)) {
      req.user.roles.forEach((roleName) => {
        const role = RoleList.find((r) => r.name === roleName);
        if (role) {
          userRoleIds.push(role.id);
        }
      });
    }

    // console.log(
    //   "checkRoles middleware çalıştı. Kullanıcı roller (string):",
    //   req.user.roles,
    // );
    // console.log("Kullanıcı rol ID'leri (number):", userRoleIds);
    // console.log("Gerekli rol ID'leri:", requiredRoles);

    // Admin (ID: 1) her zaman tüm yetkilere sahiptir
    if (userRoleIds.includes(1)) {
      // console.log("Admin rolüne sahip - Erişim izin verildi");
      return next();
    }

    // Kullanıcının gerekli rollerden birine sahip olup olmadığını kontrol et
    const hasRequiredRole = userRoleIds.some((roleId) =>
      requiredRoles.includes(roleId),
    );

    if (!hasRequiredRole) {
      // console.log("Gerekli rol bulunamadı - Erişim reddedildi");
      return res.status(403).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    // console.log("Gerekli rol bulundu - Erişim izin verildi");
    next();
  };
};

module.exports = checkRoles;
