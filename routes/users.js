const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const User = require("../model/User");
const jwt = require("jsonwebtoken");
const getTimeForLog = require("../common/time");
const auth = require("../middleware/auth");
const toSHA256 = require("../common/hashing");
const Logger = require("../middleware/logger");
const { invalidateAllUserTokens } = require("../config/redis");

// login user
router.post("/login", async (request, response) => {
  const requiredFields = ["username", "password"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  try {
    const user = await User.findOne({ username: request.body.username });

    if (!user) {
      return response.status(404).send({
        message: Messages.USER_NOT_FOUND,
      });
    }

    // Redis'ten mevcut token versiyonunu oku ya da yeni bir tane oluştur
    const { redisClient, isConnected } = require("../config/redis");

    // Önce kullanıcının kilitli olup olmadığını kontrol et
    const MAX_LOGIN_ATTEMPTS = 5; // Maksimum hatalı giriş denemesi
    const LOCKOUT_DURATION = 5 * 60; // 30 dakika (saniye cinsinden)

    let attempts = 0;
    let lockedUntil = null;
    let redisAvailable = false;

    if (redisClient && isConnected()) {
      try {
        const rc = redisClient();
        redisAvailable = true;

        // Multi-get ile tek seferde hem deneme sayısını hem de kilit durumunu kontrol et
        // Bu sayede Redis'e yapılan istek sayısını azaltıyoruz
        const [currentAttempts, lockTimestamp] = await Promise.all([
          rc.get(`loginAttempts:${user.username}`),
          rc.get(`loginLock:${user.username}`),
        ]);

        // Redis'te veri bulunursa kullan, bulunmazsa varsayılan değerleri kullan
        if (currentAttempts) {
          attempts = parseInt(currentAttempts);
        }

        if (lockTimestamp) {
          const now = Math.floor(Date.now() / 1000);
          const lockTime = parseInt(lockTimestamp);

          if (now < lockTime) {
            // Kilit süresi henüz geçmemiş
            const remainingSeconds = lockTime - now;
            const remainingMinutes = Math.ceil(remainingSeconds / 60);

            return response.status(429).send({
              message: `Çok fazla hatalı giriş denemesi. Hesabınız geçici olarak kilitlendi. ${remainingMinutes} dakika sonra tekrar deneyiniz.`,
              lockedUntil: new Date(lockTime * 1000),
              remainingAttempts: 0,
            });
          } else {
            // Kilit süresi geçmiş, kilidi kaldır
            await rc.del(`loginLock:${user.username}`);
            await rc.del(`loginAttempts:${user.username}`);
            attempts = 0;
          }
        }
      } catch (redisError) {
        console.error(getTimeForLog() + "Redis lock check error:", redisError);
        redisAvailable = false;
        // Redis hata verirse, güvenli modda devam et
        attempts = 0; // Redis olmadan hata sayısını takip edemeyiz, en güvenlisi sıfırlamaktır
      }
    }

    // Şifre yanlış ise
    if (user.password !== toSHA256(request.body.password)) {
      attempts++; // Hatalı giriş sayısını artır

      // Eğer Redis bağlantısı varsa, hatalı giriş sayısını artır
      if (redisAvailable) {
        try {
          const rc = redisClient();

          // Hatalı giriş sayısını güncelle
          const key = `loginAttempts:${user.username}`;
          const value = attempts.toString();
          await rc.setEx(key, LOCKOUT_DURATION, value);

          // Eğer maksimum denemeye ulaşıldıysa hesabı kilitle
          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            const lockUntil = Math.floor(Date.now() / 1000) + LOCKOUT_DURATION;
            await rc.setEx(
              `loginLock:${user.username}`,
              LOCKOUT_DURATION,
              lockUntil.toString()
            );

            console.log(
              getTimeForLog() +
                `User ${user.username} account locked until ${new Date(
                  lockUntil * 1000
                )}`
            );

            return response.status(429).send({
              message: `Çok fazla hatalı giriş denemesi. Hesabınız 30 dakika süreyle kilitlendi.`,
              lockedUntil: new Date(lockUntil * 1000),
              remainingAttempts: 0,
            });
          }

          console.log(
            getTimeForLog() +
              `Login attempts for ${user.username} updated to ${attempts}`
          );
        } catch (redisError) {
          console.error(getTimeForLog() + "Redis error:", redisError);
          // Redis hata verirse, şifre kontrol sonucu ile devam et
        }
      } else {
        console.log(
          getTimeForLog() +
            `Redis unavailable, cannot track login attempts for ${user.username}`
        );
      }

      // Redis kullanılamasa bile kalan hak mesajını göster
      // Fakat Redis yoksa veya hata verirse kilitleme yapamayacağımızdan her zaman en az 1 hak kalacak
      const remainingAttempts = redisAvailable
        ? Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
        : 1;
      const attemptsMessage =
        remainingAttempts > 0
          ? `Kalan giriş hakkı: ${remainingAttempts}`
          : "Çok fazla hatalı giriş denemesi. Hesabınız kilitlendi.";

      return response.status(401).send({
        message: `${Messages.PASSWORD_INCORRECT}. ${attemptsMessage}`,
        remainingAttempts: remainingAttempts,
      });
    }

    // Şifre doğru ise, hatalı giriş sayısını ve kilidi sıfırla
    if (redisAvailable) {
      try {
        const rc = redisClient();
        await rc.del(`loginAttempts:${user.username}`);
        await rc.del(`loginLock:${user.username}`);
        console.log(
          getTimeForLog() +
            `Login attempts and locks reset for ${user.username} after successful login`
        );
      } catch (redisError) {
        console.error(
          getTimeForLog() + "Redis error when resetting login attempts:",
          redisError
        );
      }
    }

    let tokenVersion = Date.now();

    // Eğer Redis bağlantısı varsa, mevcut versiyon kontrol edilir
    if (redisClient && isConnected()) {
      const currentVersion = await redisClient().get(
        `user:${user._id}:tokenVersion`
      );
      if (currentVersion) {
        tokenVersion = parseInt(currentVersion);
      }
    }

    // console.log(
    //   getTimeForLog() +
    //     `Creating token for ${user.username} with version ${tokenVersion}`
    // );

    // Tokena versiyon ekle
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        roles: user.roles,
        ver: tokenVersion,
      },
      "RANDOM-TOKEN",
      { expiresIn: "7d" }
    );

    const clientIP =
      request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    console.log(
      getTimeForLog() + "User",
      user.username,
      "logged in with token [" + clientIP + "]"
    );

    response.status(200).send({
      message: Messages.LOGIN_SUCCESSFUL,
      _id: user._id,
      username: user.username,
      token,
    });
  } catch (error) {
    console.error(getTimeForLog() + "Login error:", error);
    response.status(500).send({
      message: "Giriş yapılırken bir hata oluştu",
      error: error.message,
    });
  }
});

