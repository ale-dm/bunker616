// Paleta inspirada en el lenguaje visual nativo de iOS (el mismo que usa
// Panels): fondos agrupados, acento azul de sistema y separadores sutiles.
export interface ColorPalette {
  background: string;
  secondaryBackground: string;
  tertiaryBackground: string;
  card: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  separator: string;
  accent: string;
  danger: string;
  success: string;
  overlay: string;
}

export const lightColors: ColorPalette = {
  background: '#F2F2F7',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#E5E5EA',
  card: '#FFFFFF',
  label: '#000000',
  secondaryLabel: '#6C6C70',
  tertiaryLabel: '#AEAEB2',
  separator: '#D1D1D6',
  accent: '#007AFF',
  danger: '#FF3B30',
  success: '#34C759',
  overlay: 'rgba(0,0,0,0.6)',
};

export const darkColors: ColorPalette = {
  background: '#000000',
  secondaryBackground: '#1C1C1E',
  tertiaryBackground: '#2C2C2E',
  card: '#1C1C1E',
  label: '#FFFFFF',
  secondaryLabel: '#9B9BA1',
  tertiaryLabel: '#636366',
  separator: '#38383A',
  accent: '#0A84FF',
  danger: '#FF453A',
  success: '#30D158',
  overlay: 'rgba(0,0,0,0.75)',
};
