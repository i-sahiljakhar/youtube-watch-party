import mongoose from "mongoose";
import { randomBytes } from "crypto";

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      unique: true,
      required: true,
      default: () => randomBytes(4).toString("hex").toUpperCase(),
    },
    hostId: {
      type: String,
      required: true,
    },
    videoId: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
