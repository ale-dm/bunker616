import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@shared/theme';
import { isAppLockEnabled, unlockWithBiometrics } from './appLock';

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);

  const attemptUnlock = async () => {
    setError(false);
    const unlocked = await unlockWithBiometrics();
    if (unlocked) {
      setLocked(false);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    (async () => {
      const enabled = await isAppLockEnabled();
      setLocked(enabled);
      setChecking(false);
      if (enabled) {
        attemptUnlock();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.title, { color: colors.label, marginBottom: spacing.sm }]}>
          Bunker616 está bloqueado
        </Text>
        {error && (
          <Text style={[typography.footnote, { color: colors.danger, marginBottom: spacing.lg }]}>
            No se pudo verificar tu identidad. Inténtalo de nuevo.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, borderRadius: radii.md }]}
          onPress={attemptUnlock}>
          <Text style={[typography.headline, { color: '#FFFFFF' }]}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  button: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
});
