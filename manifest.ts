import packageJson from "./package.json";

const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  background: {
    service_worker: "src/pages/background/index.js",
    type: "module",
  },
  action: {
    default_popup: "src/pages/popup/index.html",
    default_icon: "icon-32.png",
  },
  icons: {
    "128": "icon-128.png",
  },
  content_scripts: [
    {
      matches: ["https://weread.qq.com/*"],
      js: ["src/pages/content/index.js"],
    },
  ],
  permissions: ["storage", "webRequest"],
  host_permissions: [
    "https://i.weread.qq.com/*",
    "https://weread.qq.com/*",
    "https://www.yuque.com/api/v2/*",
  ],
  web_accessible_resources: [
    {
      resources: [
        "assets/js/*.js",
        "assets/css/*.css",
        "icon-128.png",
        "icon-32.png",
      ],
      matches: ["*://*/*"],
    },
  ],
  sandbox: {
    pages: ["src/pages/sandbox/index.html"],
  },
};

export default manifest;
