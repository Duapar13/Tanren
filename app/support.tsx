import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import * as Sentry from '@sentry/react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NinjaMascot } from '../components/NinjaMascot';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../constants/theme';
import { formatSubscriptionPeriod } from '../utils/subscriptionPeriod';

const PRIVACY_POLICY_URL = 'https://api-tanren.duapar.fr/privacy';
// Apple's own standard EULA — used as-is since Ningyma doesn't need custom subscription terms;
// Apple explicitly allows linking this directly instead of hosting a custom one.
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function SupportScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  // Surfaced only in the empty-state Card below, small and muted — not a normal error banner,
  // just enough that a real config problem (vs. a genuinely offering-less account) is visible
  // on a screenshot instead of silently looking identical to "check back later".
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        setPackages(offerings.current?.availablePackages ?? []);
        if (!offerings.current) {
          setDebugError(`no current offering (${Object.keys(offerings.all).length} offering(s) total)`);
        }
      })
      .catch((err) => {
        setPackages([]);
        const message = err instanceof Error ? err.message : String(err);
        setDebugError(message);
        Sentry.captureException(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasingId(pkg.identifier);
    try {
      await Purchases.purchasePackage(pkg);
      Alert.alert(t.support.thankYouTitle, t.support.thankYouBody);
    } catch (err) {
      if (!(err as { userCancelled?: boolean })?.userCancelled) {
        Alert.alert(t.support.errorTitle, t.support.errorBody);
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      Alert.alert(t.support.restoreDoneTitle, t.support.restoreDoneBody);
    } catch {
      Alert.alert(t.support.restoreErrorTitle, t.support.restoreErrorBody);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md }}>
          <NinjaMascot size={72} reaction="friendly" />
          <ThemedText variant="title2" weight="700" style={{ textAlign: 'center' }}>
            {t.support.title}
          </ThemedText>
          <ThemedText color="secondary" style={{ textAlign: 'center' }}>
            {t.support.subtitle}
          </ThemedText>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: Spacing.xl }} />
        ) : packages.length === 0 ? (
          <Card style={{ width: '100%', gap: Spacing.xs }}>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              {t.support.noOfferings}
            </ThemedText>
            {!!debugError && (
              <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
                {debugError}
              </ThemedText>
            )}
          </Card>
        ) : (
          <View style={{ width: '100%', gap: Spacing.sm }}>
            {packages.map((pkg) => {
              const period = formatSubscriptionPeriod(pkg.product.subscriptionPeriod, t);
              return (
                <Card key={pkg.identifier} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText variant="subhead" weight="600">
                      {pkg.product.title}
                    </ThemedText>
                    {!!pkg.product.description && (
                      <ThemedText variant="caption" color="tertiary" numberOfLines={2}>
                        {pkg.product.description}
                      </ThemedText>
                    )}
                    {!!period && (
                      <ThemedText variant="caption" color="tertiary">
                        {pkg.product.priceString} {period}
                      </ThemedText>
                    )}
                  </View>
                  <Button
                    title={purchasingId === pkg.identifier ? t.support.purchasing : pkg.product.priceString}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasingId !== null}
                    style={{ paddingHorizontal: Spacing.lg }}
                  />
                </Card>
              );
            })}
          </View>
        )}

        <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
          {t.support.disclaimer}
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <ThemedText variant="caption" weight="600" style={{ color: colors.accent, textDecorationLine: 'underline' }}>
              {t.support.privacyPolicy}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
            <ThemedText variant="caption" weight="600" style={{ color: colors.accent, textDecorationLine: 'underline' }}>
              {t.support.termsOfUse}
            </ThemedText>
          </Pressable>
        </View>

        <Button
          title={restoring ? t.support.restoring : t.support.restorePurchases}
          variant="plain"
          onPress={handleRestore}
          disabled={restoring}
        />
      </ScrollView>
    </ThemedView>
  );
}
