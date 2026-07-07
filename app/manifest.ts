import type { MetadataRoute } from "next"

// PWA manifest. `display: standalone` lets an LIE install NEURON to the Android
// home screen and run it chrome-free, without any app store. MoEST green/gold.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEURON — Oyo State MoEST",
    short_name: "NEURON",
    description:
      "Field inspection and school vulnerability capture for the Oyo State Ministry of Education, Science and Technology.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#062e1b",
    theme_color: "#0b6b3a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
