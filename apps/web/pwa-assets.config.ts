import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

/** Generates favicon, apple-touch and PWA (incl. maskable) icons from public/icon.svg. */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: "#1C2028" },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: "#1C2028" },
    },
  },
  images: ["public/icon.svg"],
});
