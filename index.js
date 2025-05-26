const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoDbConnect = require("./database/mongoDb");
const getTimeForLog = require("./common/time");
const { initRedis } = require("./config/redis");
require("dotenv").config();
const port = process.env.PORT;

// Redis bağlantısını başlat
initRedis().then((isConnected) => {
  if (isConnected) {
    console.log(getTimeForLog() + "Redis servisi hazır");
  } else {
    console.warn(
      getTimeForLog() +
        "Redis servisi hazır değil, bazı özellikler sınırlı olabilir"
    );
  }
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(cors()); // CORS'u etkinleştirir

app.use(bodyParser.json());

// API'leri tanımla

const users = require("./routes/users");
app.use("/api/users", users); // Kullanıcı işlemleri

const institutions = require("./routes/institutions");
app.use("/api/institutions", institutions); // Kurum işlemleri

const unit_types = require("./routes/unit_types");
app.use("/api/unit_types", unit_types); // Birim türleri işlemleri

const units = require("./routes/units");
app.use("/api/units", units); // Birim işlemleri

const titles = require("./routes/titles");
app.use("/api/titles", titles); // Unvan işlemleri

const persons = require("./routes/persons");
app.use("/api/persons", persons); // Personel işlemleri

const personunits = require("./routes/personunits");
app.use("/api/personunits", personunits); // Personel birimleri işlemleri

const leaves = require("./routes/leaves");
app.use("/api/leaves", leaves); // İzin işlemleri

const reports = require("./routes/reports");
app.use("/api/reports", reports); // Rapor işlemleri

const roles = require("./routes/roles");
app.use("/api/roles", roles); // Rol işlemleri

const activities = require("./routes/activities");
app.use("/api/activities", activities); // Aktivite işlemleri

const rss_proxy = require("./routes/rss_proxy");
app.use("/api/rss_proxy", rss_proxy); // RSS proxy işlemleri

const segbis = require("./routes/segbis");
app.use("/api/segbis", segbis); // SEGBİS işlemleri



mongoDbConnect(); // MongoDB bağlantısını başlat


const checkConstantTitle =
  require("./actions/DatabaseActions").checkConstantTitle;
checkConstantTitle(); // Sabit unvanları kontrol et ve ekle, projenin çalışması için gereklidir


// eğer hiç user yoksa admin user oluştur
const createAdminUser =
  require("./actions/DatabaseActions").createAdminUser;
createAdminUser(); // Admin kullanıcısını oluştur, projenin çalışması için gereklidir

//  Sunucuyu başlat
app.listen(port, () => {
  console.log(getTimeForLog() + `Listening on port ${port}`);
});
