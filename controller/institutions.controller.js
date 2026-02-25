const { InstitutionList } = require("../constants/InstitutionList");

/**
 * GET /api/institutions - Tüm kurumları sıralanmış şekilde getir
 */
async function getAllInstitutions(_, response) {
  try {
    const sortedInstitutions = [...InstitutionList].sort(
      (a, b) => a.order - b.order
    );
    
    return response.status(200).send({
      success: true,
      InstitutionList: sortedInstitutions,
    });
  } catch (error) {
    return response.status(500).send({
      success: false,
      message: error.message || "SERVER_ERROR",
    });
  }
}

module.exports = {
  getAllInstitutions,
};
