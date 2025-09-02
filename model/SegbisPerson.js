const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const SegbisPersonSchema = mongoose.Schema(
  {
    name: {
      type: String,
      default: "İsimsiz",
    },
    title: {
      type: String,
      default: "Görevli",
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
