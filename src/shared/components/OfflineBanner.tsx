import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServerDown } from '@features/network/serverStatus';
import { useTheme } from '@shared/theme';

export function OfflineBanner() {
  const down = useServerDown();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  if (!down) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { paddingTop: insets.top + 2, backgroundColor: colors.progress }]}>
      <Text style={[typography.caption, { color: '#000000', fontWeight: '700', textAlign: 'center' }]}>
        Sin conexión con el servidor · mostrando lo guardado
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 4, zIndex: 100 },
});
