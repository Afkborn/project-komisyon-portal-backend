const Messages = require("../constants/Messages");
const User = require("../model/User");
const { Person } = require("../model/Person");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const getTimeForLog = require("../common/time");
const toSHA256 = require("../common/hashing");
const {
  redisClient,
  isConnected,
  invalidateAllUserTokens,
  addToBlacklist,
  isValidToken,
} = require("../config/redis");

const personPopulate = {
  path: "person",
  select:
    "sicil ad soyad birimID birimeBaslamaTarihi gecmisBirimler isTemporary temporaryBirimID",
  populate: [
    { path: "birimID", select: "_id name institutionID unitTypeID" },
    { path: "ikinciBirimID", select: "_id name institutionID unitTypeID" },
    { path: "temporaryBirimID", select: "_id name institutionID unitTypeID" },
    {
      path: "gecmisBirimler",
      select: "-__v -personID -createdDate",
      populate: {
        path: "unitID",
        select: "_id name",
      },
    },
  ],
};

// POST /users/login
// Kullanıcı girişi
exports.login = async (request, response) => {
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
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 5 * 60;

    let attempts = 0;
    let lockedUntil = null;
    let redisAvailable = false;

    if (redisClient && isConnected()) {
      try {
        const rc = redisClient();
        redisAvailable = true;

        const [currentAttempts, lockTimestamp] = await Promise.all([
          rc.get(`loginAttempts:${user.username}`),
          rc.get(`loginLock:${user.username}`),
        ]);

        if (currentAttempts) {
          attempts = parseInt(currentAttempts);
        }

        if (lockTimestamp) {
          const now = Math.floor(Date.now() / 1000);
          const lockTime = parseInt(lockTimestamp);

          if (now < lockTime) {
            const remainingSeconds = lockTime - now;
            const remainingMinutes = Math.ceil(remainingSeconds / 60);

            return response.status(429).send({
              success: false,
              message: `Çok fazla hatalı giriş denemesi. Hesabınız geçici olarak kilitlendi. ${remainingMinutes} dakika sonra tekrar deneyiniz.`,
              lockedUntil: new Date(lockTime * 1000),
              remainingAttempts: 0,
            });
          } else {
            await rc.del(`loginLock:${user.username}`);
            await rc.del(`loginAttempts:${user.username}`);
            attempts = 0;
          }
        }
      } catch (redisError) {
        console.error(getTimeForLog() + "Redis lock check error:", redisError);
        redisAvailable = false;
        attempts = 0;
      }
    }

    if (user.password !== toSHA256(request.body.password)) {
      attempts++;

      if (redisAvailable) {
        try {
          const rc = redisClient();
          const key = `loginAttempts:${user.username}`;
          const value = attempts.toString();
          await rc.setEx(key, LOCKOUT_DURATION, value);

          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            const lockUntil = Math.floor(Date.now() / 1000) + LOCKOUT_DURATION;
            await rc.setEx(
              `loginLock:${user.username}`,
              LOCKOUT_DURATION,
              lockUntil.toString(),
            );

            console.log(
              getTimeForLog() +
                `User ${user.username} account locked until ${new Date(
                  lockUntil * 1000,
                )}`,
            );

            return response.status(429).send({
              success: false,
              message: `Çok fazla hatalı giriş denemesi. Hesabınız 30 dakika süreyle kilitlendi.`,
              lockedUntil: new Date(lockUntil * 1000),
              remainingAttempts: 0,
            });
          }

          console.log(
            getTimeForLog() +
              `Login attempts for ${user.username} updated to ${attempts}`,
          );
        } catch (redisError) {
          console.error(getTimeForLog() + "Redis error:", redisError);
        }
      } else {
        console.log(
          getTimeForLog() +
            `Redis unavailable, cannot track login attempts for ${user.username}`,
        );
      }

      const remainingAttempts = redisAvailable
        ? Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
        : 1;
      const attemptsMessage =
        remainingAttempts > 0
          ? `Kalan giriş hakkı: ${remainingAttempts}`
          : "Çok fazla hatalı giriş denemesi. Hesabınız kilitlendi.";

      return response.status(401).send({
        success: false,
        message: `${Messages.PASSWORD_INCORRECT}. ${attemptsMessage}`,
        remainingAttempts: remainingAttempts,
      });
    }

    if (redisAvailable) {
      try {
        const rc = redisClient();
        await rc.del(`loginAttempts:${user.username}`);
        await rc.del(`loginLock:${user.username}`);
        console.log(
          getTimeForLog() +
            `Login attempts and locks reset for ${user.username} after successful login`,
        );
      } catch (redisError) {
        console.error(
          getTimeForLog() + "Redis error when resetting login attempts:",
          redisError,
        );
      }
    }

    let tokenVersion = Date.now();

    if (redisClient && isConnected()) {
      const currentVersion = await redisClient().get(
        `user:${user._id}:tokenVersion`,
      );
      if (currentVersion) {
        tokenVersion = parseInt(currentVersion);
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        roles: user.roles,
        ver: tokenVersion,
      },
      "RANDOM-TOKEN",
      { expiresIn: "7d" },
    );

    const clientIP =
      request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    console.log(
      getTimeForLog() + "User",
      user.username,
      "logged in with token [" + clientIP + "]",
    );

    response.status(200).send({
      success: true,
      message: Messages.LOGIN_SUCCESSFUL,
      _id: user._id,
      username: user.username,
      token,
    });
  } catch (error) {
    console.error(getTimeForLog() + "Login error:", error);
    response.status(500).send({
      success: false,
      message: "Giriş yapılırken bir hata oluştu",
      error: error.message,
    });
  }
};

