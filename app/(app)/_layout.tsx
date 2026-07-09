import React, { useEffect } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { registerForPushNotifications } from '@/lib/notifications';
import { touchPresence } from '@/lib/book';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.dotSlot}>{focused && <View style={styles.dot} />}</View>
      <Ionicons name={name} size={26} color={color} />
    </View>
  );
}

export default function AppLayout() {
  const { user, bookId, bookResolved } = useAuth();

  useEffect(() => {
    if (!user || !bookId) return;
    registerForPushNotifications(user.uid).catch(() => {});
    touchPresence(user.uid).catch(() => {});

    const interval = setInterval(() => touchPresence(user.uid).catch(() => {}), 120 * 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') touchPresence(user.uid).catch(() => {});
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [user, bookId]);

  if (!user) return <Redirect href={'/(auth)/login' as any} />;
  if (bookResolved && !bookId) return <Redirect href={'/onboarding' as any} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.filterUnselected,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="book"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="book" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="camera" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.ink,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    height: 64,
    paddingTop: 6,
    elevation: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },
  dotSlot: {
    height: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },
});
