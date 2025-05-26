const Title = require("../model/Title");
const getTimeForLog = require("../common/time");
const constantTitles = require("../constants/Titles").ConstantTitles;

const User = require("../model/User");
const toSHA256 = require("../common/hashing");

const checkConstantTitle = () => {
  let totalCount = constantTitles.length;
  let succesfullCount = 0;
  let alreadExistCount = 0;
  let failedCount = 0;

  constantTitles.forEach((title) => {
    Title.findOne({ kind: title.kind, name: title.name })
      .then((data) => {
        if (!data) {
          const newTitle = new Title({
            name: title.name,
            kind: title.kind,
            deletable: title.deletable,
            oncelikSirasi: title.oncelikSirasi,
          });
          newTitle.save().then((data) => {
            console.log(
              getTimeForLog() + `Title ${data.name} saved successfully.`
            );
            succesfullCount++;
          });
        } else {
          alreadExistCount++;
        }
      })
      .catch((error) => {
        console.log("Error: ", error);
        failedCount++;
      });
  });

  console.log(
    getTimeForLog() +
      `Total Title: ${totalCount}, Succesfull: ${succesfullCount}, Alread Exist: ${alreadExistCount}, Failed: ${failedCount}`
  );
};

const createAdminUser = () => {
  const adminUser = {
    username: "admin",
    name: "Yönetici",
    surname: "Kullanıcı",
    password: toSHA256("123456"), // Şifreyi SHA256 ile hashle
    roles: [
      "admin", // Admin rolü
    ],
  };

  // eğer veritabanı boşsa admin kullanıcısını oluştur
  User.countDocuments({})
    .then((count) => {
      if (count === 0) {
        // Eğer veritabanında hiç kullanıcı yoksa admin kullanıcısını oluştur
        User.create(adminUser)
          .then(() => {
            console.log(getTimeForLog() + "Admin user created successfully.");
          })
          .catch((error) => {
            console.error(
              getTimeForLog() + "Error creating admin user:",
              error
            );
          });
      } else {
        console.log(getTimeForLog() + "Admin user already exists.");
      }
    })
    .catch((error) => {
      console.error(getTimeForLog() + "Error checking user count:", error);
    });
};

module.exports = {
  checkConstantTitle,
  createAdminUser
};
