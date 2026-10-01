
export function getOptimizedVideoUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";

  // Cloudinary video URL transformation
  if (url.includes("cloudinary.com") && url.includes("/video/upload/")) {
    // Avoid double transformation if already present
    if (
      url.includes("/video/upload/f_auto") ||
      url.includes("/video/upload/q_auto")
    ) {
      return url;
    }
    return url.replace(
      "/video/upload/",
      "/video/upload/f_auto,q_auto,w_720,vc_auto/"
    );
  }

  return url;
}


export function getOptimizedVideoThumbnail(
  videoUrl: string | null | undefined,
  existingThumbnail?: string | null
): string | null {
  if (existingThumbnail && existingThumbnail.trim()) {
    // If thumbnail is also Cloudinary, optimize it
    if (
      existingThumbnail.includes("cloudinary.com") &&
      existingThumbnail.includes("/image/upload/")
    ) {
      if (!existingThumbnail.includes("/image/upload/f_auto")) {
        return existingThumbnail.replace(
          "/image/upload/",
          "/image/upload/f_auto,q_auto,w_480/"
        );
      }
    }
    return existingThumbnail.trim();
  }

  if (!videoUrl || typeof videoUrl !== "string") return null;

  // Cloudinary auto video-to-image poster frame
  if (
    videoUrl.includes("cloudinary.com") &&
    videoUrl.includes("/video/upload/")
  ) {
    let thumbUrl = videoUrl.replace(
      "/video/upload/",
      "/video/upload/so_0.5,w_480,q_auto,f_auto/"
    );
    // Replace video extension with .jpg
    thumbUrl = thumbUrl.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, ".jpg$2");
    return thumbUrl;
  }

  // YouTube thumbnail
  const ytMatch = videoUrl.match(
    /(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  return null;
}

