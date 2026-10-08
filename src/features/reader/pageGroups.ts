// Agrupa índices de página (en orden de lectura) para el modo doble
// página: la portada (página 0) va sola, el resto se empareja de dos en
// dos. En modo simple, cada grupo tiene una sola página.
export function buildPageGroups(pageCount: number, doublePage: boolean): number[][] {
  if (pageCount === 0) {
    return [];
  }
  if (!doublePage) {
    return Array.from({ length: pageCount }, (_, i) => [i]);
  }
  const groups: number[][] = [[0]];
  for (let i = 1; i < pageCount; i += 2) {
    groups.push(i + 1 < pageCount ? [i, i + 1] : [i]);
  }
  return groups;
}

export function findGroupIndex(groups: number[][], pageIndex: number): number {
  const found = groups.findIndex(group => group.includes(pageIndex));
  return found === -1 ? 0 : found;
}

export interface PageSlot {
  pageIndex: number;
  half?: 'first' | 'second';
}

interface PageSize {
  width?: number;
  height?: number;
}

// Grupos en orden de lectura. Con splitSpreads, cada página apaisada en modo
// de una página se convierte en dos grupos (sus mitades), en el orden que marca
// la dirección de lectura.
export function buildReadingGroups(
  pages: PageSize[],
  doublePage: boolean,
  splitSpreads: boolean,
  rtl: boolean,
): PageSlot[][] {
  return buildPageGroups(pages.length, doublePage).flatMap(group => {
    const pageIndex = group[0];
    const size = pages[pageIndex];
    const isSpread = !!size?.width && !!size?.height && size.width > size.height;
    if (!doublePage && splitSpreads && group.length === 1 && isSpread) {
      const halves: ('first' | 'second')[] = rtl ? ['second', 'first'] : ['first', 'second'];
      return halves.map(half => [{ pageIndex, half }]);
    }
    return [group.map(index => ({ pageIndex: index }))];
  });
}

export function findSlotGroupIndex(groups: PageSlot[][], pageIndex: number): number {
  const found = groups.findIndex(group => group.some(slot => slot.pageIndex === pageIndex));
  return found === -1 ? 0 : found;
}
