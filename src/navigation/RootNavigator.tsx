import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@features/auth/AuthContext';
import { LoginScreen } from '@features/auth/LoginScreen';
import { LibraryScreen } from '@features/library/LibraryScreen';
import { SeriesScreen } from '@features/series/SeriesScreen';
import { ReaderScreen } from '@features/reader/ReaderScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { useTheme } from '@shared/theme';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: { backgroundColor: colors.secondaryBackground, borderTopColor: colors.separator },
        tabBarLabelStyle: typography.caption,
      }}>
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color }) => <TabGlyph symbol="▤" color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabGlyph symbol="⚙" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function TabGlyph({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export function RootNavigator() {
  const { status } = useAuth();
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.secondaryBackground,
      text: colors.label,
      border: colors.separator,
      primary: colors.accent,
    },
  };

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {status === 'signedOut' ? (
        <LoginScreen />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Series" component={SeriesScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
