// 0 => mahkeme
// 1 => savcılık
// 2 => diğer

const mahkeme = { id: 0, name: "Mahkeme" };
const savcilik = { id: 1, name: "Savcılık" };
const diger = { id: 2, name: "Diğer" };

exports.InstitutionList = [
  {
    id: 1,
    name: "Eskişehir Adliyesi",
    types: [mahkeme, savcilik],
    status: true,
  },
  {
    id: 2,
    name: "Eskişehir 1 Nolu Açık Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
  },
  {
    id: 3,
    name: "Eskişehir 2 Nolu Açık Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
  },
  {
    id: 4,
    name: "Eskişehir H Tipi Kapalı Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
  },
  {
    id: 5,
    name: "Eskişehir L Tipi Kapalı Ceza İnfaz Kurumu",
    types: [diger],
    status: true,
  },
  {
    id: 6,
    name: "Eskişehir Denetimli Serbestlik Müdürlüğü",
    types: [diger],
    status: true,
  },
];
