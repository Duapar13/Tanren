import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NinjaMascot } from '../components/NinjaMascot';
import { useTranslation } from '../hooks/useTranslation';
import { Spacing } from '../constants/theme';

export default function SupportScreen() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => setPackages(offerings.current?.availablePackages ?? []))
      .catch(() => setPackages([]))
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
          <Card style={{ width: '100%' }}>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              {t.support.noOfferings}
            </ThemedText>
          </Card>
        ) : (
          <View style={{ width: '100%', gap: Spacing.sm }}>
            {packages.map((pkg) => (
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
                </View>
                <Button
                  title={purchasingId === pkg.identifier ? t.support.purchasing : pkg.product.priceString}
                  onPress={() => handlePurchase(pkg)}
                  disabled={purchasingId !== null}
                  style={{ paddingHorizontal: Spacing.lg }}
                />
              </Card>
            ))}
          </View>
        )}

        <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
          {t.support.disclaimer}
        </ThemedText>

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
