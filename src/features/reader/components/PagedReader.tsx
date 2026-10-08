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
import { buildReadingGroups, findSlotGroupIndex, PageSlot } from '../pageGroups';
import { PageSource } from '../types';
import { FitMode } from '../readerPrefs';
import { ZoomablePage } from './ZoomablePage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface PagedReaderRef {
  goToPage: (pageIndex: number) => void;
}

interface Props {
  pages: BookPage[];
  getPageSource: (page: BookPage) => PageSource;
  rtl: boolean;
  doublePage: boolean;
  splitSpreads: boolean;
  backgroundColor: string;
  fitMode: FitMode;
  initialPageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
  onTapCenter: () => void;
}

export const PagedReader = forwardRef<PagedReaderRef, Props>(function PagedReaderImpl(
  {
    pages,
    getPageSource,
    rtl,
    doublePage,
    splitSpreads,
    backgroundColor,
    fitMode,
    initialPageIndex,
    onPageIndexChange,
    onTapCenter,
  },
  ref,
) {
  const pagerRef = useRef<PagerView>(null);
  const representativePageRef = useRef(initialPageIndex);
  const isFirstRenderRef = useRef(true);

  const groups = buildReadingGroups(pages, doublePage, splitSpreads, rtl);

  const [pagerPosition, setPagerPosition] = useState(() => {
    const initialGroupIndex = findSlotGroupIndex(groups, initialPageIndex);
    return rtl ? groups.length - 1 - initialGroupIndex : initialGroupIndex;
  });

  // Si cambia el modo, la dirección o la división de dobles páginas a mitad de
  // lectura, hay que recolocar el PagerView en la página que se estaba viendo,
  // porque el significado de "posición" cambia por completo.
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const newGroups = buildReadingGroups(pages, doublePage, splitSpreads, rtl);
    const newGroupIndex = findSlotGroupIndex(newGroups, representativePageRef.current);
    const newPosition = rtl ? newGroups.length - 1 - newGroupIndex : newGroupIndex;
    requestAnimationFrame(() => {
      pagerRef.current?.setPageWithoutAnimation(newPosition);
      setPagerPosition(newPosition);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doublePage, rtl, splitSpreads]);

  useImperativeHandle(ref, () => ({
    goToPage: (pageIndex: number) => {
      const groupIndex = findSlotGroupIndex(groups, pageIndex);
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

  const renderHalf = (slot: PageSlot, page: BookPage, key: string) => {
    // La página completa (dos veces la pantalla) se recorta a la mitad visible.
    const shift = slot.half === 'second' ? -SCREEN_W : 0;
    return (
      <View key={key} collapsable={false} style={{ width: SCREEN_W, height: SCREEN_H, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: shift, width: SCREEN_W * 2, height: SCREEN_H }}>
          <ZoomablePage
            source={getPageSource(page)}
            onTap={handleTap}
            backgroundColor={backgroundColor}
            fitMode={fitMode}
            width={SCREEN_W * 2}
            height={SCREEN_H}
            xOffset={shift}
          />
        </View>
      </View>
    );
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
        const group = groups[groupReadingIndex] ?? [{ pageIndex: 0 }];
        const representativePage = Math.max(...group.map(slot => slot.pageIndex));
        representativePageRef.current = representativePage;
        onPageIndexChange(representativePage);
      }}>
      {displayGroups.map(group => {
        const key = group.map(slot => `${slot.pageIndex}${slot.half ?? ''}`).join('-');
        if (group.length === 1 && group[0].half) {
          return renderHalf(group[0], pages[group[0].pageIndex], key);
        }
        if (group.length === 1) {
          const page = pages[group[0].pageIndex];
          return (
            <View key={key} collapsable={false}>
              <ZoomablePage
                source={getPageSource(page)}
                onTap={handleTap}
                backgroundColor={backgroundColor}
                fitMode={fitMode}
              />
            </View>
          );
        }
        const visualOrder = rtl ? [...group].reverse() : group;
        const half = SCREEN_W / 2;
        return (
          <View key={key} collapsable={false} style={{ flexDirection: 'row' }}>
            {visualOrder.map((slot, index) => {
              const page = pages[slot.pageIndex];
              return (
                <ZoomablePage
                  key={page.number}
                  source={getPageSource(page)}
                  onTap={handleTap}
                  backgroundColor={backgroundColor}
                  fitMode={fitMode}
                  width={half}
                  xOffset={index * half}
                />
              );
            })}
          </View>
        );
      })}
    </PagerView>
  );
});
