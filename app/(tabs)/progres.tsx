import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedView } from '../../components/ThemedView';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ActivityView } from '../../components/progress/ActivityView';
import { RankView } from '../../components/progress/RankView';
import { SocialView } from '../../components/progress/SocialView';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';

type Segment = 'activity' | 'rank' | 'social';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('activity');

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.progress} mascot="excited" />
        <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
          <SegmentedControl
            options={[
              { label: t.progress.segActivity, value: 'activity' as const },
              { label: t.progress.segRank, value: 'rank' as const },
              { label: t.progress.segSocial, value: 'social' as const },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </View>
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }}
          showsVerticalScrollIndicator={false}
        >
          {segment === 'activity' && <ActivityView />}
          {segment === 'rank' && <RankView />}
          {segment === 'social' && <SocialView />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
