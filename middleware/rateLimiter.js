const { redisClient } = require('../config/redis');
const Messages = require("../constants/Messages");

// Login işlemi için rate limiting middleware
const loginRateLimiter = async (req, res, next) => {
  if (!redisClient.isOpen) {
    // Redis bağlantısı yoksa, rate limiting olmadan devam et
    return next();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const username = req.body.username;
  
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  const key = `login:${username}:${ip}`;
  
  try {
    // Kullanıcının giriş denemelerini kontrol et
    const attempts = await redisClient.get(key);
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    
    if (attempts && parseInt(attempts) >= maxAttempts) {
      // Kalan süreyi kontrol et
      const ttl = await redisClient.ttl(key);
      return res.status(429).json({
        message: `${Messages.TOO_MANY_ATTEMPTS}. ${Math.ceil(ttl / 60)} dakika sonra tekrar deneyin.`
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    next(); // Hata durumunda devam et
  }
};

// Başarısız login kayıtları
const recordLoginAttempt = async (username, ip, success) => {
  if (!redisClient.isOpen) return;
  
  const key = `login:${username}:${ip}`;
  
  try {
    if (success) {
      // Başarılı login - denemeleri sıfırla
      await redisClient.del(key);
    } else {
      // Başarısız login - deneme sayısını artır
      const attempts = await redisClient.incr(key);
      const cooldownTime = parseInt(process.env.LOGIN_COOLDOWN_TIME) || 300; // 5 dakika
      
      if (attempts === 1) {
        // İlk başarısız denemede süreyi ayarla
        await redisClient.expire(key, cooldownTime);
      }
    }
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
};

module.exports = {
  loginRateLimiter,
  recordLoginAttempt
};
