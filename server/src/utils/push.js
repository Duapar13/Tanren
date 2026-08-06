/** Expo's push API accepts any Expo push token and handles routing to APNs/FCM itself. */
export async function sendExpoPush(pushToken, title, body, data = {}) {
  if (!pushToken) return;
  const shortToken = pushToken.slice(0, 24) + '…';
  console.log(`[push] sending "${title}" to ${shortToken}`);
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
  });
  const json = await res.json().catch(() => null);
  console.log(`[push] Expo response for ${shortToken}:`, JSON.stringify(json));
}
