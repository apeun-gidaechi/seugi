export enum FileType {
  IMG,
  FILE,
  EMOJI,
}

export interface FileResult {
  url: string;
  name: string;
  byte?: number;
}

export type FileCompletion = (result: FileResult, type: FileType) => void;
