import { SeugiApi } from "@seugi/api-client";
import { API_URL } from "../config";
import { isPlaygroundApp } from "../appVariant";
import { PlaygroundSeugiApi } from "../playground/PlaygroundSeugiApi";

export const api = isPlaygroundApp() ? new PlaygroundSeugiApi(API_URL) : new SeugiApi(API_URL);
