const mongoose = require("mongoose");

const SegbisPersonSchema = mongoose.Schema(
  {
    ad: {
      type: String,
    },
    soyad: {
      type: String,
    },
    title: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Title",
      required: [true, "Ünvan gereklidir"],
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => Messages.VALID_PHONE(props.value),
      },
    },
    mahkeme_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SegbisUnit",
      required: [true, "Mahkeme ID gereklidir"],
    },
    is_default: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SegbisPerson", SegbisPersonSchema);
