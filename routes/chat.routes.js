const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRoles = require("../middleware/checkRoles");
const Logger = require("../middleware/logger");
const {
  createOrGetDirectRoom,
  createGroupRoom,
  getMyRooms,
  getMessagesByRoomID,
  deleteMessageForMe,
  deleteMessageForEveryone,
} = require("../controller/chat.controller");

// POST /api/chat/direct-room
// 1-1 oda oluşturur veya varsa mevcut odayı döner
router.post(
  "/direct-room",
  auth,
  Logger("POST /chat/direct-room"),
  createOrGetDirectRoom,
);

// POST /api/chat/group-room
// Group oda oluşturur (admin veya yetkili)
router.post(
  "/group-room",
  auth,
  checkRoles([10]),
  Logger("POST /chat/group-room"),
  createGroupRoom,
);

// GET /api/chat/my-rooms
// Kullanıcının dahil olduğu tüm sohbet odalarını döner
router.get("/my-rooms", auth, Logger("GET /chat/my-rooms"), getMyRooms);

// GET /api/chat/messages/:roomID
// Oda mesajlarını sayfalı şekilde döner
router.get(
  "/messages/:roomID",
  auth,
  checkRoles([10]),
  Logger("GET /chat/messages/:roomID"),
  getMessagesByRoomID,
);

// PATCH /api/chat/messages/:messageId/delete-for-me
// Mesajı sadece isteği yapan kullanıcı için gizler
router.patch(
  "/messages/:messageId/delete-for-me",
  auth,
  Logger("PATCH /chat/messages/:messageId/delete-for-me"),
  deleteMessageForMe,
);

// PATCH /api/chat/messages/:messageId/delete-for-everyone
// Mesaj sahibi için herkesten silme (soft delete)
router.patch(
  "/messages/:messageId/delete-for-everyone",
  auth,
  Logger("PATCH /chat/messages/:messageId/delete-for-everyone"),
  deleteMessageForEveryone,
);




module.exports = router;
