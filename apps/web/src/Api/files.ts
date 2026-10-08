import { withSeugiApi } from "./client";

export const uploadImage = (form: FormData) => withSeugiApi((api) => api.uploadFile("IMAGE", form));
