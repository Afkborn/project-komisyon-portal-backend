const mongoose = require("mongoose");
const { Schema } = mongoose;

const BiNotNotificationSchema = new Schema(
  {
    derkenarID: { type: Schema.Types.ObjectId, ref: "BiNotDerkenar", required: true },
    
    // Bildirim içeriği (Örn: "2024/150 Esas sayılı dosyanın karar süresi doldu")
    // message: { type: String, required: true },
    
    // Recipients dizisi: her alıcı kendi isRead & readAt bilgisine sahip
    recipients: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date },
      }
    ],
    
    // Hangi birimden tetiklendiğini bilmek filtreleme için iyidir
    birimID: { type: Schema.Types.ObjectId, ref: "Unit" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BiNotNotification", BiNotNotificationSchema);