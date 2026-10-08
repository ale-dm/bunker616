import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Dimensions, View } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { BookPage } from '@shared/types/komga';
import { buildPageGroups, findGroupIndex } from '../pageGroups';
import { PageSource } from '../types';
import { ZoomablePage } from './ZoomablePage';

const { width: SCREEN_W } = Dimensions.get('window');

export interface PagedReaderRef {
  goToPage: (pageIndex: number) => void;
}

interface Props {
  pages: BookPage[];
  getPageSource: (page: BookPage) => PageSource;
  rtl: boolean;
  doublePage: boolean;
  initialPageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
  onTapCenter: () => void;
}

export const PagedReader = forwardRef<PagedReaderRef, Props>(function PagedReaderImpl(
  { pages, getPageSource, rtl, doublePage, initialPageIndex, onPageIndexChange, onTapCenter },
  ref,
) {
  const pagerRef = useRef<PagerView>(null);
  const representativePageRef = useRef(initialPageIndex);
  const isFirstRenderRef = useRef(true);

  const groups = buildPageGroups(pages.length, doublePage);

  const [pagerPosition, setPagerPosition] = useState(() => {
    const initialGroupIndex = findGroupIndex(groups, initialPageIndex);
    return rtl ? groups.length - 1 - initialGroupIndex : initialGroupIndex;
  });

  // Si cambia el modo (doble página) o la dirección (RTL) a mitad de
  // lectura, hay que recolocar el PagerView en la página que se estaba
  // viendo, porque el significado de "posición" cambia por completo.
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const newGroups = buildPageGroups(pages.length, doublePage);
    const newGroupIndex = findGroupIndex(newGroups, representativePageRef.current);
    const newPosition = rtl ? newGroups.length - 1 - newGroupIndex : newGroupIndex;
    requestAnimationFrame(() => {
      pagerRef.current?.setPageWithoutAnimation(newPosition);
      setPagerPosition(newPosition);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doublePage, rtl]);

  useImperativeHandle(ref, () => ({
    goToPage: (pageIndex: number) => {
      const groupIndex = findGroupIndex(groups, pageIndex);
      const position = rtl ? groups.length - 1 - groupIndex : groupIndex;
      pagerRef.current?.setPage(position);
    },
  }));

  const activeGroupReadingIndex = rtl ? groups.length - 1 - pagerPosition : pagerPosition;
  const displayGroups = rtl ? [...groups].reverse() : groups;

  const goToGroupReadingIndex = (groupReadingIndex: number) => {
    if (groupReadingIndex < 0 || groupReadingIndex >= groups.length) {
      return;
    }
    const position = rtl ? groups.length - 1 - groupReadingIndex : groupReadingIndex;
    pagerRef.current?.setPage(position);
  };

  const handleTap = (xRatio: number) => {
    if (xRatio < 0.3) {
      goToGroupReadingIndex(rtl ? activeGroupReadingIndex + 1 : activeGroupReadingIndex - 1);
    } else if (xRatio > 0.7) {
      goToGroupReadingIndex(rtl ? activeGroupReadingIndex - 1 : activeGroupReadingIndex + 1);
    } else {
      onTapCenter();
    }
  };

  return (
    <PagerView
      ref={pagerRef}
      style={{ flex: 1 }}
      initialPage={pagerPosition}
      onPageSelected={(e: PagerViewOnPageSelectedEvent) => {
        const position = e.nativeEvent.position;
        setPagerPosition(position);
        const groupReadingIndex = rtl ? groups.length - 1 - position : position;
        const group = groups[groupReadingIndex] ?? [0];
        const representativePage = Math.max(...group);
        representativePageRef.current = representativePage;
        onPageIndexChange(representativePage);
      }}>
      {displayGroups.map(group => {
        const key = group.join('-');
        if (group.length === 1) {
          const page = pages[group[0]];
          return (
            <View key={key} collapsable={false}>
              <ZoomablePage source={getPageSource(page)} onTap={handleTap} />
            </View>
          );
        }
        const visualOrder = rtl ? [...group].reverse() : group;
        const half = SCREEN_W / 2;
        return (
          <View key={key} collapsable={false} style={{ flexDirection: 'row' }}>
            {visualOrder.map((pageIndex, slot) => {
              const page = pages[pageIndex];
              return (
                <ZoomablePage
                  key={page.number}
                  source={getPageSource(page)}
                  onTap={handleTap}
                  width={half}
                  xOffset={slot * half}
                />
              );
            })}
          </View>
        );
      })}
    </PagerView>
  );
});
