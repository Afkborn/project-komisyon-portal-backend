const mongoose = require("mongoose");

const ActivitySchema = mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    typeID: {
      type: Number,
      required: true,
      default: 0,
    },
    description: {
      type: String,
    },
    personID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("Activity", ActivitySchema);
