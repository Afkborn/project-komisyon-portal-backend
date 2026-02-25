const Messages = require("../constants/Messages");
const User = require("../model/User");
const Person = require("../model/Person");
const BiNotDerkenar = require("../model/BiNotDerkenar");
const BiNotNotification = require("../model/BiNotNotification");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

/**
 * Helper: Request'ten userId'yi al
 */
function getUserId(req) {
  return req?.user?.id || req?.user?._id;
}

/**
 * Helper: Kullanıcının birim ID'lerini al
 */
async function getUserUnitIds(userId) {
  const user = await User.findById(userId).populate("person");
  if (!user) {
    return { user: null, unitIds: [] };
  }

  const unitIds = [];
  const person = user.person;

  if (person) {
    if (person.birimID) unitIds.push(person.birimID);
    if (person.ikinciBirimID) unitIds.push(person.ikinciBirimID);
    if (person.temporaryBirimID) unitIds.push(person.temporaryBirimID);
  }

  const unique = [
    ...new Set(unitIds.filter(Boolean).map((id) => id.toString())),
  ];
  return { user, unitIds: unique };
}

/**
 * Helper: reminderTarget'a göre alıcı listesini hazırla
 */
async function getNotificationRecipients(
  reminderTarget,
  birimID,
  excludeUserId,
) {
  const recipients = [];

  if (reminderTarget === "UNIT") {
    const users = await User.find().populate("person").select("_id person");

    for (const user of users) {
      if (!user.person) {
        continue;
      }

      const personBirimIds = [
        user.person.birimID,
        user.person.ikinciBirimID,
        user.person.temporaryBirimID,
      ]
        .filter(Boolean)
        .map((id) => id.toString());

      const birimIdStr = birimID.toString();
      const matches = personBirimIds.includes(birimIdStr);

      if (matches && user._id.toString() !== excludeUserId.toString()) {
        recipients.push({
          user: user._id,
          isRead: false,
        });
      }
    }
  }

  return recipients;
}

/**
 * POST /api/biNot/add - Not ekle
 */
