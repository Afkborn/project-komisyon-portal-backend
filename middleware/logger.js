const winston = require("winston");
const getTimeForLog = require("../common/time");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: "/app/logs/app.log" }), // Logları dosyaya kaydet
  ],
});

module.exports = (reqID) => (request, _, next) => {
  let clientIP =
    request.headers["x-forwarded-for"] || request.socket.remoteAddress;
  const username = request.user ? request.user.username : "GUEST";
  if (clientIP === "::1") {
    clientIP = "127.0.0.1";
  }

  const logMessage =
    getTimeForLog() + `USER ${username}\t[IP ${clientIP}]\t(${reqID})`;
  logger.info(logMessage); // Logları dosyaya yaz
  console.log(logMessage); // Logları konsola yaz

  next();
};
