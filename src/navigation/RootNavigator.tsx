import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SeriesScreen } from '../screens/SeriesScreen';
import { ReaderScreen } from '../screens/ReaderScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f0f12',
    card: '#0f0f12',
    primary: '#5865f2',
  },
};

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#5865f2" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {status === 'signedOut' ? (
        <LoginScreen />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerTintColor: '#fff',
            headerStyle: { backgroundColor: '#0f0f12' },
            contentStyle: { backgroundColor: '#0f0f12' },
          }}>
          <Stack.Screen
            name="Library"
            component={LibraryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Series"
            component={SeriesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Reader"
            component={ReaderScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = {
  loader: {
    flex: 1,
    backgroundColor: '#0f0f12',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
