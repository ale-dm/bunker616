import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@shared/theme';

interface Props {
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorState({ message = 'No se pudo cargar. Revisa la conexión con el servidor.', onRetry, onBack }: Props) {
  const { colors, spacing, radii, typography } = useTheme();
  return (
    <View style={[styles.container, { padding: spacing.xl }]} accessibilityRole="alert">
      <Text style={[typography.body, { color: colors.secondaryLabel, textAlign: 'center' }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={[styles.button, { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.md }]}>
          <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Reintentar</Text>
        </TouchableOpacity>
      )}
      {onBack && (
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" style={{ marginTop: spacing.sm, padding: spacing.sm }}>
          <Text style={[typography.body, { color: colors.accent }]}>Volver</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  button: { paddingHorizontal: 20, paddingVertical: 10 },
});
