import { TextStyle } from 'react-native';

// Escala tipográfica equivalente a los estilos de texto de iOS
// (Large Title / Title / Headline / Body / Footnote / Caption).
export const typography: Record<string, TextStyle> = {
  largeTitle: { fontSize: 34, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  subhead: { fontSize: 14, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 11, fontWeight: '500' },
};
