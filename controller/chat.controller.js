const mongoose = require("mongoose");
const AysChatRoom = require("../model/AysChatRoom");
const AysChatMessage = require("../model/AysChatMessage");
const User = require("../model/User");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function createOrGetDirectRoom(req, res) {
  try {
    const currentUserID = req.user.id;
    const { userID } = req.body;

    if (!userID || !isValidObjectId(userID)) {
      console.log("Geçersiz userID:", userID);
      return res.status(400).json({
        success: false,
        message: "Geçerli bir userID gereklidir",
      });
    }

    if (currentUserID.toString() === userID.toString()) {
      return res.status(400).json({
        success: false,
        message: "Kendi kendinize DIRECT oda oluşturamazsınız",
      });
    }

    const targetUser = await User.findById(userID).select("_id");
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Hedef kullanıcı bulunamadı",
      });
    }

    let room = await AysChatRoom.findOne({
      type: "DIRECT",
      participants: { $all: [currentUserID, userID] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    })
      .populate("participants", "username name surname roles")
      .populate("createdBy", "username name surname");

    if (!room) {
      room = await AysChatRoom.create({
        type: "DIRECT",
        name: "",
        participants: [currentUserID, userID],
        createdBy: currentUserID,
      });

      room = await AysChatRoom.findById(room._id)
        .populate("participants", "username name surname roles")
        .populate("createdBy", "username name surname");
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "DIRECT oda işlemi sırasında hata oluştu",
      error: error.message,
    });
  }
}

async function createGroupRoom(req, res) {
  try {
    const currentUserID = req.user.id;
    const { name = "", participantIDs = [] } = req.body;

    if (!Array.isArray(participantIDs) || participantIDs.length < 2) {
      return res.status(400).json({
        success: false,
        message: "GROUP oda için en az 2 kullanıcı seçilmelidir",
      });
    }

    const uniqueParticipants = Array.from(
      new Set([
        ...participantIDs.map((id) => id.toString()),
        currentUserID.toString(),
      ]),
    );

    const invalidId = uniqueParticipants.find((id) => !isValidObjectId(id));
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: "Katılımcı listesinde geçersiz userID var",
      });
    }

    const users = await User.find({ _id: { $in: uniqueParticipants } }).select(
      "_id",
    );
    if (users.length !== uniqueParticipants.length) {
      return res.status(404).json({
        success: false,
        message: "Bazı kullanıcılar bulunamadı",
      });
    }

    const room = await AysChatRoom.create({
      type: "GROUP",
      name,
      participants: uniqueParticipants,
      createdBy: currentUserID,
    });

    const populatedRoom = await AysChatRoom.findById(room._id)
      .populate("participants", "username name surname roles")
      .populate("createdBy", "username name surname");

    return res.status(201).json({
      success: true,
      room: populatedRoom,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "GROUP oda oluşturulurken hata oluştu",
      error: error.message,
    });
  }
}

async function getMyRooms(req, res) {
  try {
    const currentUserID = req.user.id;

    const rooms = await AysChatRoom.find({
      participants: currentUserID,
    })
      .populate("participants", "username name surname roles")
      .populate("createdBy", "username name surname")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      length: rooms.length,
      rooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sohbet odaları alınırken hata oluştu",
      error: error.message,
    });
  }
}

async function getMessagesByRoomID(req, res) {
  try {
    const currentUserID = req.user._id || req.user.id;
    const { roomID } = req.params;
    let { page = 1, limit = 30 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 30;
    limit = Math.min(limit, 100);

    if (!isValidObjectId(roomID)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz roomID",
      });
    }

    const room = await AysChatRoom.findById(roomID)
      .select("participants")
      .populate("participants", "username name surname roles");
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Sohbet odası bulunamadı",
      });
    }

    // const isParticipant = room.participants.some(
    //   (participantID) => participantID.toString() === currentUserID.toString(),
    // );

    // if (!isParticipant) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Bu odanın mesajlarını görüntüleme yetkiniz yok",
    //   });
    // }

    const messageFilter = {
      roomID,
      deletedBy: { $ne: currentUserID },
    };

    const totalRecords = await AysChatMessage.countDocuments(messageFilter);
    const pageCount = Math.ceil(totalRecords / limit);

    const messages = await AysChatMessage.find(messageFilter)
      .populate("sender", "username name surname")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const sanitizedMessages = messages
      .reverse()
      .map((message) => {
        const messageObject = message.toObject();

        if (messageObject.isDeletedForAll) {
          messageObject.content = "Bu mesaj silindi";
        }

        return messageObject;
      });

    return res.status(200).json({
      success: true,
      pageCount,
      length: sanitizedMessages.length,
      participants: room.participants,
      messages: sanitizedMessages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Mesajlar alınırken hata oluştu",
      error: error.message,
    });
  }
}

