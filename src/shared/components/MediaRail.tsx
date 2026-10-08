import React from 'react';
import { FlatList } from 'react-native';
import { useTheme } from '@shared/theme';
import { MediaCard } from './MediaCard';
import { SectionHeader } from './SectionHeader';

export interface RailItem {
  id: string;
  title: string;
  coverUri: string;
  subtitle?: string;
  subtitleTone?: 'secondary' | 'progress';
  stack?: { seriesId: string; fromBookId?: string };
  onPress: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  items: RailItem[];
}

export function MediaRail({ title, subtitle, items }: Props) {
  const { spacing } = useTheme();
  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MediaCard
            coverUri={item.coverUri}
            title={item.title}
            subtitle={item.subtitle}
            subtitleTone={item.subtitleTone}
            stack={item.stack}
            onPress={item.onPress}
          />
        )}
      />
    </>
  );
}
