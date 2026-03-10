const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createPictureUploadMiddleware = (folderName) => {
  const uploadBaseDir = path.join(__dirname, "..", "uploads", folderName);

  const storage = multer.diskStorage({
    destination: (request, file, cb) => {
      fs.mkdirSync(uploadBaseDir, { recursive: true });
      cb(null, uploadBaseDir);
    },
    filename: (request, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (request, file, cb) => {
    const allowedExtensions = [".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error("Sadece .png, .jpg ve .jpeg formatları yüklenebilir"));
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
};

module.exports = createPictureUploadMiddleware;
