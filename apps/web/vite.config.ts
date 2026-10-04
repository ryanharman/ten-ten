import { buildThemeCss, darkTheme, lightTheme } from "@ten-ten/tokens";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** Working title; the single place the app's display name is set. */
const APP_NAME = "ten-ten";

const TOKENS_CSS_ID = "virtual:tokens.css";

/**
 * Design tokens at build time: serves theme CSS as a virtual module and
 * injects theme-color metas so browser chrome matches light/dark themes.
 */
function tokens(): Plugin {
  const resolvedId = `\0${TOKENS_CSS_ID}`;
  return {
    name: "ten-ten:tokens",
    resolveId: (id) => (id === TOKENS_CSS_ID ? resolvedId : undefined),
    load: (id) =>
      id === resolvedId
        ? buildThemeCss({ light: lightTheme, dark: darkTheme })
        : undefined,
    transformIndexHtml: () =>
      [lightTheme, darkTheme].map((theme) => ({
        tag: "meta",
        attrs: {
          name: "theme-color",
          content: theme.colour.bg,
          media: `(prefers-color-scheme: ${theme.colorScheme})`,
        },
        injectTo: "head" as const,
      })),
  };
}

export default defineConfig({
  plugins: [
    tokens(),
    react(),
    VitePWA({
      // "prompt": a new version waits until the app applies it (on restart),
      // so an update never reloads the page mid-game.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "icon.svg",
      ],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: "Drag blocks onto a 10×10 grid and clear lines.",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        background_color: lightTheme.colour.bg,
        theme_color: lightTheme.colour.bg,
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
      },
    }),
  ],
});
