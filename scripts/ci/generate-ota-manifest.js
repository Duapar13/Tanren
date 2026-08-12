#!/usr/bin/env node
// Generates the Apple OTA install manifest.plist Apple's itms-services install flow fetches to
// learn where the .ipa is and which app it installs. Reads bundle id/version/name from app.json
// so it can never drift from what the build itself was actually signed as.
// Usage: node scripts/ci/generate-ota-manifest.js <ipaPublicUrl> <outputPath>

const fs = require('fs');
const path = require('path');

const appJson = require('../../app.json');

const [, , ipaUrl, outPath] = process.argv;
if (!ipaUrl || !outPath) {
  console.error('Usage: generate-ota-manifest.js <ipaPublicUrl> <outputPath>');
  process.exit(1);
}

const bundleId = appJson.expo.ios.bundleIdentifier;
const version = appJson.expo.version;
const title = appJson.expo.name;

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${ipaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${bundleId}</string>
        <key>bundle-version</key>
        <string>${version}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${title}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, plist);
console.log(`Wrote ${outPath}`);
