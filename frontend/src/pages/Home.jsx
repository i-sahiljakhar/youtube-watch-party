
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";

export default function Home() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getUserId = () => {
    let userId = localStorage.getItem("partyUserId");

    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("partyUserId", userId);
    }

    return userId;
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");

    if (!userName.trim()) {
      setError("Please enter your name.");
      return;
    }

    try {
      setLoading(true);

      const result = await request("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          hostId: getUserId(),
          videoId: "",
        }),
      });

      if (!result.success || !result.room?.roomCode) {
        throw new Error(result.message || "Failed to create room");
      }

      localStorage.setItem("partyUserName", userName.trim());

      navigate(`/room/${result.room.roomCode}`);
    } catch (error) {
      setError(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setError("");

    if (!userName.trim() || !roomCode.trim()) {
      setError("Please enter your name and room code.");
      return;
    }

    try {
      setLoading(true);

      const code = roomCode.trim().toUpperCase();

      const result = await request(
        `/api/rooms/${encodeURIComponent(code)}`
      );

      if (!result.success || !result.room) {
        throw new Error(result.message || "Room not found");
      }

      localStorage.setItem("partyUserId", getUserId());
      localStorage.setItem("partyUserName", userName.trim());


      navigate(`/room/${result.room.roomCode}`);
    } catch (error) {
      setError(error.message || "Unable to join room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="home-page">
      <section className="home-card">
        <h1>Watch Party 🎬</h1>

        <p className="subtitle">
          Watch YouTube videos together with your friends.
        </p>

        <form onSubmit={handleCreateRoom}>
          <label htmlFor="userName">Your name</label>

          <input
            id="userName"
            type="text"
            placeholder="Enter your name"
            value={userName}
            maxLength={50}
            onChange={(e) => setUserName(e.target.value)}
          />

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : "Create a Room"}
          </button>
        </form>

        <div className="separator">OR JOIN A ROOM</div>

        <form onSubmit={handleJoinRoom}>
          <label htmlFor="roomCode">Room code</label>

          <input
            id="roomCode"
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) =>
              setRoomCode(e.target.value.toUpperCase())
            }
          />

          <button
            className="secondary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : "Join Room"}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}
      </section>
    </main>
  );
}