async function addNote(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const { title, content, fileNumber } = req.body;
    const isPrivate = Boolean(req.body.isPrivate);
    const hasReminder = Boolean(req.body.hasReminder);
    const reminderDate = req.body.reminderDate;
    const priority = req.body.priority;

    if (!title) {
      return res.status(400).send({
        success: false,
        message: `title ${Messages.REQUIRED_FIELD}`,
      });
    }

    if (hasReminder && !reminderDate) {
      return res.status(400).send({
        success: false,
        message: `reminderDate ${Messages.REQUIRED_FIELD}`,
      });
    }

    let birimID = req.body.birimID;
    if (!birimID) {
      const { user } = await getUserUnitIds(userId);
      birimID = user?.person?.temporaryBirimID || user?.person?.birimID || null;
    }
    if (!birimID) {
      return res.status(400).send({
        success: false,
        message: `birimID ${Messages.REQUIRED_FIELD}`,
      });
    }

    const reminderTarget = isPrivate
      ? "SELF"
      : req.body.reminderTarget || "SELF";

    const derkenar = new BiNotDerkenar({
      title,
      content,
      fileNumber,
      creator: userId,
      birimID,
      isPrivate,
      hasReminder,
      reminderDate: hasReminder ? new Date(reminderDate) : undefined,
      reminderTarget,
      priority,
    });

    const saved = await derkenar.save();

    if (hasReminder) {
      const recipients = await getNotificationRecipients(
        reminderTarget,
        birimID,
        userId,
      );

      recipients.push({
        user: userId,
        isRead: false,
      });

      await BiNotNotification.create({
        derkenarID: saved._id,
        recipients,
        birimID: saved.birimID,
      });
    }

    await recordActivity(
      userId,
      RequestTypeList.BINOT_CREATE_NOTE,
      null,
      `BİNOT not eklendi: ${saved.title}`,
      null,
      saved.birimID,
    );

    return res.status(201).send({
      success: true,
      data: saved,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

/**
 * GET /api/biNot/list - Notları listele
 */
async function getNotesList(req, res) {
  const userId = getUserId(req);
  let { isPrivate, birimId } = req.query;
  isPrivate =
    isPrivate === "true" ? true : isPrivate === "false" ? false : null;

  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const { user, unitIds } = await getUserUnitIds(userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: Messages.USER_NOT_FOUND,
      });
    }

    const orFilters = [];

    if (isPrivate === true) {
      orFilters.push({
        creator: userId,
        isPrivate: true,
      });
    } else if (isPrivate === false) {
      if (unitIds.length > 0) {
        orFilters.push({
          birimID: { $in: unitIds },
          isPrivate: false,
        });
      }
    } else if (birimId) {
      orFilters.push({
        birimID: birimId,
        isPrivate: false,
      });
    } else {
      if (unitIds.length > 0) {
        orFilters.push({
          birimID: { $in: unitIds },
          isPrivate: false,
        });
      }
      orFilters.push({
        creator: userId,
        isPrivate: true,
      });
    }

    const list = await BiNotDerkenar.find({ $or: orFilters })
      .populate({
        path: "creator",
        select: "username name surname",
        populate: {
          path: "person",
          select: "sicil",
        },
      })
      .populate("birimID", "name")
      .sort({ createdAt: -1 })
      .lean();

    const noteIds = list.map((note) => note._id);
    let notificationsByNoteId = {};

    if (noteIds.length > 0) {
      const notifications = await BiNotNotification.find({
        derkenarID: { $in: noteIds },
      })
        .populate({
          path: "recipients.user",
          select: "username name surname",
          populate: {
            path: "person",
            select: "sicil",
          },
        })
        .populate("birimID", "name")
        .sort({ createdAt: -1 })
        .lean();

      notificationsByNoteId = notifications.reduce((acc, notification) => {
        const key = notification.derkenarID.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(notification);
        return acc;
      }, {});
    }

    const enrichedList = list.map((note) => {
      const notifications = notificationsByNoteId[note._id.toString()] || [];
      return {
        ...note,
        notifications,
      };
    });

    await recordActivity(
      userId,
      RequestTypeList.BINOT_LIST_NOTE,
      null,
      "BİNOT not listesi görüntülendi",
    );

    return res.status(200).send({
      success: true,
      length: enrichedList.length,
      list: enrichedList,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

/**
 * PUT /api/biNot/:id - Not düzenle
 */
async function updateNote(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const noteId = req.params.id;
    const { title, content, fileNumber, priority, isPrivate, isCompleted } =
      req.body;

    const note = await BiNotDerkenar.findById(noteId);
    if (!note) {
      return res.status(404).send({
        success: false,
        message: Messages.BINOT_NOTE_NOT_FOUND,
      });
    }

    // Notu sadece oluşturan kişi düzenleyebilir
    // if (note.creator.toString() !== userId.toString()) {
    //   return res.status(403).send({
    //     success: false,
    //     message: Messages.USER_NOT_AUTHORIZED,
    //   });
    // }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (fileNumber !== undefined) note.fileNumber = fileNumber;
    if (priority !== undefined) note.priority = priority;
    if (isPrivate !== undefined) note.isPrivate = isPrivate;
    if (isCompleted !== undefined) note.isCompleted = isCompleted;

    const updated = await note.save();

    await recordActivity(
      userId,
      RequestTypeList.BINOT_CREATE_NOTE,
      null,
      `BİNOT not düzenlendi: ${updated.title}`,
      null,
      updated.birimID,
    );

    return res.status(200).send({
      success: true,
      data: updated,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

/**
 * DELETE /api/biNot/:id - Not sil
 */
async function deleteNote(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const note = await BiNotDerkenar.findById(req.params.id);
    if (!note) {
      return res.status(404).send({
        success: false,
        message: Messages.BINOT_NOTE_NOT_FOUND,
      });
    }

    // if (note.creator.toString() !== userId.toString()) {
    //   return res.status(403).send({
    //     success: false,
    //     message: Messages.USER_NOT_AUTHORIZED,
    //   });
    // }

    await BiNotNotification.deleteMany({ derkenarID: note._id });
    await BiNotDerkenar.deleteOne({ _id: note._id });

    await recordActivity(
      userId,
      RequestTypeList.BINOT_DELETE_NOTE,
      null,
      `BİNOT not silindi: ${note.title}`,
      null,
      note.birimID,
    );

    return res.status(200).send({
      success: true,
      message: Messages.BINOT_NOTE_DELETED,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

/**
 * GET /api/biNot/notifications/list - Bildirimleri listele
 */
async function getNotificationsList(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const now = new Date();

    const notifications = await BiNotNotification.find({
      "recipients.user": userId,
    })
      .populate({
        path: "derkenarID",
        select: "title content fileNumber priority isCompleted reminderDate",
        match: {
          hasReminder: true,
          isCompleted: false,
          reminderDate: { $exists: true, $ne: null, $lte: now },
        },
      })
      .populate({
        path: "birimID",
        select: "name",
      })
      .select("message createdAt derkenarID birimID recipients")
      .sort({ createdAt: -1 })
      .lean();

    const userNotifications = notifications
      .filter((notif) => notif.derkenarID)
      .map((notif) => {
        const userRecipient = notif.recipients.find(
          (r) => r.user.toString() === userId.toString(),
        );
        return {
          _id: notif._id,
          message: notif.message,
          derkenar: notif.derkenarID,
          birim: notif.birimID,
          isRead: userRecipient?.isRead || false,
          readAt: userRecipient?.readAt || null,
          createdAt: notif.createdAt,
        };
      });

    return res.status(200).send({
      success: true,
      length: userNotifications.length,
      list: userNotifications,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

/**
 * PATCH /api/biNot/notifications/read/:id - Bildirimi okundu işaretle
 */
async function markNotificationAsRead(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send({
      success: false,
      message: Messages.TOKEN_NOT_FOUND,
    });
  }

  try {
    const notificationId = req.params.id;

    const notif = await BiNotNotification.findById(notificationId);
    if (!notif) {
      return res.status(404).send({
        success: false,
        message: "Bildirim bulunamadı",
      });
    }

    const userInRecipients = notif.recipients.some(
      (r) => r.user.toString() === userId.toString(),
    );
    if (!userInRecipients) {
      return res.status(403).send({
        success: false,
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    const updated = await BiNotNotification.findOneAndUpdate(
      {
        _id: notificationId,
        "recipients.user": userId,
      },
      {
        $set: {
          "recipients.$.isRead": true,
          "recipients.$.readAt": new Date(),
        },
      },
      { new: true },
    )
      .populate({
        path: "derkenarID",
        select: "title content fileNumber",
      })
      .populate({
        path: "birimID",
        select: "name",
      });

    return res.status(200).send({
      success: true,
      message: "Bildirim okundu işaretlendi",
      data: updated,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message || Messages.SERVER_ERROR,
    });
  }
}

module.exports = {
  addNote,
  getNotesList,
  updateNote,
  deleteNote,
  getNotificationsList,
  markNotificationAsRead,
};
