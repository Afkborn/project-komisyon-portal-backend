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
    personID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
    },
    titleID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Title",
    },
    unitID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    personUnitID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonUnit",
    },
    leaveID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave",
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("Activity", ActivitySchema);
