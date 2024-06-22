
const getTimeForLog = require("../common/time");

module.exports = async = (reqID) => (request, _, next) => {
  let clientIP = request.headers['x-forwarded-for'] || request.socket.remoteAddress 
  const username = request.user ? request.user.username : "GUEST";
  if (clientIP === "::1") {
    clientIP = "127.0.0.1";
  }
  console.log(
    getTimeForLog() + `USER ${username}\t[IP ${clientIP}]\t(${reqID})`
  );
  next();
};
