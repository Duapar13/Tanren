/** Expo's push API accepts any Expo push token and handles routing to APNs/FCM itself. */
export async function sendExpoPush(pushToken, title, body, data = {}) {
  if (!pushToken) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, data, sound: 'default' }),
  });
}