// POST /users/register
// Yeni kullanıcı oluştur (Admin)
exports.register = async (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      success: false,
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }

  const requiredFields = ["username", "password", "name", "surname", "roles"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  try {
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

    const personIdFromBody = request.body.personID || request.body.personId;
    if (personIdFromBody) {
      user.person = personIdFromBody;
    } else if (request.body.sicil) {
      const person = await Person.findOne({ sicil: request.body.sicil });
      if (person) {
        user.person = person._id;
      }
    }

    const result = await user.save();
    response.status(201).send({
      success: true,
      message: Messages.USER_CREATED_SUCCESSFULLY,
      result,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USER_CREATE_FAILED,
      error,
    });
  }
};

// GET /users/details
// Token'dan detayları al
exports.getDetails = async (request, response) => {
  try {
    const user = await User.findOne({ username: request.user.username }).populate(
      personPopulate,
    );

    const userData = user.toObject();
    delete userData.__v;
    delete userData.password;

    response.status(200).send({
      success: true,
      message: Messages.USER_DETAILS,
      user: userData,
    });
  } catch (error) {
    console.log(error);
    response.status(404).send({
      success: false,
      message: Messages.USER_NOT_FOUND,
      error,
    });
  }
};

// PUT /users/profile-picture
// Kullanıcının profil fotoğrafını güncelle
exports.updateProfilePicture = async (request, response) => {
  if (!request.file) {
    return response.status(400).send({
      success: false,
      message: "Profil fotoğrafı dosyası gereklidir",
    });
  }

  try {
    const user = await User.findById(request.user.id);

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    const oldProfilePicture = user.profilePicture;
    user.profilePicture = `/uploads/profiles/${request.file.filename}`;
    await user.save();

    if (oldProfilePicture) {
      const oldFileName = path.basename(oldProfilePicture);
      const oldFilePath = path.join(
        __dirname,
        "..",
        "uploads",
        "profiles",
        oldFileName,
      );

      fs.unlink(oldFilePath, (error) => {
        if (error && error.code !== "ENOENT") {
          console.error(
            getTimeForLog() +
              `Eski profil fotoğrafı silinemedi (${oldFilePath}):`,
            error,
          );
        }
      });
    }

    response.status(200).send({
      success: true,
      message: "Profil fotoğrafı güncellendi",
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: "Profil fotoğrafı güncellenemedi",
      error: error.message,
    });
  }
};

