import { useWindowDimensions } from 'react-native';

const MIN_CARD_WIDTH = 150;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 6;

export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor(width / MIN_CARD_WIDTH)));
}
