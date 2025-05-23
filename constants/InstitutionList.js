// 0 => mahkeme
// 1 => savcılık
// 2 => diğer

const mahkeme = { id: 0, name: "Mahkeme" };
const savcilik = { id: 1, name: "Savcılık" };
const diger = { id: 2, name: "Diğer" };
// const genel = { id: 3, name: "Genel" };

exports.InstitutionList = [
  {
    id: 1,
    name: "Eskişehir Adliyesi",
    types: [mahkeme, savcilik, diger],
    status: true,
    isDefault: true,
    katipTitleChartVisible: true,
    infazKorumaTitleChartVisible: false,
    
  },
   {
     id: 2,
     name: "Mihalıççık Adliyesi",
     types: [mahkeme, savcilik, diger],
     status: true,
     isDefault: false,
     katipTitleChartVisible: true,
     infazKorumaTitleChartVisible: false,
   },
   {
     id: 3,
     name: "Beylikova Adliyesi",
     types: [mahkeme, savcilik, diger],
     status: true,
     isDefault: false,
     katipTitleChartVisible: true,
     infazKorumaTitleChartVisible: false,
   },
   {
     id: 4,
     name: "Çifteler Adliyesi",
     types: [mahkeme, savcilik, diger],
     status: true,
     isDefault: false,
     katipTitleChartVisible: true,
     infazKorumaTitleChartVisible: false,
   },
   {
     id: 5,
     name: "Sivrihisar Adliyesi",
     types: [mahkeme, savcilik, diger],
     status: true,
     isDefault: false,
     katipTitleChartVisible: true,
     infazKorumaTitleChartVisible: false,
   },
  {
    id: 6,
    name: "Eskişehir 1 Nolu Açık Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: true,
  },
  {
    id: 7,
    name: "Eskişehir 2 Nolu Açık Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: true,
  },
  {
    id: 8,
    name: "Eskişehir H Tipi Kapalı Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: true,
  },
  {
    id: 9,
    name: "Eskişehir L Tipi Kapalı Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: true,
  },
  {
    id: 10,
    name: "Eskişehir Denetimli Serbestlik Müdürlüğü",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: true,
  },
    {
    id: 11,
    name: "Dış Kurum",
    types: [diger],
    status: true,
    isDefault: false,
    katipTitleChartVisible: false,
    infazKorumaTitleChartVisible: false,
  }
];
