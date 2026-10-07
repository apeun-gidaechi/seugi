import { useState } from "react";
import { withSeugiApi } from "@/Api/client";

// TODO: Move to file
export enum FileType {
  IMG,
  FILE,
  EMOJI
}

export interface FileResult {
  url: string;
  name: string;
  byte?: number;
}   

export type FileCompletion = (result: FileResult, type: FileType) => void

const useFileUpload = (completion: FileCompletion) => {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, type: FileType) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const apiType = type === FileType.IMG ? "IMAGE" : type === FileType.FILE ? "FILE" : "EMOJI";
      const uploaded = await withSeugiApi((api) => api.uploadFile(apiType, formData));
      const result: FileResult = { url: uploaded.url, name: uploaded.name, byte: uploaded.byte ?? uploaded.size };
      completion(result, type);
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
};

export default useFileUpload;
