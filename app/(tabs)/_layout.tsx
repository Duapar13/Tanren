import { useState } from 'react';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuidedTour } from '../../components/GuidedTour';
import { LeaderboardReporter } from '../../components/LeaderboardReporter';
import { WorkoutReminders } from '../../components/WorkoutReminders';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hasSeenTour, markTourSeen } from '../../lib/tour';
import { openSession } from '../../lib/startSession';
import { useData } from '../../context/DataContext';
import { suggestSession } from '../../utils/sessionSuggestion';
import { todayKey } from '../../utils/date';
import { isTrainingDay } from '../../utils/program';

// Standard iOS tab bar content height — useBottomTabBarHeight() only works from a screen
// rendered inside the tab navigator, and the tour needs to live one level up (as a sibling of
// <Tabs>) so it can survive real navigation between tabs as it steps through them.
const TAB_BAR_CONTENT_HEIGHT = 49;

/** Raised round button in the middle of the bar: one tap to start a workout from anywhere. */
function CenterButton() {
  const { colors, scheme } = useTheme();
  const { sessions, sets, exercises } = useData();
  const { user } = useAuth();
  // Gentle call-to-action ring on training days until today's workout is logged.
  const shouldPulse = isTrainingDay(new Date(), user?.trainingDays ?? []) && !sessions.some((s) => s.date === todayKey());
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!shouldPulse) {
      ring.value = 0;
      return;
    }
    ring.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1);
  }, [shouldPulse, ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: shouldPulse ? 0.55 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 0.55 }],
  }));
  const startSuggested = () => {
    // Same as the home card: pre-load the suggested workout, unless one is already done today
    // (an unfinished draft is restored by the session screen itself).
    const doneToday = sessions.some((s) => s.date === todayKey());
    openSession(doneToday ? {} : { exerciseIds: suggestSession(sessions, sets, exercises).exerciseIds });
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 58,
            height: 58,
            marginTop: -22,
            borderRadius: 29,
            backgroundColor: colors.accent,
          },
          ringStyle,
        ]}
      />
      <Pressable
        onPress={startSuggested}
        accessibilityRole="button"
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          borderRadius: 29,
          marginTop: -22,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: colors.tabBarBackground,
          shadowColor: colors.accent,
          shadowOpacity: scheme === 'dark' ? 0.55 : 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Ionicons name="barbell" size={26} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!user) return;
    hasSeenTour(user.id).then((seen) => {
      if (!seen) setShowTour(true);
    });
  }, [user]);

  const finishTour = () => {
    setShowTour(false);
    if (user) markTourSeen(user.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <LeaderboardReporter />
      <WorkoutReminders />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            elevation: 0,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabs.home,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progres"
          options={{
            title: t.tabs.progress,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="start"
          options={{
            title: t.tabs.session,
            tabBarButton: () => <CenterButton />,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: t.tabs.nutrition,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'nutrition' : 'nutrition-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t.tabs.profile,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <GuidedTour
        visible={showTour}
        onFinish={finishTour}
        tabBarHeight={TAB_BAR_CONTENT_HEIGHT + insets.bottom}
      />
    </View>
  );
}
