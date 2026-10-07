export type RootStackParamList = {
  Library: undefined;
  Series: { seriesId: string; title: string };
  Reader: { bookId: string; title: string; seriesId: string };
};
