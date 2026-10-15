import Room from "../models/Room.js";
import Message from "../models/Message.js";

const initializeSocket = (io) => {
  const getParticipants = (roomCode) => {
    const participants = [];

    for (const connectedSocket of io.sockets.sockets.values()) {
      const user = connectedSocket.data.user;

      if (user && user.roomCode === roomCode) {
        participants.push({
          userId: user.userId,
          userName: user.userName,
          role: user.userId === user.hostId ? "Host" : user.role,
        });
      }
    }

    const uniqueParticipants = [
      ...new Map(
        participants.map((participant) => [participant.userId, participant]),
      ).values(),
    ];

    return uniqueParticipants;
  };

  const emitParticipants = (roomCode) => {
    io.to(roomCode).emit("participants-updated", getParticipants(roomCode));
  };

  const isHost = (user) => {
    return user && user.userId === user.hostId;
  };

  const canControlVideo = (user) => {
    return user && ["Host", "Moderator"].includes(user.role);
  };

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", async (data, callback) => {
      try {
        const { roomCode, userId, userName } = data || {};

        if (
          typeof roomCode !== "string" ||
          typeof userId !== "string" ||
          typeof userName !== "string" ||
          !roomCode.trim() ||
          !userId.trim() ||
          !userName.trim()
        ) {
          return callback?.({
            success: false,
            message: "Room code, user ID and name are required",
          });
        }

        const code = roomCode.trim().toUpperCase();
        const normalizedUserId = userId.trim();

        const room = await Room.findOne({
          roomCode: code,
          isActive: true,
        });

        if (!room) {
          return callback?.({
            success: false,
            message: "Room not found or inactive",
          });
        }

        const previousRoom = socket.data.user?.roomCode;

        if (previousRoom) {
          socket.leave(previousRoom);

          if (previousRoom !== code) {
            emitParticipants(previousRoom);
          }
        }

        let assignedRole =
          normalizedUserId === room.hostId ? "Host" : "Participant";

        if (assignedRole !== "Host") {
          for (const connectedSocket of io.sockets.sockets.values()) {
            const existingUser = connectedSocket.data.user;

            if (
              existingUser?.roomCode === code &&
              existingUser?.userId === normalizedUserId &&
              ["Moderator", "Participant"].includes(existingUser.role)
            ) {
              assignedRole = existingUser.role;
              break;
            }
          }
        }

        socket.data.user = {
          roomCode: code,
          userId: normalizedUserId,
          userName: userName.trim(),
          hostId: room.hostId,
          role: assignedRole,
        };

        socket.join(code);

        callback?.({
          success: true,
          message: "Joined room successfully",
          roomCode: code,
          role: socket.data.user.role,
          videoId: room.videoId,
        });

        emitParticipants(code);
      } catch (error) {
        console.error("Join room error:", error);

        callback?.({
          success: false,
          message: "Failed to join room",
        });
      }
    });

    socket.on("send-message", async (data, callback) => {
      try {
        const user = socket.data.user;
        const { message } = data || {};

        if (!user) {
          return callback?.({
            success: false,
            message: "Join a room first",
          });
        }

        if (
          typeof message !== "string" ||
          !message.trim() ||
          message.trim().length > 1000
        ) {
          return callback?.({
            success: false,
            message: "Message must contain 1–1000 characters",
          });
        }

        const savedMessage = await Message.create({
          roomCode: user.roomCode,
          senderId: user.userId,
          senderName: user.userName,
          message: message.trim(),
        });

        io.to(user.roomCode).emit("receive-message", {
          _id: savedMessage._id,
          roomCode: savedMessage.roomCode,
          senderId: savedMessage.senderId,
          senderName: savedMessage.senderName,
          message: savedMessage.message,
          createdAt: savedMessage.createdAt,
        });

        callback?.({
          success: true,
          message: "Message sent successfully",
        });
      } catch (error) {
        console.error("Send message error:", error);

        callback?.({
          success: false,
          message: "Failed to send message",
        });
      }
    });

    socket.on("video-play", (data, callback) => {
      const user = socket.data.user;

      if (!user) {
        return callback?.({
          success: false,
          message: "Join a room first",
        });
      }

      if (!canControlVideo(user)) {
        return callback?.({
          success: false,
          message: "Only Host or Moderator can control playback",
        });
      }

      const currentTime = Number(data?.currentTime ?? 0);

      if (!Number.isFinite(currentTime) || currentTime < 0) {
        return callback?.({
          success: false,
          message: "Invalid video timestamp",
        });
      }

      socket.to(user.roomCode).emit("video-state-updated", {
        action: "play",
        currentTime,
        updatedBy: user.userId,
      });

      callback?.({
        success: true,
        message: "Play event sent",
      });
    });

    socket.on("video-pause", (data, callback) => {
      const user = socket.data.user;

      if (!user) {
        return callback?.({
          success: false,
          message: "Join a room first",
        });
      }

      if (!canControlVideo(user)) {
        return callback?.({
          success: false,
          message: "Only Host or Moderator can control playback",
        });
      }

      const currentTime = Number(data?.currentTime ?? 0);

      if (!Number.isFinite(currentTime) || currentTime < 0) {
        return callback?.({
          success: false,
          message: "Invalid video timestamp",
        });
      }

      socket.to(user.roomCode).emit("video-state-updated", {
        action: "pause",
        currentTime,
        updatedBy: user.userId,
      });

      callback?.({
        success: true,
        message: "Pause event sent",
      });
    });

    socket.on("video-seek", (data, callback) => {
      const user = socket.data.user;

      if (!user) {
        return callback?.({
          success: false,
          message: "Join a room first",
        });
      }

      if (!canControlVideo(user)) {
        return callback?.({
          success: false,
          message: "Only Host or Moderator can control playback",
        });
      }

      const currentTime = Number(data?.currentTime);

      if (!Number.isFinite(currentTime) || currentTime < 0) {
        return callback?.({
          success: false,
          message: "Invalid video timestamp",
        });
      }

      socket.to(user.roomCode).emit("video-state-updated", {
        action: "seek",
        currentTime,
        updatedBy: user.userId,
      });

      callback?.({
        success: true,
        message: "Seek event sent",
      });
    });

    socket.on("remove-participant", async (data, callback) => {
      try {
        const user = socket.data.user;

        if (!user) {
          return callback?.({
            success: false,
            message: "Join a room first",
          });
        }

        if (!isHost(user)) {
          return callback?.({
            success: false,
            message: "Only the Host can remove participants",
          });
        }

        const { userId } = data || {};

        if (
          typeof userId !== "string" ||
          !userId.trim() ||
          userId.trim() === user.userId
        ) {
          return callback?.({
            success: false,
            message: "Invalid participant",
          });
        }

        const targetUserId = userId.trim();

        const targetSockets = [...io.sockets.sockets.values()].filter(
          (targetSocket) =>
            targetSocket.data.user?.roomCode === user.roomCode &&
            targetSocket.data.user?.userId === targetUserId,
        );

        if (targetSockets.length === 0) {
          return callback?.({
            success: false,
            message: "Participant not found in this room",
          });
        }

        for (const targetSocket of targetSockets) {
          targetSocket.emit("removed-from-room", {
            message: "The Host removed you from this room",
          });

          targetSocket.data.user = null;
          await targetSocket.leave(user.roomCode);
        }

        emitParticipants(user.roomCode);

        callback?.({
          success: true,
          message: "Participant removed successfully",
          userId: targetUserId,
        });
      } catch (error) {
        console.error("Remove participant error:", error);

        callback?.({
          success: false,
          message: "Failed to remove participant",
        });
      }
    });

    socket.on("change-video", async (data, callback) => {
      try {
        const user = socket.data.user;

        if (!user) {
          return callback?.({
            success: false,
            message: "Join a room first",
          });
        }

        if (!canControlVideo(user)) {
          return callback?.({
            success: false,
            message: "Only Host or Moderator can change the video",
          });
        }

        const videoId = data?.videoId;

        if (
          typeof videoId !== "string" ||
          !/^[a-zA-Z0-9_-]{11}$/.test(videoId.trim())
        ) {
          return callback?.({
            success: false,
            message: "A valid 11-character YouTube video ID is required",
          });
        }

        const room = await Room.findOneAndUpdate(
          {
            roomCode: user.roomCode,
            isActive: true,
          },
          {
            $set: { videoId: videoId.trim() },
          },
          { new: true },
        );

        if (!room) {
          return callback?.({
            success: false,
            message: "Room not found or inactive",
          });
        }

        io.to(user.roomCode).emit("video-changed", {
          videoId: room.videoId,
          updatedBy: user.userId,
        });

        callback?.({
          success: true,
          message: "Video changed successfully",
          videoId: room.videoId,
        });
      } catch (error) {
        console.error("Change video error:", error);

        callback?.({
          success: false,
          message: "Failed to change video",
        });
      }
    });

    socket.on("change-role", (data, callback) => {
      try {
        const user = socket.data.user;

        if (!user) {
          return callback?.({
            success: false,
            message: "Join a room first",
          });
        }

        if (!isHost(user)) {
          return callback?.({
            success: false,
            message: "Only the Host can change roles",
          });
        }

        const { userId, role } = data || {};

        if (
          typeof userId !== "string" ||
          !userId.trim() ||
          !["Moderator", "Participant"].includes(role)
        ) {
          return callback?.({
            success: false,
            message: "Valid user ID and role are required",
          });
        }

        if (userId.trim() === user.hostId) {
          return callback?.({
            success: false,
            message: "Host role cannot be changed",
          });
        }

        const targetSockets = [...io.sockets.sockets.values()].filter(
          (targetSocket) =>
            targetSocket.data.user?.roomCode === user.roomCode &&
            targetSocket.data.user?.userId === userId.trim(),
        );

        if (targetSockets.length === 0) {
          return callback?.({
            success: false,
            message: "Participant not found in this room",
          });
        }

        for (const targetSocket of targetSockets) {
          targetSocket.data.user.role = role;
        }

        emitParticipants(user.roomCode);

        io.to(user.roomCode).emit("role-updated", {
          userId: userId.trim(),
          role,
          updatedBy: user.userId,
        });

        callback?.({
          success: true,
          message: `Participant role updated to ${role}`,
          userId: userId.trim(),
          role,
        });
      } catch (error) {
        console.error("Change role error:", error);

        callback?.({
          success: false,
          message: "Failed to change participant role",
        });
      }
    });

    socket.on("disconnect", () => {
      const user = socket.data.user;

      console.log("User disconnected:", socket.id);

      if (user?.roomCode) {
        emitParticipants(user.roomCode);
      }
    });
  });
};

export default initializeSocket;
