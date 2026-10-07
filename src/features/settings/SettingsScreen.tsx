import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '@shared/theme';

export function SettingsScreen() {
  const { credentials, logout } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres desconectarte de este servidor?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[typography.largeTitle, { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        Ajustes
      </Text>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
          SERVIDOR
        </Text>
        <View style={[styles.card, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md }]}>
          <Text style={[typography.body, { color: colors.label }]} numberOfLines={1}>
            {credentials?.baseUrl}
          </Text>
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
            {credentials?.email}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.card, styles.logoutCard, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, marginTop: spacing.lg }]}
          onPress={confirmLogout}>
          <Text style={[typography.body, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 14 },
  logoutCard: { alignItems: 'center' },
});
