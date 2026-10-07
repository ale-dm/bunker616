import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { getAuthHeader } from '@shared/api/client';
import { useTheme } from '@shared/theme';

interface Props {
  uri: string;
  style?: StyleProp<ImageStyle>;
}

export function CoverImage({ uri, style }: Props) {
  const { credentials } = useAuth();
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);

  if (!credentials) {
    return null;
  }

  return (
    <View style={[style, { backgroundColor: colors.tertiaryBackground, overflow: 'hidden' }]}>
      <Image
        source={{ uri, headers: { Authorization: getAuthHeader(credentials) } }}
        style={[style, { opacity: loaded ? 1 : 0 }]}
        resizeMode="cover"
        onLoadEnd={() => setLoaded(true)}
      />
    </View>
  );
}
