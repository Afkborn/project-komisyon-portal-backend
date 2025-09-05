const getTimeForLog = require("../common/time");
const User = require("../model/User");
require("dotenv/config");
const PROXY_ENABLED = process.env.PROXY_ENABLED == "true";
const PROXY_USERNAME = process.env.PROXY_USERNAME;

// Fonksiyonu async olarak güncelledim
async function getProxyPass() {
  if (PROXY_ENABLED) {
    // console.log("Fetching proxy user:", PROXY_USERNAME);
    const user = await User.findOne({ username: PROXY_USERNAME }).lean().exec();
    // console.log("Proxy user fetched:", user);
    if (!user || !user.proxyPass) {
      console.warn(
        getTimeForLog() +
          "Proxy kullanıcısı bulunamadı veya şifre tanımlı değil"
      );
      return null;
    }

    return user.proxyPass;
  }
  return null;
}

module.exports = {
  getProxyPass,
};
