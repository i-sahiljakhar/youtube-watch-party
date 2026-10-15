import { useEffect, useRef } from "react";
import YouTube from "react-youtube";

export default function VideoPlayer({ videoId, role, socket, connected }) {
  const playerRef = useRef(null);
  const isRemoteAction = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleVideoState = ({ action, currentTime }) => {
      const player = playerRef.current;
      if (!player) return;

      isRemoteAction.current = true;

      if (action === "play") {
        player.seekTo(currentTime || 0, true);
        player.playVideo();
      } else if (action === "pause") {
        player.seekTo(currentTime || 0, true);
        player.pauseVideo();
      } else if (action === "seek") {
        player.seekTo(currentTime || 0, true);
      }

      setTimeout(() => {
        isRemoteAction.current = false;
      }, 500);
    };

    socket.on("video-state-updated", handleVideoState);

    return () => {
      socket.off("video-state-updated", handleVideoState);
    };
  }, [socket, videoId]);

  const canControl = ["Host", "Moderator"].includes(role);

  const handleReady = (event) => {
    playerRef.current = event.target;
  };

  const emitVideoState = (action, currentTime) => {
    if (!canControl || !connected || !socket) return;
    if (isRemoteAction.current) return;

    socket.emit(`video-${action}`, { currentTime });
  };

  const handleStateChange = (event) => {
    if (!canControl || isRemoteAction.current) return;

    const player = event.target;
    const currentTime = player.getCurrentTime();

   
    if (event.data === 1) {
      emitVideoState("play", currentTime);
    } else if (event.data === 2) {
      emitVideoState("pause", currentTime);
    }
  };

  if (!videoId) {
    return <div className="video-placeholder">YouTube video URL add karo.</div>;
  }

  return (
    <div className="youtube-player">
      <YouTube
        key={videoId}
        videoId={videoId}
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: canControl ? 1 : 0,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
        }}
        iframeClassName="youtube-iframe"
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={(event) => console.error("YouTube Player Error:", event.data)}
      />
    </div>
  );
}
