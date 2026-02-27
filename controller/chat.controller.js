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
    const currentUserID = req.user.id;
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

    const room = await AysChatRoom.findById(roomID).select("participants");
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
        message: "Bu odanın mesajlarını görüntüleme yetkiniz yok",
      });
    }

    const totalRecords = await AysChatMessage.countDocuments({ roomID });
    const pageCount = Math.ceil(totalRecords / limit);

    const messages = await AysChatMessage.find({ roomID })
      .populate("sender", "username name surname")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      success: true,
      pageCount,
      length: messages.length,
      messages: messages.reverse(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Mesajlar alınırken hata oluştu",
      error: error.message,
    });
  }
}

module.exports = {
  createOrGetDirectRoom,
  createGroupRoom,
  getMyRooms,
  getMessagesByRoomID,
};
