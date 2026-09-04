import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "spot-difference-syk",
  brand: {
    primaryColor: "#6B4EBF",
  },
  permissions: [],
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
    withTitle: false,
    transparentBackground: true,
    theme: "dark",
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "never",
    allowsBackForwardNavigationGestures: false,
    mediaPlaybackRequiresUserAction: true,
  },
  webBundleDir: "dist",
});
