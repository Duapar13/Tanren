import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Card } from '../../components/Card';
import { MonthlyCalendar } from '../../components/MonthlyCalendar';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Spacing } from '../../constants/theme';

export default function ProgressionScreen() {
  const { sessions } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScreenHeader mascot="excited" />
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.lg,
            gap: Spacing.lg,
            paddingBottom: Spacing.xxl,
          }}
        >
          <View>
            <ThemedText variant="headline" style={{ marginBottom: Spacing.sm }}>
              {t.progression.regularity}
            </ThemedText>
            <Card>
              <MonthlyCalendar
                year={viewYear}
                month={viewMonth}
                sessions={sessions}
                trainingDays={user?.trainingDays ?? []}
                onChangeMonth={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                }}
                onDayPress={(date) => router.push({ pathname: '/session-detail', params: { date } })}
                onStatsPress={() =>
                  router.push({
                    pathname: '/month-recap',
                    params: { year: String(viewYear), month: String(viewMonth) },
                  })
                }
              />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
