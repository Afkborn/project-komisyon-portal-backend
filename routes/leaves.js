const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Leave = require("../model/Leave");
const { Person } = require("../model/Person");
const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

// get all leaves by ID
router.get("/:ID", auth, Logger("GET /leaves/"), (request, response) => {
  const ID = request.params.ID;
  Leave.find({ personID: ID })
    .select("-__v")
    .then((leaves) => {
      response.send({
        success: true,
        leaveList: leaves,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.LEAVES_NOT_FOUND,
      });
    });
});

// post a leave
router.post(
  "/:ID",
  auth,
  Logger("POST /leaves/"),
  async (request, response) => {
    const ID = request.params.ID;

    try {
      // check if the person exists
      const person = await Person.findById(ID);
      if (!person) {
        return response.status(404).send({
          success: false,
          message: Messages.PERSON_NOT_FOUND,
        });
      }

      const leave = new Leave({
        personID: ID,
        startDate: request.body.startDate,
        endDate: request.body.endDate,
        reason: request.body.reason,
        comment: request.body.comment,
        dayCount: request.body.dayCount,
      });

      const savedLeave = await leave.save();

      // add the leave to the person's leave list
      person.izinler.push(savedLeave._id);

      // save the updated person object
      await person.save();

      recordActivity(
        request.user.id,
        RequestTypeList.LEAVE_CREATE,
        ID,
        null,
        null,
        null,
        null,
        savedLeave._id
      );

      response.send({
        success: true,
        data: savedLeave,
      });
    } catch (error) {
      response.status(500).send({
        message: error.message || Messages.LEAVE_NOT_SAVED,
      });
    }
  }
);

// delete a leave by ID
router.delete("/:ID", auth, Logger("DELETE /leaves/"), (request, response) => {
  const ID = request.params.ID;
  Leave.findByIdAndDelete(ID)
    .then((leave) => {
      if (!leave) {
        return response.status(404).send({
          success: false,
          message: Messages.LEAVE_NOT_FOUND,
        });
      }

      recordActivity(
        request.user.id,
        RequestTypeList.LEAVE_DELETE,
        leave.personID,
        null,
        null,
        null,
        null,
        ID
      );

      response.send({
        success: true,
        message: Messages.LEAVE_DELETED,
      });
    })
    .catch((error) => {
      response.status(500).send({
        message: error.message || Messages.LEAVE_NOT_DELETED,
      });
    });
});

module.exports = router;
