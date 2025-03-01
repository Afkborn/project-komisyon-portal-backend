const { createClient } = require("redis");
const getTimeForLog = require("../common/time");
const jwt = require("jsonwebtoken");

// Tek bir Redis client örneği oluştur
let redisClient = null;
let isConnected = false;

// Redis client'ını oluştur ve yapılandır
const createRedisClient = () => {
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    legacyMode: false,
  });

  redisClient.on("error", (err) => {
    isConnected = false;
    console.error(getTimeForLog() + "Redis error:", err);
  });

  redisClient.on("connect", () => {
    isConnected = true;
    console.log(getTimeForLog() + "Connected to Redis server");
  });

  return redisClient;
};

// Bağlantıyı başlat
const connectRedis = async () => {
  try {
    if (redisClient && isConnected) {
      console.log(getTimeForLog() + "Redis already connected");
      return true;
    }

    const client = createRedisClient();
    await client.connect();
    console.log(getTimeForLog() + "Redis bağlantısı başarılı");
    return true;
  } catch (error) {
    console.error(getTimeForLog() + "Redis bağlantı hatası:", error);
    return false;
  }
};

// Token'ı blacklist'e ekle
const addToBlacklist = async (token, expiresIn) => {
  if (!redisClient || !isConnected) {
    console.warn("Redis bağlantısı olmadan blacklist işlemi atlanıyor");
    return true; // Redis yoksa başarılı varsayalım
  }

  try {
    // Token'ı blacklist'e ekle
    await redisClient.set(`bl_${token}`, "true");
    // Token'a süre ekle (saniye cinsinden)
    await redisClient.expire(`bl_${token}`, expiresIn);
    return true;
  } catch (error) {
    console.error("Redis Blacklist Hatası:", error);
    return false;
  }
};

// Token blacklist kontrolü
const isBlacklisted = async (token) => {
  if (!redisClient || !isConnected) return false;

  try {
    const result = await redisClient.get(`bl_${token}`);
    return result === "true";
  } catch (error) {
    console.error("Redis Blacklist Kontrol Hatası:", error);
    return false;
  }
};

// Kullanıcının tüm tokenlarını geçersiz kıl
const invalidateAllUserTokens = async (userId) => {
  if (!redisClient || !isConnected) {
    console.warn(
      getTimeForLog() + "Redis bağlantısı olmadan token invalidasyon atlanıyor"
    );
    return null;
  }

  try {
    // Token versiyonu için zaman damgası kullan (daha büyük sayı = daha yeni versiyon)
    const newVersion = Date.now();
    const userTokenKey = `user:${userId}:tokenVersion`;

    // Token versiyonunun güncellendiğine dair log
    console.log(
      getTimeForLog() +
        `Setting token version for user ${userId} to ${newVersion}`
    );

    // Token versiyonunu güncelle
    await redisClient.set(userTokenKey, newVersion.toString());

    // Token versiyonunu süresiz sakla
    await redisClient.persist(userTokenKey);

    // Redis'teki değeri kontrol et
    const storedVersion = await redisClient.get(userTokenKey);
    console.log(
      getTimeForLog() + `Saved token version verified: ${storedVersion}`
    );

    return newVersion;
  } catch (error) {
    console.error(getTimeForLog() + "Error invalidating user tokens:", error);
    return null;
  }
};

// Token geçerlilik kontrolü - hem blacklist hem de versiyon kontrolü
const isValidToken = async (token) => {
  if (!redisClient || !isConnected) {
    console.warn(
      getTimeForLog() + "Redis bağlantısı yok, token kontrolü atlanıyor"
    );
    return true; // Redis bağlantısı yoksa geçerli kabul et
  }

  try {
    if (!token || token.trim() === "") {
      console.error(getTimeForLog() + "Empty token passed to isValidToken");
      return false;
    }

    // Blacklist kontrolü
    const isTokenBlacklisted = await isBlacklisted(token);
    if (isTokenBlacklisted) {
      console.log(getTimeForLog() + "Token blacklisted");
      return false;
    }

    // Token'dan kullanıcı ID'sini ve oluşturma zamanını çıkar
    let decodedToken;
    try {
      decodedToken = jwt.decode(token);
      if (!decodedToken || !decodedToken.id) {
        console.error(
          getTimeForLog() + "Invalid token structure, cannot decode"
        );
        return false;
      }
    } catch (decodeError) {
      console.error(
        getTimeForLog() + "Token decode error:",
        decodeError.message
      );
      return false;
    }

    // Token oluşturma versiyonu kontrolü
    const userId = decodedToken.id;
    const tokenVersion = decodedToken.ver || 0; // Token'da versiyon yoksa 0 varsay

    // Kullanıcının mevcut token versiyonu
    const currentVersion = await redisClient.get(`user:${userId}:tokenVersion`);

    // Token versiyonu kontrol loglaması
    console.log(
      getTimeForLog() +
        `Token validation - userId: ${userId}, tokenVer: ${tokenVersion}, currentVer: ${currentVersion}`
    );

    // Versiyon kontrolü - eğer Redis'te versiyon yoksa geçerli kabul et
    if (!currentVersion) {
      console.log(
        getTimeForLog() +
          `No token version found for user ${userId}, accepting token`
      );
      return true;
    }

    // Token versiyonu kontrolü - token versiyonu, Redis'teki versiyondan küçükse geçersiz
    const isValid = parseInt(tokenVersion) >= parseInt(currentVersion);
    console.log(
      getTimeForLog() +
        `Token validation result: ${
          isValid ? "Valid" : "Invalid"
        } (${tokenVersion} >= ${currentVersion})`
    );

    return isValid;
  } catch (error) {
    console.error(getTimeForLog() + "Error checking token validity:", error);
    return true; // Hata durumunda güvenli tarafta kal
  }
};

// Redis'i başlat ve durumu döndür
const initRedis = async () => {
  try {
    const connected = await connectRedis();
    if (connected) {
      console.log(getTimeForLog() + "Redis servisi başarıyla başlatıldı");
      return true;
    } else {
      console.warn(
        getTimeForLog() +
          "Redis servisi başlatılamadı. Bazı özellikler çalışmayabilir."
      );
      return false;
    }
  } catch (error) {
    console.error(getTimeForLog() + "Redis başlatma hatası:", error);
    return false;
  }
};

module.exports = {
  redisClient: () => redisClient,
  isConnected: () => isConnected,
  connectRedis,
  initRedis,
  invalidateAllUserTokens,
  isValidToken,
  addToBlacklist,
  isBlacklisted,
};
