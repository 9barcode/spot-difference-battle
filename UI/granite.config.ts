import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "spot-difference-syk",

  brand: {
    primaryColor: "#7C3AED",
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
  outdir: "dist",

  webViewProps: {
    type: "game",
    bounces: false,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: false,
  },
});
