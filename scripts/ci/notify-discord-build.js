#!/usr/bin/env node
// Posts a "new build ready" announcement to the project's Discord webhook, with an attached
// scannable QR code for the itms-services OTA install link — same look (Gyma, gold embed) as
// every manual build announcement posted throughout the project so far.
// Usage: DISCORD_WEBHOOK_URL=... node scripts/ci/notify-discord-build.js "<install link>" "<summary>"

const QRCode = require('qrcode');
const fs = require('fs');
const os = require('os');
const path = require('path');

const [, , installLink, summary] = process.argv;
const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

if (!installLink || !webhookUrl) {
  console.error('Usage: DISCORD_WEBHOOK_URL=... notify-discord-build.js "<install link>" "<summary>"');
  process.exit(1);
}

async function main() {
  const qrPath = path.join(os.tmpdir(), `ningyma-build-qr-${Date.now()}.png`);
  await QRCode.toFile(qrPath, installLink, { width: 512, margin: 2 });

  const payload = {
    username: 'Gyma',
    avatar_url: 'https://api-tanren.duapar.fr/icon.png',
    embeds: [
      {
        title: 'Nouveau build Ningyma disponible',
        description: `${summary ? `${summary}\n\n` : ''}[Lien d'installation](${installLink})\n\nScanne le QR code avec ton iPhone pour installer.`,
        color: 12879903,
        image: { url: 'attachment://build-qr.png' },
      },
    ],
  };

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('file', new Blob([fs.readFileSync(qrPath)]), 'build-qr.png');

  const res = await fetch(webhookUrl, { method: 'POST', body: form });
  fs.unlinkSync(qrPath);
  if (!res.ok) {
    console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log('Posted to Discord.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
