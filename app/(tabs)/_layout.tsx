import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuidedTour } from '../../components/GuidedTour';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { hasSeenTour, markTourSeen } from '../../lib/tour';

// Standard iOS tab bar content height — useBottomTabBarHeight() only works from a screen
// rendered inside the tab navigator, and the tour needs to live one level up (as a sibling of
// <Tabs>) so it can survive real navigation between tabs as it steps through them.
const TAB_BAR_CONTENT_HEIGHT = 49;

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
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabs.home,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="seance"
          options={{
            title: t.tabs.session,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progression"
          options={{
            title: t.tabs.progression,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="rang"
          options={{
            title: t.tabs.rank,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: t.tabs.nutrition,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="nutrition-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: t.tabs.profile,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
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
