const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");
const createPictureUploadMiddleware = require("../middleware/profilePictureUpload");
const profilePictureUpload = createPictureUploadMiddleware("profiles");
const {
  login,
  register,
  getDetails,
  updateProfilePicture,
  deleteProfilePicture,
  changePassword,
  updateUserById,
  updateUser,
  deleteUser,
  deleteUserById,
  getAllUsers,
  getUserNames,
  logout,
  validateToken,
} = require("../controller/users.controller");

// POST /api/users/login
// Kullanıcı girişi (Auth yok)
router.post("/login", Logger("POST /users/login"), login);

// POST /api/users/validate-token
// Token doğrula (Auth yok)
router.post(
  "/validate-token",
  Logger("POST /users/validate-token"),
  validateToken,
);

// POST /api/users/register
// Yeni kullanıcı oluştur (Admin)
router.post(
  "/register",
  auth,
  checkRoles([1]),
  Logger("POST /users/register"),
  register,
);

// POST /api/users/logout
// Çıkış yap
router.post("/logout", auth, Logger("POST /users/logout"), logout);

// GET /api/users/names
// Tüm kullanıcıların isim/soyadını listele
router.get(
  "/names",
  auth,
  checkRoles([2, 3, 5, 8]),
  Logger("GET /users/names"),
  getUserNames,
);

// GET /api/users/details
// Token'dan detayları al
router.get("/details", auth, Logger("GET /users/details"), getDetails);

// PUT /api/users/profile-picture
// Profil fotoğrafı yükle
router.put(
  "/profile-picture",
  auth,
  Logger("PUT /users/profile-picture"),
  (request, response, next) => {
    profilePictureUpload.single("profilePicture")(request, response, (error) => {
      if (error) {
        return response.status(400).send({
          success: false,
          message: error.message,
        });
      }
      next();
    });
  },
  updateProfilePicture,
);

// DELETE /api/users/profile-picture
// Profil fotoğrafını sil
router.delete(
  "/profile-picture",
  auth,
  Logger("DELETE /users/profile-picture"),
  deleteProfilePicture,
);

// PUT /api/users/password
// Şifreyi değiştir
router.put("/password", auth, Logger("PUT /users/password"), changePassword);

// GET /api/users
// Tüm kullanıcıları listele (Admin)
router.get("/", auth, checkRoles([10]), Logger("GET /users"), getAllUsers);

// PUT /api/users/:id
// Kullanıcıyı güncelle (Admin)
router.put(
  "/:id",
  auth,
  checkRoles([1]),
  Logger("PUT /users/:id"),
  updateUserById,
);

// PUT /api/users
// Mevcut kullanıcıyı güncelle
router.put("/", auth, Logger("PUT /users"), updateUser);

// DELETE /api/users/:id
// Kullanıcıyı sil (Admin)
router.delete(
  "/:id",
  auth,
  checkRoles([1]),
  Logger("DELETE /users/:id"),
  deleteUserById,
);

// DELETE /api/users
// Mevcut kullanıcıyı sil
router.delete("/", auth, Logger("DELETE /users"), deleteUser);

module.exports = router;
