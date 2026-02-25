const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoDbConnect = require("./database/mongoDb");
const getTimeForLog = require("./common/time");
const { initRedis } = require("./config/redis");
require("dotenv").config();
const port = process.env.PORT || 3000;

if (process.env.REDIS_ENABLED == "true") {
  console.log(getTimeForLog() + "Redis kullanımı etkin");
  // Redis bağlantısını başlat
  initRedis().then((isConnected) => {
    if (isConnected) {
      console.log(getTimeForLog() + "Redis servisi hazır");
    } else {
      console.warn(
        getTimeForLog() +
          "Redis servisi hazır değil, bazı özellikler sınırlı olabilir",
      );
    }
  });
} else {
  console.log(getTimeForLog() + "Redis kullanımı devre dışı");
}

app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(cors()); // CORS'u etkinleştirir

app.use(bodyParser.json());

// API'leri tanımla

const users = require("./routes/users.routes");
app.use("/api/users", users); // Kullanıcı işlemleri

const institutions = require("./routes/institutions.routes");
app.use("/api/institutions", institutions); // Kurum işlemleri

const unit_types = require("./routes/unit_types.routes");
app.use("/api/unit_types", unit_types); // Birim türleri işlemleri

const units = require("./routes/units.routes");
app.use("/api/units", units); // Birim işlemleri

const titles = require("./routes/titles.routes");
app.use("/api/titles", titles); // Unvan işlemleri

const persons = require("./routes/persons.routes");
app.use("/api/persons", persons); // Personel işlemleri

const personunits = require("./routes/personunits.routes");
app.use("/api/personunits", personunits); // Personel birimleri işlemleri

const leaves = require("./routes/leaves.routes");
app.use("/api/leaves", leaves); // İzin işlemleri

const reports = require("./routes/reports.routes");
app.use("/api/reports", reports); // Rapor işlemleri

const roles = require("./routes/roles.routes");
app.use("/api/roles", roles); // Rol işlemleri

const activities = require("./routes/activities.routes");
app.use("/api/activities", activities); // Aktivite işlemleri

const news = require("./routes/news.routes");
app.use("/api/news", news); // Haberler

const barolevha_proxy = require("./routes/barolevha_proxy.routes");
app.use("/api/barolevha_proxy", barolevha_proxy); // Baro Levha Proxy işlemleri

const segbis = require("./routes/segbis.routes");
app.use("/api/segbis", segbis); // SEGBİS işlemleri

const biNot = require("./routes/biNot.routes");
app.use("/api/binot", biNot); // BiNot işlemleri

mongoDbConnect(); // MongoDB bağlantısını başlat

const checkConstantTitle =
  require("./actions/DatabaseActions").checkConstantTitle;
checkConstantTitle(); // Sabit unvanları kontrol et ve ekle, projenin çalışması için gereklidir

// eğer hiç user yoksa admin user oluştur
const createAdminUser = require("./actions/DatabaseActions").createAdminUser;
createAdminUser(); // Admin kullanıcısını oluştur, projenin çalışması için gereklidir

const { getProxyPass } = require("./actions/ProxyActions");
const PROXY_ENABLED = process.env.PROXY_ENABLED == "true";

if (PROXY_ENABLED) {
  console.log(getTimeForLog() + "Proxy kullanımı etkin");
  getProxyPass().then((proxyData) => {
    if (proxyData) {
      process.env.PROXY_PASSWORD = proxyData;
      console.log(getTimeForLog() + "Proxy şifresi yüklendi");
    } else {
      console.warn(
        getTimeForLog() + "Proxy şifresi yüklenemedi, proxy kullanılamayabilir",
      );
    }
  });
} else {
  console.log(getTimeForLog() + "Proxy kullanılmıyor");
}

//  Sunucuyu başlat
app.listen(port, () => {
  console.log(getTimeForLog() + `Listening on port ${port}`);
});
