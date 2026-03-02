const mongoose = require("mongoose");

const AysChatMessageSchema = new mongoose.Schema(
  {
    roomID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AysChatRoom",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isDeletedForAll: {
      type: Boolean,
      default: false,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

AysChatMessageSchema.index({ roomID: 1, createdAt: -1 });

module.exports = mongoose.model("AysChatMessage", AysChatMessageSchema);
