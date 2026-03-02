const mongoose = require("mongoose");
const { Schema } = mongoose;

const BiNotDerkenarSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String },
    fileNumber: { type: String, index: true }, // Esas No: 2024/100
    
    // İLİŞKİLER
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    birimID: { type: Schema.Types.ObjectId, ref: "Unit", required: true },

    // KAPSAM
    isPrivate: { type: Boolean, default: false }, // true: Sadece şahsi, false: Birim bazlı

    // ANIMSATICI (REMINDER)
    hasReminder: { type: Boolean, default: false },
    reminderDate: { type: Date }, 
    reminderTarget: { 
      type: String, 
      enum: ['SELF', 'UNIT'], 
      default: 'SELF' 
    },
    
    // DURUM
    isCompleted: { type: Boolean, default: false },
    priority: { 
      type: String, 
      enum: ['Düşük', 'Normal', 'Yüksek', 'Acil'], 
      default: 'Normal' 
    }
  },
  { timestamps: true }
);

BiNotDerkenarSchema.index({ birimID: 1, isPrivate: 1, createdAt: -1 });
BiNotDerkenarSchema.index({ creator: 1, isPrivate: 1, createdAt: -1 });
BiNotDerkenarSchema.index({ isCompleted: 1, priority: 1, reminderDate: 1 });

module.exports = mongoose.model("BiNotDerkenar", BiNotDerkenarSchema);