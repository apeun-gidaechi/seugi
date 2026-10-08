export type PickedImage = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

export type PickImageResult = { canceled: true } | { canceled: false; assets: PickedImage[] };

export function firstPickedImage(result: PickImageResult): PickedImage | undefined {
  if (result.canceled) return undefined;
  return result.assets[0];
}
