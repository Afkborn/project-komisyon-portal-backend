const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();
const Leave = require("../model/Leave");
const { Person } = require("../model/Person");
const auth = require("../middleware/auth");

// get all leaves by ID
router.get("/:ID", auth, (request, response) => {
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

router.post("/:ID", auth, async (request, response) => {
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
    });

    const savedLeave = await leave.save();

    // add the leave to the person's leave list
    person.izinler.push(savedLeave._id);

    // save the updated person object
    await person.save();

    response.send({
      success: true,
      data: savedLeave,
    });
  } catch (error) {
    response.status(500).send({
      message: error.message || Messages.LEAVE_NOT_SAVED,
    });
  }
});

module.exports = router;
