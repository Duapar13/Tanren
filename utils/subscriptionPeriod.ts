import { TranslationDict } from '../constants/i18n/fr';

// RevenueCat/StoreKit report subscription length as an ISO 8601 duration (P1W, P1M, P3M, P6M,
// P1Y — the only lengths Apple's subscription products can actually have). Returns null for a
// one-time (non-subscription) product, where Apple doesn't require a duration to be shown.
export function formatSubscriptionPeriod(period: string | null | undefined, t: TranslationDict): string | null {
  if (!period) return null;
  switch (period) {
    case 'P1W':
      return t.support.periodWeek;
    case 'P1M':
      return t.support.periodMonth;
    case 'P2M':
      return t.support.periodTwoMonths;
    case 'P3M':
      return t.support.periodThreeMonths;
    case 'P6M':
      return t.support.periodSixMonths;
    case 'P1Y':
      return t.support.periodYear;
    default:
      return period;
  }
}
