const RoleList = require("../constants/RoleList");

// GET /roles
// Tüm rolleri listele
exports.getAllRoles = async (_, response) => {
  try {
    response.status(200).send(RoleList);
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: error.message || "Roller alınırken bir hata oluştu",
    });
  }
};
