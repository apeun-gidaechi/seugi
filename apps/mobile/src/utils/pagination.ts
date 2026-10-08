export async function loadAllPages<T>(
  fetchPage: (page: number) => Promise<T[]>,
  pageSize: number,
  isActive: () => boolean = () => true,
) {
  const items: T[] = [];
  for (let page = 0; isActive(); page += 1) {
    const batch = await fetchPage(page);
    if (!isActive()) return items;
    items.push(...batch);
    if (batch.length < pageSize) break;
  }
  return items;
}
