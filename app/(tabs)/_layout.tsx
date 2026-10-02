import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
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

// Standard iOS tab bar content height — useBottomTabBarHeight() only works from a screen
// rendered inside the tab navigator, and the tour needs to live one level up (as a sibling of
// <Tabs>) so it can survive real navigation between tabs as it steps through them.
const TAB_BAR_CONTENT_HEIGHT = 49;

/** Raised round button in the middle of the bar: one tap to start a workout from anywhere. */
function CenterButton() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPress={() => openSession()}
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
