import { useEffect, useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

export default function ChatBox({ socket, connected, roomCode }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!socket || !connected) return;

    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, connected, roomCode]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    if (!socket || !connected) {
      setError("Chat se connection nahi hai.");
      return;
    }

    socket.emit("send-message", { message: trimmedMessage }, (response) => {
      if (!response?.success) {
        setError(response?.message || "Message send nahi hua.");
        return;
      }

      setMessage("");
      setError("");
    });
  };

  return (
    <section className="chat-section">
      <div className="chat-header">
        <div>
          <h2>Room Chat</h2>
          <p>Chat with everyone in your room</p>
        </div>
        <span className="chat-status">
          <span className="status-dot"></span>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-icon"></span>
            <h3>No messages yet</h3>
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((item, index) => (
            <div
              className="chat-message"
              key={item._id || `${item.senderId}-${index}`}
            >
              <div className="chat-message-header">
                <strong>{item.senderName}</strong>

                <span className="chat-time">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>

              <p className="chat-message-text">{item.message}</p>
            </div>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSendMessage}>
        <div className="chat-input-area">
          <button
            type="button"
            className="emoji-toggle"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={!connected}
            title="Choose emoji"
          >
            Emoji
          </button>

          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            maxLength={1000}
            disabled={!connected}
          />
        </div>

        <button type="submit" disabled={!connected || !message.trim()}>
          Send
        </button>

        {showEmojiPicker && (
          <div className="emoji-picker-popup">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              width="100%"
              height={350}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </form>

      {error && <p className="error-message">{error}</p>}
    </section>
  );
}
