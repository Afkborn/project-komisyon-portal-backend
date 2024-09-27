const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");
const Activity = require("../model/Activity");

// const RequestTypeList = require("../constants/ActivityTypeList");
const { getActivityWithID } = require("../actions/ActivityActions");

// get activity with userid
router.get(
  "/:userID",
  auth,
  Logger("GET /activities/"),
  async (request, response) => {
    try {
      const activities = await Activity.find({
        userID: request.params.userID,
      })
        .populate("userID", "-password -__v -createdDate -createdAt -updatedAt")
        .populate("personID", "sicil ad soyad")
        .select("-__v");

      // Her activity içinde dönüp typeID'yi RequestTypeList'ten alınan değerle değiştiriyoruz
      const responseActivities = activities.map((element) => {
        const activityObj = element.toObject(); // Mongoose belgesini düz nesneye çevir
        let type = getActivityWithID(activityObj.typeID);
        activityObj.type = type; // Yeni 'type' alanını ekle
        delete activityObj.typeID; // Eski 'typeID' alanını sil
        return activityObj; // Yeni nesneyi döndür
      });

      response.json(responseActivities);
    } catch (error) {
      console.log(error);
      response.status(500).send(Messages.SERVER_ERROR);
    }
  }
);

module.exports = router;
