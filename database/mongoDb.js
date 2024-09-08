const mongoose = require("mongoose");
require("dotenv/config");
const getTimeForLog = require("../common/time");

async function mongoDbConnect() {
  if (!process.env.MONGO_DB_CONNECTION) {
    throw new Error("MongoDB connection string is undefined or null");
  }
  mongoose.set("strictQuery", true);
  mongoose
    .connect(process.env.MONGO_DB_CONNECTION, {})
    .then(() => {
      console.log(getTimeForLog() + "Successfully connected to MongoDB Atlas!");
    })
    .catch((error) => {
      console.log(getTimeForLog() + "Unable to connect to MongoDB Atlas!");
      throw error;
    });
}

module.exports = mongoDbConnect;
