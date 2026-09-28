import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SFC Bakers",
    short_name: "SFC Bakers",
    description: "Good Food, Great Vibes — Freshly prepared food delivered fast.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#4f7d16",
    categories: ["food", "shopping", "lifestyle"],
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