async function deleteMessageForMe(req, res) {
  try {
    const currentUserID = req.user._id || req.user.id;
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz messageId",
      });
    }

    const message = await AysChatMessage.findById(messageId).select("_id roomID");
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mesaj bulunamadı",
      });
    }

    const room = await AysChatRoom.findOne({
      _id: message.roomID,
      participants: currentUserID,
    }).select("_id");

    if (!room) {
      return res.status(403).json({
        success: false,
        message: "Bu mesaj üzerinde işlem yapma yetkiniz yok",
      });
    }

    await AysChatMessage.updateOne(
      { _id: messageId },
      { $addToSet: { deletedBy: currentUserID } },
    );

    return res.status(200).json({
      success: true,
      message: "Mesaj sizin için silindi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Mesaj silinirken hata oluştu",
      error: error.message,
    });
  }
}

async function deleteMessageForEveryone(req, res) {
  try {
    const currentUserID = req.user._id || req.user.id;
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz messageId",
      });
    }

    const message = await AysChatMessage.findById(messageId).select("_id roomID sender");
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mesaj bulunamadı",
      });
    }

    const room = await AysChatRoom.findOne({
      _id: message.roomID,
      participants: currentUserID,
    }).select("_id");

    if (!room) {
      return res.status(403).json({
        success: false,
        message: "Bu mesaj üzerinde işlem yapma yetkiniz yok",
      });
    }

    if (message.sender.toString() !== currentUserID.toString()) {
      return res.status(403).json({
        success: false,
        message: "Sadece mesaj sahibi herkesten silebilir",
      });
    }

    await AysChatMessage.updateOne(
      { _id: messageId },
      { $set: { isDeletedForAll: true } },
    );

    const io = req.app.get("io");
    if (io) {
      io.to(message.roomID.toString()).emit("message_deleted", {
        messageId: message._id.toString(),
        isDeletedForAll: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mesaj herkesten silindi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Mesaj herkesten silinirken hata oluştu",
      error: error.message,
    });
  }
}

async function clearChatRoom(req, res) {
  try {
    const currentUserID = req.user._id || req.user.id;
    const { roomId } = req.params;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz roomId",
      });
    }

    const room = await AysChatRoom.findOne({
      _id: roomId,
      participants: currentUserID,
    }).select("_id");

    if (!room) {
      return res.status(403).json({
        success: false,
        message: "Bu oda üzerinde işlem yapma yetkiniz yok",
      });
    }

    const messagesToClear = await AysChatMessage.find({
      roomID: roomId,
      deletedBy: { $ne: currentUserID },
    }).select("_id");

    const messageIds = messagesToClear.map((message) => message._id);

    if (messageIds.length > 0) {
      await AysChatMessage.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { deletedBy: currentUserID } },
      );
    }

    return res.status(200).json({
      success: true,
      clearedCount: messageIds.length,
      message: "Sohbet sizin için temizlendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Sohbet temizlenirken hata oluştu",
      error: error.message,
    });
  }
}

async function leaveGroupRoom(req, res) {
  try {
    const currentUserID = req.user._id || req.user.id;
    const { roomId } = req.params;

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz roomId",
      });
    }

    const room = await AysChatRoom.findById(roomId).select("_id type participants");
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Sohbet odası bulunamadı",
      });
    }

    const isParticipant = room.participants.some(
      (participantID) => participantID.toString() === currentUserID.toString(),
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Bu oda üzerinde işlem yapma yetkiniz yok",
      });
    }

    if (room.type !== "GROUP") {
      return res.status(400).json({
        success: false,
        message: "Gruptan ayrılma sadece GROUP odalarda kullanılabilir",
      });
    }

    await AysChatRoom.findByIdAndUpdate(
      roomId,
      {
        $pull: { participants: currentUserID },
        $set: { updatedAt: new Date() },
      },
      { new: true },
    );

    const io = req.app.get("io");
    if (io) {
      io.to(roomId.toString()).emit("user_left_group", {
        roomId: roomId.toString(),
        userId: currentUserID.toString(),
        message: "Bir kullanıcı gruptan ayrıldı",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gruptan ayrılma işlemi başarılı",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gruptan ayrılırken hata oluştu",
      error: error.message,
    });
  }
}

module.exports = {
  createOrGetDirectRoom,
  createGroupRoom,
  getMyRooms,
  getMessagesByRoomID,
  deleteMessageForMe,
  deleteMessageForEveryone,
  clearChatRoom,
  leaveGroupRoom,
};
