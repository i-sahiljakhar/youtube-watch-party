

import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { roomCode, senderId, senderName, message } = req.body;

    if (
      !roomCode?.trim() ||
      !senderId?.trim() ||
      !senderName?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "roomCode, senderId, senderName and message are required",
      });
    }

    const newMessage = await Message.create({
      roomCode: roomCode.trim().toUpperCase(),
      senderId: senderId.trim(),
      senderName: senderName.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Message saved successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRoomMessages = async (req, res) => {
  try {
    const roomCode = req.params.roomCode?.trim().toUpperCase();

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        message: "Room code is required",
      });
    }

    const messages = await Message.find({ roomCode }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("Get room messages error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

