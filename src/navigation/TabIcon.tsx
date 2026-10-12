import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export type TabIconName = 'home' | 'library' | 'settings';

interface Props {
  name: TabIconName;
  color: string;
  focused: boolean;
}

// Iconos dibujados a 24 px. Relleno cuando la pestaña está activa, trazo cuando no.
export function TabIcon({ name, color, focused }: Props) {
  const fill = focused ? color : 'none';
  const stroke = color;
  const strokeWidth = 2;

  if (name === 'home') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'library') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Rect x={4} y={4} width={6.5} height={16} rx={1.2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Rect x={13.5} y={4} width={6.5} height={16} rx={1.2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      <Path d="M14 4.5v5M6 14.5v5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
