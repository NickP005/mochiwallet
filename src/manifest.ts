const manifest = {
  manifest_version: 3,
  name: "Mochimo Wallet",
  version: "1.0.0",
  description: "A cryptocurrency wallet for Mochimo blockchain",
  action: {
    default_popup: "index.html",
  },
  permissions: [
    "storage",
    "tabs"
  ],
  background: {
    service_worker: "src/background/index.ts",
  },
  icons: {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
};

export default manifest; 