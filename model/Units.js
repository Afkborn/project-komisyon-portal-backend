const mongoose = require("mongoose");
const Messages = require("../constants/Messages");

const UnitSchema = mongoose.Schema({
  institutionID: {
    type: String,
    required: [true, Messages.INSTITUTIONID_REQUIRED],
  },
  institutionName: {
    type: String,
    required: [true, Messages.INSTITUTIONNAME_REQUIRED],
  },
  // type 0 mahkeme, type 1 savcılık, type 2 diğer
  type: {
    type: Number,
    required: [true, Messages.UNIT_TYPE_REQUIRED],
  },
  
  //  örneğin birimin tipi ağır ceza mahkemesi, 7 tane ağır ceza mahkemesi olduğu için onu seçelim
  series : {
    type: Number,
    default: 0,
  },
  name: {
    type: String,
    required: [true, Messages.UNIT_NAME_REQUIRED],
    unique: [true, Messages.UNIT_NAME_EXIST],
  },

  createdDate: {
    type: Date,
    default: Date.now,
  },
  mahkemeDurum: {
    type: Boolean,
    default: true,
  },
});
