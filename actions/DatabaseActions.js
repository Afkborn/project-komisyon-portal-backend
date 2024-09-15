const Title = require("../model/Title");
const getTimeForLog = require("../common/time");
const constantTitles = require("../constants/Titles").ConstantTitles;

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

module.exports = {
  checkConstantTitle,
};