// DELETE /users/profile-picture
// Kullanıcının profil fotoğrafını sil
exports.deleteProfilePicture = async (request, response) => {
  try {
    const user = await User.findById(request.user.id);

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    if (!user.profilePicture) {
      return response.status(404).send({
        success: false,
        message: "Silinecek profil fotoğrafı bulunamadı",
      });
    }

    const fileName = path.basename(user.profilePicture);
    const filePath = path.join(__dirname, "..", "uploads", "profiles", fileName);

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          getTimeForLog() + `Profil fotoğrafı silinirken hata oluştu (${filePath}):`,
          error,
        );
      }
    }

    user.profilePicture = null;
    await user.save();

    return response.status(200).send({
      success: true,
      message: "Profil fotoğrafı başarıyla silindi",
    });
  } catch (error) {
    console.error(getTimeForLog() + "Profil fotoğrafı silme hatası:", error);
    return response.status(500).send({
      success: false,
      message: "Profil fotoğrafı silinemedi",
      error: error.message,
    });
  }
};

// PUT /users/password
// Şifreyi değiştir
exports.changePassword = async (request, response) => {
  const requiredFields = ["oldPassword", "newPassword"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
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
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    if (user.password !== toSHA256(request.body.oldPassword)) {
      return response.status(401).send({
        success: false,
        message: Messages.PASSWORD_INCORRECT,
      });
    }

    user.password = toSHA256(request.body.newPassword);
    const updatedUser = await user.save();

    console.log(
      getTimeForLog() +
        `Invalidating all tokens for user ${user._id} (${user.username})`,
    );
    const newVersion = await invalidateAllUserTokens(user._id);

    console.log(
      getTimeForLog() +
        `User ${user.username} changed password and invalidated all tokens. New version: ${newVersion}`,
    );

    response.status(200).send({
      success: true,
      message: Messages.PASSWORD_CHANGED,
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
      },
    });
  } catch (error) {
    console.error(getTimeForLog() + "Password change error:", error);
    response.status(500).send({
      success: false,
      message: Messages.PASSWORD_NOT_CHANGED,
      error: error.message,
    });
  }
};

// PUT /users/:id
// Kullanıcıyı güncelle (Admin)
exports.updateUserById = async (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      success: false,
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }

  try {
    if (request.body.password) {
      request.body.password = toSHA256(request.body.password);
    }

    // Boş string'leri silmek için $unset operatörü hazırla
    const updateData = { ...request.body };
    const unsetData = {};

    if (request.body.email === "") {
      unsetData.email = "";
      delete updateData.email;
    }
    if (request.body.phoneNumber === "") {
      unsetData.phoneNumber = "";
      delete updateData.phoneNumber;
    }

    if (updateData.personID) {
      updateData.person = updateData.personID;
      delete updateData.personID;
    } else if (updateData.sicil) {
      const person = await Person.findOne({ sicil: updateData.sicil });
      if (person) {
        updateData.person = person._id;
      }
      delete updateData.sicil;
    }

    // MongoDB update query oluştur
    const updateQuery = {};
    if (Object.keys(updateData).length > 0) {
      updateQuery.$set = updateData;
    }
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    const user = await User.findByIdAndUpdate(
      request.params.id,
      updateQuery,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      },
    ).populate(personPopulate);

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    response.status(200).send({
      success: true,
      message: Messages.USER_UPDATED,
      user,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USER_NOT_UPDATED,
      error,
    });
  }
};

// PUT /users
// Mevcut kullanıcıyı güncelle
exports.updateUser = async (request, response) => {
  try {
    // Boş string'leri silmek için $unset operatörü hazırla
    const updateData = { ...request.body };
    const unsetData = {};

    if (request.body.email === "") {
      unsetData.email = "";
      delete updateData.email;
    }
    if (request.body.phoneNumber === "") {
      unsetData.phoneNumber = "";
      delete updateData.phoneNumber;
    }

    if (updateData.personID) {
      updateData.person = updateData.personID;
      delete updateData.personID;
    } else if (updateData.sicil) {
      const person = await Person.findOne({ sicil: updateData.sicil });
      if (person) {
        updateData.person = person._id;
      }
      delete updateData.sicil;
    }

    // MongoDB update query oluştur
    const updateQuery = {};
    if (Object.keys(updateData).length > 0) {
      updateQuery.$set = updateData;
    }
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    const user = await User.findOneAndUpdate(
      { username: request.user.username },
      updateQuery,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      },
    ).populate(personPopulate);

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    response.status(200).send({
      success: true,
      message: Messages.USER_UPDATED,
      user,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USER_NOT_UPDATED,
      error,
    });
  }
};

