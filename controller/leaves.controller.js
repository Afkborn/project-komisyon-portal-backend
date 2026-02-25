const Messages = require("../constants/Messages");
const Leave = require("../model/Leave");
const { Person } = require("../model/Person");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

/**
 * GET /api/leaves/:ID - Personelin İzinlerini getir
 */
async function getAllLeavesById(request, response) {
  try {
    const ID = request.params.ID;

    const leaves = await Leave.find({ personID: ID }).select("-__v");

    return response.status(200).send({
      success: true,
      leaveList: leaves,
    });
  } catch (error) {
    return response.status(500).send({
      success: false,
      message: error.message || Messages.LEAVES_NOT_FOUND,
    });
  }
}

/**
 * POST /api/leaves/:ID - İzin ekle
 */
async function createLeave(request, response) {
  try {
    const ID = request.params.ID;

    // Personel var mı kontrol et
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

    // İzni personelin listesine ekle
    person.izinler.push(savedLeave._id);
    await person.save();

    await recordActivity(
      request.user.id,
      RequestTypeList.LEAVE_CREATE,
      ID,
      null,
      null,
      null,
      null,
      savedLeave._id
    );

    return response.status(201).send({
      success: true,
      data: savedLeave,
    });
  } catch (error) {
    return response.status(500).send({
      success: false,
      message: error.message || Messages.LEAVE_NOT_SAVED,
    });
  }
}

/**
 * PUT /api/leaves/:ID - İzin güncelle
 */
async function updateLeave(request, response) {
  try {
    const ID = request.params.ID;

    // İzin var mı kontrol et
    const leave = await Leave.findById(ID);
    if (!leave) {
      return response.status(404).send({
        success: false,
        message: Messages.LEAVE_NOT_FOUND,
      });
    }

    // Güncellenecek alanlar
    const updateData = {};
    if (request.body.startDate !== undefined)
      updateData.startDate = request.body.startDate;
    if (request.body.endDate !== undefined)
      updateData.endDate = request.body.endDate;
    if (request.body.reason !== undefined)
      updateData.reason = request.body.reason;
    if (request.body.comment !== undefined)
      updateData.comment = request.body.comment;
    if (request.body.dayCount !== undefined)
      updateData.dayCount = request.body.dayCount;

    // İzni güncelle
    const updatedLeave = await Leave.findByIdAndUpdate(ID, updateData, {
      new: true,
    });

    await recordActivity(
      request.user.id,
      RequestTypeList.LEAVE_UPDATE,
      leave.personID,
      null,
      null,
      null,
      null,
      ID
    );

    return response.status(200).send({
      success: true,
      message: "İzin başarıyla güncellendi",
      data: updatedLeave,
    });
  } catch (error) {
    return response.status(500).send({
      success: false,
      message: error.message || Messages.LEAVE_NOT_SAVED,
    });
  }
}

/**
 * DELETE /api/leaves/:ID - İzin sil
 */
async function deleteLeave(request, response) {
  try {
    const ID = request.params.ID;

    const leave = await Leave.findByIdAndDelete(ID);
    if (!leave) {
      return response.status(404).send({
        success: false,
        message: Messages.LEAVE_NOT_FOUND,
      });
    }

    await recordActivity(
      request.user.id,
      RequestTypeList.LEAVE_DELETE,
      leave.personID,
      null,
      null,
      null,
      null,
      ID
    );

    return response.status(200).send({
      success: true,
      message: Messages.LEAVE_DELETED,
    });
  } catch (error) {
    return response.status(500).send({
      success: false,
      message: error.message || Messages.LEAVE_NOT_DELETED,
    });
  }
}

module.exports = {
  getAllLeavesById,
  createLeave,
  updateLeave,
  deleteLeave,
};
