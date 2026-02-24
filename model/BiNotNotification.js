const mongoose = require("mongoose");
const { Schema } = mongoose;

const BiNotNotificationSchema = new Schema(
  {
    derkenarID: { type: Schema.Types.ObjectId, ref: "BiNotDerkenar", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Bildirimi alan
    
    // Bildirim içeriği (Örn: "2024/150 Esas sayılı dosyanın karar süresi doldu")
    message: { type: String, required: true },
    
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    
    // Hangi birimden tetiklendiğini bilmek filtreleme için iyidir
    birimID: { type: Schema.Types.ObjectId, ref: "Unit" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BiNotNotification", BiNotNotificationSchema);