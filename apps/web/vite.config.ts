import { buildThemeCss, darkTheme, lightTheme } from "@ten-ten/tokens";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const TOKENS_CSS_ID = "virtual:tokens.css";

/** Serves design tokens as CSS at build time — no runtime cost. */
function tokensCss(): Plugin {
  const resolvedId = `\0${TOKENS_CSS_ID}`;
  return {
    name: "ten-ten:tokens-css",
    resolveId: (id) => (id === TOKENS_CSS_ID ? resolvedId : undefined),
    load: (id) =>
      id === resolvedId
        ? buildThemeCss({ light: lightTheme, dark: darkTheme })
        : undefined,
  };
}

export default defineConfig({
  plugins: [tokensCss(), react()],
});
