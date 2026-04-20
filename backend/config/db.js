const mongoose = require("mongoose");

let cached = global._mongooseConnection;

const connectDB = async () => {
  if (cached && mongoose.connection.readyState === 1) {
    return cached;
  }
  try {
    const mongoURI = process.env.MONGODB_URI;
    cached = await mongoose.connect(mongoURI, { bufferCommands: false });
    global._mongooseConnection = cached;
    console.log("MongoDB connected successfully");
    return cached;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
