const InstitutionList = require("../constants/InstitutionList").InstitutionList;

function getInstitutionListByID(typeId) {
  // Gelen `typeId` değerini kontrol
  typeId = parseInt(typeId);
  if (isNaN(typeId)) {
    throw new Error("Institution ID must be a number.");
  }

  // `find` sonucunu `result` değişkenine atıyoruz
  const result = InstitutionList.find(
    (institution) => institution.id === typeId
  );

  // `result` undefined ise kontrol ediyoruz
  if (!result) {
    throw new Error(`Institution with ID ${typeId} not found.`);
  }

  // Eğer `result` geçerli bir nesne ise, istenen bilgileri döndürüyoruz
  return {
    id: result.id,
    name: result.name,
    katipTitleChartVisible: result.katipTitleChartVisible ?? false, // Eğer yoksa false döndür
    infazKorumaTitleChartVisible: result.infazKorumaTitleChartVisible ?? false, // Eğer yoksa false dö
  };
}

// get Institutions if infazKorumaTitleChartVisible is true
function filterInfazKorumaTitleChartVisibleInstitutions() {
  // `filter` fonksiyonu ile `infazKorumaTitleChartVisible` değeri `true` olanları filtreleyip döndürüyoruz
  return InstitutionList.filter(
    (institution) => institution.infazKorumaTitleChartVisible
  );
}

module.exports = {
  getInstitutionListByID,
  filterInfazKorumaTitleChartVisibleInstitutions,
};
