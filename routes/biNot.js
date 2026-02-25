const Messages = require("../constants/Messages");
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const User = require("../model/User");
const Person = require("../model/Person");

const BiNotDerkenar = require("../model/BiNotDerkenar");
const BiNotNotification = require("../model/BiNotNotification");

const { recordActivity } = require("../actions/ActivityActions");
const RequestTypeList = require("../constants/ActivityTypeList");

function getUserId(req) {
  return req?.user?.id || req?.user?._id;
}

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

// Helper: reminderTarget'a göre alıcı listesini hazırla
async function getNotificationRecipients(
  reminderTarget,
  birimID,
  excludeUserId,
) {
  const recipients = [];

  if (reminderTarget === "UNIT") {
    // User modelinden tüm User'ları al ve person'ları populate et
    const users = await User.find().populate("person").select("_id person");

    // console.log(
    //   `Birim ID ${birimID} için ${users.length} kullanıcı bulundu. Filtreleniyor...`,
    // );

    // Client-side filtering: person'u olan ve birimID eşleşen User'ları bul
    for (const user of users) {
      if (!user.person) {
        // Bu user'ın person'u yok, atla
        continue;
      }

      // Bu user'ın person'unda birimID eşleşiyor mu?
      const personBirimIds = [
        user.person.birimID,
        user.person.ikinciBirimID,
        user.person.temporaryBirimID,
      ]
        .filter(Boolean)
        .map((id) => id.toString());

      const birimIdStr = birimID.toString();
      const matches = personBirimIds.includes(birimIdStr);

    //   console.log(
    //     `User ${user._id}: person=${user.person._id}, birimler=[${personBirimIds.join(", ")}], matches=${matches}`,
    //   );

      if (matches && user._id.toString() !== excludeUserId.toString()) {
        recipients.push({
          user: user._id,
          isRead: false,
        });
      }
    }

    // console.log(
    //   `Birim bildirim için ${recipients.length} alıcı seçildi: ${recipients.map((r) => r.user).join(", ")}`,
    // );
  }

  return recipients;
}

// POST /api/biNot/add
router.post("/add", auth, Logger("POST /biNot/add"), async (req, res) => {
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

    // birimID zorunlu (model required). Body'de yoksa kullanıcı person'ından türet.
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

    // reminderTarget: private notlarda zorunlu olarak SELF
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

    // Bildirim oluştur
    if (hasReminder) {
      // reminderTarget'a göre alıcıları belirle
      const recipients = await getNotificationRecipients(
        reminderTarget,
        birimID,
        userId,
      );

      // Creator'ı her zaman dahil et
      recipients.push({
        user: userId,
        isRead: false,
      });

      // Tek bir bildirim dökümanı oluştur
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
});

// GET /api/biNot/list
router.get("/list", auth, Logger("GET /biNot/list"), async (req, res) => {
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

    // isPrivate öncelikli kontrol (birimId göz ardı edilir)
    if (isPrivate === true) {
      // Sadece şahsi notlar
      orFilters.push({
        creator: userId,
        isPrivate: true,
      });
    } else if (isPrivate === false) {
      // Sadece birim notları (tüm birimler)
      if (unitIds.length > 0) {
        orFilters.push({
          birimID: { $in: unitIds },
          isPrivate: false,
        });
      }
    } else if (birimId) {
      // Sadece belirtilen birime ait notlar (isPrivate belirtilmemiş)
      orFilters.push({
        birimID: birimId,
        isPrivate: false,
      });
    } else {
      // Hiçbir parametre yoksa her ikisini de getir
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
});

// PUT /api/biNot/:id
// Derkenarı düzenle (title, content, fileNumber, priority, isPrivate, isCompleted)
// NOT: AnımsatıcılarLA ilgili değişiklik yapılmaz
router.put("/:id", auth, Logger("PUT /biNot/:id"), async (req, res) => {
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

    // Derkenarı bul
    const note = await BiNotDerkenar.findById(noteId);
    if (!note) {
      return res.status(404).send({
        success: false,
        message: Messages.BINOT_NOTE_NOT_FOUND,
      });
    }

    // Sadece creator düzenleyebilir
    if (note.creator.toString() !== userId.toString()) {
      return res.status(403).send({
        success: false,
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

    // Düzenlenebilecek alanları güncelle
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (fileNumber !== undefined) note.fileNumber = fileNumber;
    if (priority !== undefined) note.priority = priority;
    if (isPrivate !== undefined) note.isPrivate = isPrivate;
    if (isCompleted !== undefined) note.isCompleted = isCompleted;

    const updated = await note.save();

    await recordActivity(
      userId,
      RequestTypeList.BINOT_CREATE_NOTE, // Event type olarak CREATE_NOTE kullanıyoruz (mevcutta UPDATE_NOTE yok)
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
});

// DELETE /api/biNot/:id
router.delete("/:id", auth, Logger("DELETE /biNot/:id"), async (req, res) => {
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

    if (note.creator.toString() !== userId.toString()) {
      return res.status(403).send({
        success: false,
        message: Messages.USER_NOT_AUTHORIZED,
      });
    }

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
});

// GET /api/biNot/notifications/list
// Kullanıcının dahil olduğu bildirimleri listele
router.get(
  "/notifications/list",
  auth,
  Logger("GET /biNot/notifications/list"),
  async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).send({
        success: false,
        message: Messages.TOKEN_NOT_FOUND,
      });
    }

    try {
      const now = new Date();

      // recipients.user alanında bu userId'yi içeren bildirimleri bul
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

      // Çıktıda sadece kullanıcının kendi bilgisini göster
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
  },
);

// PATCH /api/biNot/notifications/read/:id
// Bildirimi okundu işaretle (positional operator $ kullanan)
router.patch(
  "/notifications/read/:id",
  auth,
  Logger("PATCH /biNot/notifications/read/:id"),
  async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).send({
        success: false,
        message: Messages.TOKEN_NOT_FOUND,
      });
    }

    try {
      const notificationId = req.params.id;

      // Validation: bildirim mevcut mu
      const notif = await BiNotNotification.findById(notificationId);
      if (!notif) {
        return res.status(404).send({
          success: false,
          message: "Bildirim bulunamadı",
        });
      }

      // Validation: user bu bildirimin recipients'i mi
      const userInRecipients = notif.recipients.some(
        (r) => r.user.toString() === userId.toString(),
      );
      if (!userInRecipients) {
        return res.status(403).send({
          success: false,
          message: Messages.USER_NOT_AUTHORIZED,
        });
      }

      // Positional operator $ kullanarak sadece bu user'ın recipient record'unu güncelle
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
  },
);

module.exports = router;
