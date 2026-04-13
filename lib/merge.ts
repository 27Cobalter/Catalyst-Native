
export const merge = <T, K extends keyof T>(source1: T[], source2: T[], sets: React.RefObject<Set<T[K]>>, selector: (item: T) => T[K]) => {
  const newItems: T[] = [];
  const filtered = source2.filter((item) => !sets.current.has(selector(item)));

  filtered.forEach((item) => {
    sets.current.add(selector(item));
    newItems.push(item);
  });

  return [...source1, ...newItems];
};