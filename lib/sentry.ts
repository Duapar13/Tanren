import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * No-op until EXPO_PUBLIC_SENTRY_DSN is set (needs a free sentry.io project) — same
 * "safe until configured" shape as configurePurchases, so a missing/bad DSN can never
 * take the app down.
 */
export function configureSentry() {
  if (!DSN) return;
  try {
    Sentry.init({ dsn: DSN, tracesSampleRate: 0 });
  } catch (err) {
    console.warn('Sentry init failed', err);
  }
}
