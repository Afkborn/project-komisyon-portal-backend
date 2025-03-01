const jwt = require("jsonwebtoken");
const { isValidToken } = require("../config/redis");
const getTimeForLog = require("../common/time");

module.exports = async (req, res, next) => {
  try {
    // Authorization header kontrolü
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization başlığında geçerli bir Bearer token bulunamadı",
      });
    }

    // Token'ı header'dan al (substring metodu split'ten daha güvenilir)
    const token = authHeader.substring(7);

    if (!token || token.trim() === "") {
      return res.status(401).json({
        message: "Geçerli bir token sağlanmadı",
      });
    }

    // Token blacklist kontrolü
    const tokenValid = await isValidToken(token);
    if (!tokenValid) {
      return res.status(401).json({
        message: "Geçersiz token - oturum sonlandırılmış",
      });
    }

    // Token doğrulama
    const decodedToken = jwt.verify(token, "RANDOM-TOKEN");

    // Kullanıcı bilgisini request'e ekle
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error(getTimeForLog() + "Auth middleware error:", error.message);
    res.status(401).json({
      message: "Kimlik doğrulama başarısız",
      error: error.message || error,
    });
  }
};
