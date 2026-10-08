export async function joinWorkspaceThenShowWaiting(
  submit: () => Promise<unknown>,
  showWaiting: () => void,
  refresh: () => Promise<unknown>,
): Promise<void> {
  await submit();
  showWaiting();
  void refresh().catch(() => undefined);
}