// register endpoint
router.post(
  "/register",
  auth,
  Logger("POST users/register"),
  (request, response) => {
    if (!request.user.roles.includes("admin")) {
      return response.status(403).send({
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    const requiredFields = ["username", "password", "name", "surname", "roles"];
    const missingFields = requiredFields.filter(
      (field) => !request.body[field]
    );
    if (missingFields.length > 0) {
      return response.status(400).send({
        success: false,
        message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
      });
    }

    const password = toSHA256(request.body.password);
    const user = new User({
      username: request.body.username,
      name: request.body.name,
      surname: request.body.surname,
      password: password,
      roles: request.body.roles,
    });

    if (request.body.email) {
      user.email = request.body.email;
    }

    if (request.body.phone) {
      user.phone = request.body.phone;
    }

    user
      .save()
      .then((result) => {
        response.status(201).send({
          message: Messages.USER_CREATED_SUCCESSFULLY,
          result,
        });
      })
      .catch((error) => {
        response.status(500).send({
          message: Messages.USER_CREATE_FAILED,
          error,
        });
      });
  }
);

// get details from token
router.get("/details", auth, (request, response) => {
  User.findOne({ username: request.user.username })
    .then((user) => {
      user = user.toObject();
      delete user.__v;
      delete user.password;
      response.status(200).send({
        message: Messages.USER_DETAILS,
        user: user,
      });
    })
    .catch((error) => {
      response.status(404).send({
        message: Messages.USER_NOT_FOUND,
        error,
      });
    });
});


// change user password
router.put(
  "/password",
  auth,
  Logger("PUT users/password"),
  async (request, response) => {
    const requiredFields = ["oldPassword", "newPassword"];

    const missingFields = requiredFields.filter(
      (field) => !request.body[field]
    );
    if (missingFields.length > 0) {
      return response.status(400).send({
        success: false,
        message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
      });
    }

    try {
      const user = await User.findOne({ username: request.user.username });

      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }

      if (user.password !== toSHA256(request.body.oldPassword)) {
        return response.status(401).send({
          message: Messages.PASSWORD_INCORRECT,
        });
      }

      user.password = toSHA256(request.body.newPassword);
      const updatedUser = await user.save();

      // Bu kullanıcının tüm token'larını geçersiz kıl
      console.log(
        getTimeForLog() +
          `Invalidating all tokens for user ${user._id} (${user.username})`
      );
      const newVersion = await invalidateAllUserTokens(user._id);

      console.log(
        getTimeForLog() +
          `User ${user.username} changed password and invalidated all tokens. New version: ${newVersion}`
      );

      response.status(200).send({
        message: Messages.PASSWORD_CHANGED,
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
        },
      });
    } catch (error) {
      console.error(getTimeForLog() + "Password change error:", error);
      response.status(500).send({
        message: Messages.PASSWORD_NOT_CHANGED,
        error: error.message,
      });
    }
  }
);

// update user with id
router.put("/:id", auth, Logger("PUT users/:id"), (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }
  User.findByIdAndUpdate(request.params.id, request.body, {
    new: true, // Return the updated document
    runValidators: true, // Validate the update operation
    useFindAndModify: false,
  })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      response.status(200).send({
        message: Messages.USER_UPDATED,
        user,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_UPDATED,
        error,
      });
    });
});

