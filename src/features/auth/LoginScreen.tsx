import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from '@shared/theme';

export function LoginScreen() {
  const { login } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = baseUrl.trim() && email.trim() && password && !loading;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login({ baseUrl: baseUrl.trim(), email: email.trim(), password });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else if (e?.message === 'Network Error') {
        setError('No se pudo conectar con el servidor. Revisa la URL.');
      } else {
        setError(e?.message ?? 'Error desconocido al conectar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { padding: spacing.xl }]}>
        <Text style={[typography.largeTitle, { color: colors.label, textAlign: 'center' }]}>
          Bunker616
        </Text>
        <Text
          style={[
            typography.subhead,
            {
              color: colors.secondaryLabel,
              textAlign: 'center',
              marginTop: spacing.xs,
              marginBottom: spacing.xxl,
            },
          ]}>
          Conéctate a tu servidor Komga
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
            URL DEL SERVIDOR
          </Text>
          <TextInput
            style={[
              typography.body,
              styles.input,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radii.md,
                color: colors.label,
              },
            ]}
            placeholder="https://komga.midominio.com"
            placeholderTextColor={colors.tertiaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={baseUrl}
            onChangeText={setBaseUrl}
          />
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
            EMAIL
          </Text>
          <TextInput
            style={[
              typography.body,
              styles.input,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radii.md,
                color: colors.label,
              },
            ]}
            placeholder="usuario@ejemplo.com"
            placeholderTextColor={colors.tertiaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
            CONTRASEÑA
          </Text>
          <TextInput
            style={[
              typography.body,
              styles.input,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radii.md,
                color: colors.label,
              },
            ]}
            placeholder="••••••••"
            placeholderTextColor={colors.tertiaryLabel}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && (
          <Text style={[typography.footnote, { color: colors.danger, textAlign: 'center', marginBottom: spacing.md }]}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.accent, borderRadius: radii.md },
            !canSubmit && styles.buttonDisabled,
          ]}
          disabled={!canSubmit}
          onPress={onSubmit}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[typography.headline, { color: '#FFFFFF' }]}>Conectar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center' },
  input: { paddingHorizontal: 14, paddingVertical: 12 },
  button: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
});
