import assert from "node:assert/strict";
import test from "node:test";
import { firstPickedImage, type PickedImage } from "../src/result.ts";

const image: PickedImage = {
  uri: "file:///cache/seugi-image.jpg",
  name: "seugi-image.jpg",
  mimeType: "image/jpeg",
  size: 128,
};

test("a canceled native picker resolves without an image", () => {
  assert.equal(firstPickedImage({ canceled: true }), undefined);
});

test("a selected native image is returned intact", () => {
  assert.deepEqual(firstPickedImage({ canceled: false, assets: [image] }), image);
});

test("a successful picker response with no assets resolves without an image", () => {
  assert.equal(firstPickedImage({ canceled: false, assets: [] }), undefined);
});
