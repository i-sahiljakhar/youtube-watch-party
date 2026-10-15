
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import VideoPlayer from "../components/VideoPlayer";
import { extractYouTubeId } from "../utils/youtube";
import ChatBox from "../components/ChatBox";


export default function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const [role, setRole] = useState("");
  const [userName, setUserName] = useState(
    localStorage.getItem("partyUserName") || ""
  );
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [removingUserId, setRemovingUserId] = useState("");

  useEffect(() => {
    if (!socket) return;

    const userId = localStorage.getItem("partyUserId");
    const savedUserName = localStorage.getItem("partyUserName");

    if (!userId || !savedUserName) {
      navigate("/");
      return;
    }

    setUserName(savedUserName);

    const joinRoom = () => {
      setConnected(false);
      setError("");

      socket.emit(
        "join-room",
        {
          roomCode,
          userId,
          userName: savedUserName,
        },
        (response) => {
          if (!response?.success) {
            setError(
              response?.message || "Unable to join room."
            );
            setConnected(false);
            return;
          }

          setRole(response.role);
          setVideoId(response.videoId || "");
          setConnected(true);
          setError("");
        }
      );
    };

    const handleConnect = () => {
      joinRoom();
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleParticipantsUpdated = (list) => {
      setParticipants(Array.isArray(list) ? list : []);
    };

    const handleRoleUpdated = (data) => {
      if (data?.userId === userId) {
        setRole(data.role);
      }
    };

    const handleVideoChanged = (data) => {
      if (data?.videoId) {
        setVideoId(data.videoId);
        setVideoError("");
      }
    };

    const handleRemovedFromRoom = (data) => {
      setConnected(false);
      setParticipants([]);
      setRole("");
      setError(
        data?.message || "You have been removed from this room."
      );

      navigate("/");
    };

    socket.on("participants-updated", handleParticipantsUpdated);
    socket.on("role-updated", handleRoleUpdated);
    socket.on("video-changed", handleVideoChanged);
    socket.on("removed-from-room", handleRemovedFromRoom);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("participants-updated", handleParticipantsUpdated);
      socket.off("role-updated", handleRoleUpdated);
      socket.off("video-changed", handleVideoChanged);
      socket.off("removed-from-room", handleRemovedFromRoom);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, roomCode, navigate]);

  const handleChangeVideo = (e) => {
    e.preventDefault();
    setVideoError("");

    const extractedId = extractYouTubeId(videoUrl);

    if (!extractedId) {
      setVideoError("Please enter a valid YouTube URL.");
      return;
    }

    if (!["Host", "Moderator"].includes(role)) {
      setVideoError(
        "Only Host or Moderator can change the video."
      );
      return;
    }

    if (!socket || !connected) {
      setVideoError("Not connected to the room.");
      return;
    }

    socket.emit(
      "change-video",
      { videoId: extractedId },
      (response) => {
        if (!response?.success) {
          setVideoError(
            response?.message || "Failed to change video."
          );
          return;
        }

        setVideoId(response.videoId || extractedId);
        setVideoUrl("");
        setVideoError("");
      }
    );
  };

  const handleRoleChange = (targetUserId, newRole) => {
    if (!socket || !connected || role !== "Host") {
      return;
    }

    socket.emit(
      "change-role",
      {
        userId: targetUserId,
        role: newRole,
      },
      (response) => {
        if (!response?.success) {
          setError(
            response?.message || "Failed to change role."
          );
          return;
        }

        setError("");
      }
    );
  };

  const handleRemoveParticipant = (targetUserId) => {
    if (!socket || !connected || role !== "Host") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this participant?"
    );

    if (!confirmed) return;

    setRemovingUserId(targetUserId);
    setError("");

    socket.emit(
      "remove-participant",
      { userId: targetUserId },
      (response) => {
        setRemovingUserId("");

        if (!response?.success) {
          setError(
            response?.message || "Failed to remove participant."
          );
          return;
        }

        setError("");
      }
    );
  };

  const handleLeaveRoom = () => {
    navigate("/");
  };

  return (
    <main className="room-page">
      <header className="room-header">
        <div className="room-heading">
          <h1>Watch Party 🎬</h1>

          <p>
            Room Code: <strong>{roomCode}</strong>
          </p>
        </div>

        <button
          type="button"
          className="room-leave-button"
          onClick={handleLeaveRoom}
        >
          Leave Room
        </button>
      </header>

      {error && (
        <p className="room-error" role="alert">
          {error}
        </p>
      )}

      <section className="room-info">
        <p>
          Connection:{" "}
          <span
            className={
              connected ? "status-online" : "status-offline"
            }
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </p>

        <p>
          Your role:{" "}
          <strong>
            {role || "Waiting..."}
            {userName && ` (${userName})`}
          </strong>
        </p>
      </section>

      <div className="room-layout">
        <div className="room-main-content">
          <section className="video-section">
            <div className="section-heading">
              <h2>Shared Video</h2>

              <span className="live-indicator">
                <span className="live-dot" />
                Watch Party
              </span>
            </div>

            <form
              onSubmit={handleChangeVideo}
              className="video-form"
            >
              <input
                type="url"
                placeholder="Paste YouTube video URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={
                  !connected ||
                  !["Host", "Moderator"].includes(role)
                }
              />

              <button
                type="submit"
                className="room-primary-button"
                disabled={
                  !connected ||
                  !["Host", "Moderator"].includes(role)
                }
              >
                Change Video
              </button>
            </form>

            {videoError && (
              <p className="room-error" role="alert">
                {videoError}
              </p>
            )}

            {!["Host", "Moderator"].includes(role) && (
              <p className="room-hint">
                Only Host or Moderator can change the video.
              </p>
            )}

            {videoId && (
              <p className="video-id-label">
                Video ID: <strong>{videoId}</strong>
              </p>
            )}

            <VideoPlayer
              videoId={videoId}
              role={role}
              socket={socket}
              connected={connected}
            />
          </section>

          <section className="participants-section">
            <div className="section-heading">
              <h2>Participants</h2>

              <span className="participant-count">
                {participants.length}
              </span>
            </div>

            {participants.length === 0 ? (
              <p className="room-hint">
                {connected
                  ? "Waiting for participant list..."
                  : "Connect to see participants."}
              </p>
            ) : (
              <ul className="participants-list">
                {participants.map((participant) => (
                  <li
                    className="participant-item"
                    key={participant.userId}
                  >
                    <div className="participant-avatar">
                      {(participant.userName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="participant-details">
                      <span className="participant-name">
                        {participant.userName}
                      </span>

                      <span
                        className={`participant-role role-${(
                          participant.role || "participant"
                        ).toLowerCase()}`}
                      >
                        {participant.role}
                      </span>
                    </div>

                    {role === "Host" &&
                      participant.role !== "Host" && (
                        <div className="participant-actions">
                          <select
                            aria-label={`Role for ${participant.userName}`}
                            value={participant.role}
                            disabled={
                              !connected ||
                              removingUserId === participant.userId
                            }
                            onChange={(e) =>
                              handleRoleChange(
                                participant.userId,
                                e.target.value
                              )
                            }
                          >
                            <option value="Participant">
                              Participant
                            </option>

                            <option value="Moderator">
                              Moderator
                            </option>
                          </select>

                          <button
                            type="button"
                            className="room-remove-button"
                            disabled={
                              !connected ||
                              removingUserId === participant.userId
                            }
                            onClick={() =>
                              handleRemoveParticipant(
                                participant.userId
                              )
                            }
                          >
                            {removingUserId === participant.userId
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        </div>
                      )}
                  </li>
                ))}
              </ul>
            )}

            {role === "Host" && (
              <p className="room-hint">
                As Host, you can change roles or remove participants.
              </p>
            )}
          </section>
        </div>

        <aside className="room-chat-section">
          <ChatBox
            socket={socket}
            connected={connected}
            roomCode={roomCode}
          />
        </aside>
      </div>
    </main>
  );
}
