const mongoose = require("mongoose");

const AysChatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["DIRECT", "GROUP"],
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

AysChatRoomSchema.index({ participants: 1 });
AysChatRoomSchema.index({ type: 1, participants: 1 });

module.exports = mongoose.model("AysChatRoom", AysChatRoomSchema);