// update user
router.put("/", auth, Logger("PUT users/"), (request, response) => {
  User.findOneAndUpdate({ username: request.user.username }, request.body, {
    new: true, // Return the updated document
    runValidators: true, // Validate the update operation
    useFindAndModify: false,
  })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      response.status(200).send({
        message: Messages.USER_UPDATED,
        user,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_UPDATED,
        error,
      });
    });
});

// delete user with username and password
router.delete("/", auth, Logger("DELETE users/"), (request, response) => {
  const requiredFields = ["password"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  User.findOneAndDelete({ username: request.user.username })
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      let password = toSHA256(request.body.password);

      if (user.password !== password) {
        return response.status(401).send({
          message: Messages.PASSWORD_INCORRECT,
        });
      }
      response.status(200).send({
        message: Messages.USER_DELETED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_DELETED,
        error,
      });
    });
});

// delete user with id
router.delete("/:id", auth, Logger("DELETE users/:id"), (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }
  User.findByIdAndDelete(request.params.id)
    .then((user) => {
      if (!user) {
        return response.status(404).send({
          message: Messages.USER_NOT_FOUND,
        });
      }
      response.status(200).send({
        message: Messages.USER_DELETED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USER_NOT_DELETED,
        error,
      });
    });
});

// get all users
router.get("/", auth, Logger("GET users/"), (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }
  User.find()
    .then((users) => {
      // remove password field from response
      users = users.map((user) => {
        user = user.toObject();
        delete user.password;
        delete user.__v;
        return user;
      });

      response.status(200).send({
        message: Messages.USERS_LIST,
        users,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USERS_GET_FAILED,
        error,
      });
    });
});

