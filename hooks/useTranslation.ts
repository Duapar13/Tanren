import { getLocales } from 'expo-localization';
import { fr } from '../constants/i18n/fr';
import { en } from '../constants/i18n/en';
import { it } from '../constants/i18n/it';
import { es } from '../constants/i18n/es';

export type SupportedLanguage = 'fr' | 'en' | 'it' | 'es';

const DICTS = { fr, en, it, es };

/** Same "compute, don't store" pattern as useTheme's dark/light detection — the device's own
 * language setting is the single source of truth, so there's nothing to persist or sync. */
export function useTranslation() {
  const languageCode = getLocales()[0]?.languageCode ?? 'en';
  const lang: SupportedLanguage = (['fr', 'en', 'it', 'es'] as const).includes(languageCode as SupportedLanguage)
    ? (languageCode as SupportedLanguage)
    : 'en';

  return { t: DICTS[lang], lang };
}
