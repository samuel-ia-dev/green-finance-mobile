/* eslint-env node */
const fs = require("fs");
const path = require("path");

const assetDir = path.join(__dirname, "..", "assets");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0o4AAAAASUVORK5CYII=";

fs.mkdirSync(assetDir, { recursive: true });
["icon.png", "adaptive-icon.png", "splash.png", "favicon.png"].forEach((file) => {
  fs.writeFileSync(path.join(assetDir, file), Buffer.from(png, "base64"));
});

console.log("assets created");
