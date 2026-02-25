const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const Logger = require("../middleware/logger");

const {
  addNote,
  getNotesList,
  updateNote,
  deleteNote,
  getNotificationsList,
  markNotificationAsRead,
} = require("../controller/biNot.controller");

// POST /api/biNot/add - Not ekle
router.post(
  "/add",
  auth,
  Logger("POST /biNot/add"),
  addNote
);

// GET /api/biNot/list - Notları listele
router.get(
  "/list",
  auth,
  Logger("GET /biNot/list"),
  getNotesList
);

// PUT /api/biNot/:id - Not düzenle
router.put(
  "/:id",
  auth,
  Logger("PUT /biNot/:id"),
  updateNote
);

// DELETE /api/biNot/:id - Not sil
router.delete(
  "/:id",
  auth,
  Logger("DELETE /biNot/:id"),
  deleteNote
);

// GET /api/biNot/notifications/list - Bildirimleri listele
router.get(
  "/notifications/list",
  auth,
  Logger("GET /biNot/notifications/list"),
  getNotificationsList
);

// PATCH /api/biNot/notifications/read/:id - Bildirimi okundu işaretle
router.patch(
  "/notifications/read/:id",
  auth,
  Logger("PATCH /biNot/notifications/read/:id"),
  markNotificationAsRead
);

module.exports = router;
