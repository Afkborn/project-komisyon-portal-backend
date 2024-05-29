const crypto = require("crypto");
require("dotenv/config");

function saltText(string) {
  const saltCode = process.env.SALT_CODE;
  const reverseSaltCode = saltCode.split("").reverse().join("");
  return saltCode + string + reverseSaltCode;
}

function toSHA256(string) {
  const saltedText = saltText(string);
  return crypto.createHash("sha256").update(saltedText).digest("hex");
}

module.exports = toSHA256;
