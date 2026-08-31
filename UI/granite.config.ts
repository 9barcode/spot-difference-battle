import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "spot-difference-syk",

  brand: {
    displayName: "틀린그림 찾기",
    primaryColor: "#7C3AED",
    icon: "https://static.toss.im/appsintoss/84811/96b9fabe-8bc7-46f4-8a01-e42246ef9633.png",
  },

  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite --host 0.0.0.0",
      build: "vite build",
    },
  },

  permissions: [],

  // granite.config.ts가 UI 폴더 안에 있으므로 dist면 충분합니다.
  outdir: "dist",

  webViewProps: {
    type: "game",
  },
});