// get all users name and surname
router.get("/names", auth, Logger("GET users/names"), (request, response) => {
  User.find({}, "name surname")
    .then((users) => {
      response.status(200).send({
        message: Messages.USERS_LIST,
        users,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: Messages.USERS_GET_FAILED,
        error,
      });
    });
});

// logout user
router.post(
  "/logout",
  auth,
  Logger("POST users/logout"),
  async (request, response) => {
    try {
      // Token'ı header'dan al
      const token = request.headers.authorization.split(" ")[1];

      // Token'ın süresi kaç saniye kaldığını hesapla
      const decoded = jwt.decode(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      // Redis config'den addToBlacklist fonksiyonunu import et
      const { addToBlacklist } = require("../config/redis");

      // Token'ı blacklist'e ekle
      const result = await addToBlacklist(token, expiresIn);

      if (result) {
        const clientIP =
          request.headers["x-forwarded-for"] || request.socket.remoteAddress;
        console.log(
          getTimeForLog() + "User",
          request.user.username,
          "logged out [" + clientIP + "]"
        );

        response.status(200).send({
          message: "Başarıyla çıkış yapıldı",
        });
      } else {
        response.status(500).send({
          message: "Çıkış işlemi sırasında bir hata oluştu",
        });
      }
    } catch (error) {
      response.status(500).send({
        message: "Çıkış yapılırken bir hata oluştu",
        error: error.message,
      });
    }
  }
);

// validate token endpoint
router.post("/validate-token", async (request, response) => {
  try {
    // Token'ı authorization header'dan al
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(400).send({
        success: false,
        message: "Authorization başlığında geçerli bir Bearer token bulunamadı",
        valid: false,
      });
    }

    // Bearer prefix'ini kaldır ve token'ı al
    const token = authHeader.substring(7);

    if (!token || token.trim() === "") {
      return response.status(400).send({
        success: false,
        message: "Token gereklidir",
        valid: false,
      });
    }

    // Redis config'den isValidToken fonksiyonunu import et
    const { isValidToken } = require("../config/redis");

    try {
      // Token'ı doğrula
      const decodedToken = jwt.verify(token, "RANDOM-TOKEN");

      // console.log(
      //   getTimeForLog() +
      //     `Validating token for user ${decodedToken.username} (${decodedToken.id})`
      // );

      // Token'ın blacklist'te olup olmadığını ve versiyon kontrolünü yap
      const tokenValid = await isValidToken(token);

      if (!tokenValid) {
        // console.log(
        //   getTimeForLog() +
        //     `Token validation failed for ${decodedToken.username}`
        // );
        return response.status(401).send({
          success: false,
          message: "Token geçersiz veya oturum sonlandırılmış",
          valid: false,
        });
      }

      // console.log(
      //   getTimeForLog() +
      //     `Token validated successfully for ${decodedToken.username}`
      // );

      // Token geçerliyse kullanıcı bilgilerini döndür (password hariç)
      response.status(200).send({
        success: true,
        message: "Token geçerlidir",
        valid: true,
        user: {
          id: decodedToken.id,
          username: decodedToken.username,
          roles: decodedToken.roles,
        },
        expiresAt: new Date(decodedToken.exp * 1000), // Unix timestamp'i tarih formatına çevir
      });
    } catch (jwtError) {
      // JWT doğrulama hatası (süresi dolmuş, hatalı format, vs.)
      console.error(
        getTimeForLog() + "JWT verification error:",
        jwtError.message
      );
      return response.status(401).send({
        success: false,
        message: "Token geçersiz: " + jwtError.message,
        valid: false,
      });
    }
  } catch (error) {
    console.error(getTimeForLog() + "General token validation error:", error);
    response.status(500).send({
      success: false,
      message: "Token doğrulanırken bir hata oluştu",
      error: error.message,
      valid: false,
    });
  }
});

module.exports = router;
