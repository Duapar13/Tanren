import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/**
 * Donations/subscriptions here never gate anything in the app — there's nothing to entitle
 * or restore, so there's no need to identify users to RevenueCat or check entitlements
 * anywhere else. This just needs to be configured once so the store can list packages and
 * take a payment; RevenueCat handles Apple's receipt validation on its own.
 */
export function configurePurchases() {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;
  try {
    Purchases.configure({ apiKey });
  } catch (err) {
    console.warn('RevenueCat configure failed', err);
  }
}