// DELETE /users
// Mevcut kullanıcıyı sil
exports.deleteUser = async (request, response) => {
  const requiredFields = ["password"];
  const missingFields = requiredFields.filter((field) => !request.body[field]);
  if (missingFields.length > 0) {
    return response.status(400).send({
      success: false,
      message: `${missingFields.join(", ")} ${Messages.REQUIRED_FIELD}`,
    });
  }

  try {
    const user = await User.findOneAndDelete({
      username: request.user.username,
    });

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    const password = toSHA256(request.body.password);

    if (user.password !== password) {
      return response.status(401).send({
        success: false,
        message: Messages.PASSWORD_INCORRECT,
      });
    }

    response.status(200).send({
      success: true,
      message: Messages.USER_DELETED,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USER_NOT_DELETED,
      error,
    });
  }
};

// DELETE /users/:id
// Kullanıcıyı sil (Admin)
exports.deleteUserById = async (request, response) => {
  if (!request.user.roles.includes("admin")) {
    return response.status(403).send({
      success: false,
      message: Messages.USER_NOT_AUTHORIZED,
    });
  }

  try {
    const user = await User.findByIdAndDelete(request.params.id);

    if (!user) {
      return response.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    response.status(200).send({
      success: true,
      message: Messages.USER_DELETED,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USER_NOT_DELETED,
      error,
    });
  }
};

// GET /users
// Tüm kullanıcıları listele (Admin)
exports.getAllUsers = async (request, response) => {
  try {
    const users = await User.find();

    const sanitizedUsers = users.map((user) => {
      const userData = user.toObject();
      delete userData.password;
      delete userData.__v;
      return userData;
    });

    response.status(200).send({
      success: true,
      message: Messages.USERS_LIST,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USERS_GET_FAILED,
      error,
    });
  }
};

// GET /users/names
// Tüm kullanıcıların isim/soyadını listele
exports.getUserNames = async (request, response) => {
  try {
    const users = await User.find({}, "name surname");

    response.status(200).send({
      success: true,
      message: Messages.USERS_LIST,
      users,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: Messages.USERS_GET_FAILED,
      error,
    });
  }
};

// POST /users/logout
// Çıkış yap
exports.logout = async (request, response) => {
  try {
    const token = request.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    const result = await addToBlacklist(token, expiresIn);

    if (result) {
      const clientIP =
        request.headers["x-forwarded-for"] || request.socket.remoteAddress;
      console.log(
        getTimeForLog() + "User",
        request.user.username,
        "logged out [" + clientIP + "]",
      );

      response.status(200).send({
        success: true,
        message: "Başarıyla çıkış yapıldı",
      });
    } else {
      response.status(500).send({
        success: false,
        message: "Çıkış işlemi sırasında bir hata oluştu",
      });
    }
  } catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: "Çıkış yapılırken bir hata oluştu",
      error: error.message,
    });
  }
};

// POST /users/validate-token
// Token doğrula (Herkes)
exports.validateToken = async (request, response) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(400).send({
        success: false,
        message: "Authorization başlığında geçerli bir Bearer token bulunamadı",
        valid: false,
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === "") {
      return response.status(400).send({
        success: false,
        message: "Token gereklidir",
        valid: false,
      });
    }

    try {
      const decodedToken = jwt.verify(token, "RANDOM-TOKEN");
      const tokenValid = await isValidToken(token);

      if (!tokenValid) {
        return response.status(401).send({
          success: false,
          message: "Token geçersiz veya oturum sonlandırılmış",
          valid: false,
        });
      }

      response.status(200).send({
        success: true,
        message: "Token geçerlidir",
        valid: true,
        user: {
          id: decodedToken.id,
          username: decodedToken.username,
          roles: decodedToken.roles,
        },
        expiresAt: new Date(decodedToken.exp * 1000),
      });
    } catch (jwtError) {
      console.error(
        getTimeForLog() + "JWT verification error:",
        jwtError.message,
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
};
