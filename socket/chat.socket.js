const jwt = require("jsonwebtoken");
const { isValidToken } = require("../config/redis");
const AysChatRoom = require("../model/AysChatRoom");
const AysChatMessage = require("../model/AysChatMessage");

function getTokenFromSocketHandshake(socket) {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  if (authToken) {
    return authToken.startsWith("Bearer ") ? authToken.substring(7) : authToken;
  }

  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

function setupChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocketHandshake(socket);
      if (!token || token.trim() === "") {
        return next(new Error("Socket kimlik doğrulama başarısız: token yok"));
      }

      const tokenValid = await isValidToken(token);
      if (!tokenValid) {
        return next(new Error("Socket kimlik doğrulama başarısız: geçersiz token"));
      }

      const decodedToken = jwt.verify(token, "RANDOM-TOKEN");
      socket.user = decodedToken;
      return next();
    } catch (error) {
      return next(new Error("Socket kimlik doğrulama başarısız"));
    }
  });

  io.on("connection", async (socket) => {
    const userID = socket.user.id.toString();

    try {
      const rooms = await AysChatRoom.find({ participants: userID }).select("_id");

      rooms.forEach((room) => {
        socket.join(room._id.toString());
      });

      socket.join(userID);

      socket.emit("chat_ready", {
        success: true,
        joinedRooms: rooms.map((room) => room._id.toString()),
        userRoom: userID,
      });
    } catch (error) {
      socket.emit("chat_error", {
        success: false,
        message: "Odalara otomatik katılım sırasında hata oluştu",
      });
    }

    socket.on("join_room", async (roomID) => {
      try {
        const room = await AysChatRoom.findOne({
          _id: roomID,
          participants: userID,
        }).select("_id");

        if (!room) {
          return socket.emit("chat_error", {
            success: false,
            message: "Bu odaya katılım yetkiniz yok",
          });
        }

        socket.join(roomID.toString());
        socket.emit("joined_room", { success: true, roomID: roomID.toString() });
      } catch (error) {
        socket.emit("chat_error", {
          success: false,
          message: "Odaya katılım sırasında hata oluştu",
        });
      }
    });

    socket.on("send_message", async (payload) => {
      try {
        const roomID = payload && payload.roomID;
        const content = payload && payload.content;

        if (!roomID || !content || !content.trim()) {
          return socket.emit("chat_error", {
            success: false,
            message: "roomID ve content gereklidir",
          });
        }

        const room = await AysChatRoom.findOne({
          _id: roomID,
          participants: userID,
        }).select("_id participants");

        if (!room) {
          return socket.emit("chat_error", {
            success: false,
            message: "Bu odaya mesaj gönderme yetkiniz yok",
          });
        }

        let message = await AysChatMessage.create({
          roomID,
          sender: userID,
          content: content.trim(),
          readBy: [{ user: userID, readAt: new Date() }],
        });

        await AysChatRoom.updateOne({ _id: roomID }, { $set: { updatedAt: new Date() } });

        message = await AysChatMessage.findById(message._id)
          .populate("sender", "username name surname")
          .populate("readBy.user", "username name surname");

        io.to(roomID.toString()).emit("receive_message", {
          success: true,
          message,
        });
      } catch (error) {
        socket.emit("chat_error", {
          success: false,
          message: "Mesaj gönderimi sırasında hata oluştu",
        });
      }
    });

    socket.on("mark_as_read", async (payload) => {
      try {
        const roomId = payload && payload.roomId;

        if (!roomId) {
          return socket.emit("chat_error", {
            success: false,
            message: "roomId gereklidir",
          });
        }

        const room = await AysChatRoom.findOne({
          _id: roomId,
          participants: userID,
        }).select("_id");

        if (!room) {
          return socket.emit("chat_error", {
            success: false,
            message: "Bu oda üzerinde okundu işlemi yapma yetkiniz yok",
          });
        }

        const now = new Date();
        await AysChatMessage.updateMany(
          {
            roomID: roomId,
            sender: { $ne: userID },
            readBy: {
              $not: {
                $elemMatch: {
                  user: userID,
                },
              },
            },
          },
          {
            $push: {
              readBy: {
                user: userID,
                readAt: now,
              },
            },
          },
        );

        io.to(roomId.toString()).emit("messages_read", {
          roomId: roomId.toString(),
          readByUserId: (socket.user._id || socket.user.id).toString(),
        });
      } catch (error) {
        socket.emit("chat_error", {
          success: false,
          message: "Okundu bilgisi güncellenirken hata oluştu",
        });
      }
    });
  });
}

module.exports = {
  setupChatSocket,
};
