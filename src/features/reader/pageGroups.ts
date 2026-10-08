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
