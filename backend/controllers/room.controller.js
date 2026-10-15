import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
  try {
    const { hostId, videoId } = req.body;

    if (!hostId) {
      return res.status(400).json({
        success: false,
        message: "Host ID is required",
      });
    }

    const room = await Room.create({
      hostId,
      videoId: videoId || "",
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfuly",
      room,
    });
  } catch (error) {
    console.error("create room err", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase(),
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found or inactive",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room found successfuly",
      room,
    });
  } catch (error) {
    console.error("join room eror", error);

    return res.status(500).json({
      success: false,
      message: "Failed to join room",
    });
  }
};
