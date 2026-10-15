
export function extractYouTubeId(url) {
  try {
    const parsedUrl = new URL(url.trim());

    if (
      parsedUrl.hostname === "youtu.be" ||
      parsedUrl.hostname.endsWith(".youtu.be")
    ) {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    const isYouTube =
      parsedUrl.hostname === "youtube.com" ||
      parsedUrl.hostname.endsWith(".youtube.com") ||
      parsedUrl.hostname === "youtube-nocookie.com" ||
      parsedUrl.hostname.endsWith(".youtube-nocookie.com");

    if (!isYouTube) return null;

    if (parsedUrl.pathname === "/watch") {
      return parsedUrl.searchParams.get("v");
    }

    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (["embed", "shorts", "live"].includes(parts[0])) {
      return parts[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}
