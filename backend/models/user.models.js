const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
    },
    Phone: {
      type: String,
    },
    organization: {
      type: String,
    },
    Location: {
      type: String,
    },
    ProfileImage: {
      type: String,
    },
    district: {
      type: String,
    },
    State: {
      type: String,
    },
    Location: {
      type: String,
    },
    Availability: {
      type: Boolean,
      default: true,
    },
    DeviceID: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
