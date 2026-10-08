import { requireNativeModule } from "expo-modules-core";
import { firstPickedImage, type PickImageResult, type PickedImage } from "./result.js";

export type { PickedImage } from "./result.js";

type NativeMediaPicker = { pickImage(): Promise<PickImageResult> };

const nativeMediaPicker = requireNativeModule<NativeMediaPicker>("SeugiMediaPicker");

export async function pickImageFromLibrary(): Promise<PickedImage | undefined> {
  const result = await nativeMediaPicker.pickImage();
  return firstPickedImage(result);
}
