import assert from "node:assert/strict";
import test from "node:test";
import { loadAllPages } from "../src/utils/pagination.ts";

test("loadAllPages collects the full list until the final short page", async () => {
  const requestedPages: number[] = [];
  const items = await loadAllPages(async (page) => {
    requestedPages.push(page);
    return page === 0 ? [1, 2] : page === 1 ? [3, 4] : [5];
  }, 2);

  assert.deepEqual(items, [1, 2, 3, 4, 5]);
  assert.deepEqual(requestedPages, [0, 1, 2]);
});

test("loadAllPages stops when its owning screen becomes inactive", async () => {
  let active = true;
  const requestedPages: number[] = [];
  const items = await loadAllPages(
    async (page) => {
      requestedPages.push(page);
      active = false;
      return [1, 2];
    },
    2,
    () => active,
  );

  assert.deepEqual(items, []);
  assert.deepEqual(requestedPages, [0]);
});
