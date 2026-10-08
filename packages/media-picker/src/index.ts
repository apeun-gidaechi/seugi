import { requireNativeModule } from "expo-modules-core";
import { firstPickedImage, type PickImageResult, type PickedImage } from "./result.js";

export type { PickedImage } from "./result.js";

type NativeMediaPicker = { pickImage(): Promise<PickImageResult> };

let nativeMediaPicker: NativeMediaPicker | null | undefined;

function getNativeMediaPicker(): NativeMediaPicker | null {
  if (nativeMediaPicker !== undefined) return nativeMediaPicker;
  try {
    nativeMediaPicker = requireNativeModule<NativeMediaPicker>("SeugiMediaPicker");
  } catch {
    nativeMediaPicker = null;
  }
  return nativeMediaPicker;
}

export async function pickImageFromLibrary(): Promise<PickedImage | undefined> {
  const native = getNativeMediaPicker();
  if (!native) return undefined;
  const result = await native.pickImage();
  return firstPickedImage(result);
}
