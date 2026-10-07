import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getAuthHeader } from '../api/client';

interface Props {
  uri: string;
  style?: StyleProp<ImageStyle>;
}

export function CoverImage({ uri, style }: Props) {
  const { credentials } = useAuth();
  if (!credentials) {
    return null;
  }
  return (
    <Image
      source={{ uri, headers: { Authorization: getAuthHeader(credentials) } }}
      style={style}
      resizeMode="cover"
    />
  );
}
