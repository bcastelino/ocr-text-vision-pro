import { DEFAULT_MODEL_ID } from './models';

const KEY_API = 'ocr_openrouter_api_key';
const KEY_MODEL = 'ocr_selected_model';

export function loadApiKey(): string {
  try {
    return localStorage.getItem(KEY_API) ?? '';
  } catch {
    return '';
  }
}

export function saveApiKey(value: string) {
  try {
    if (value) localStorage.setItem(KEY_API, value);
    else localStorage.removeItem(KEY_API);
  } catch {
    /* ignore */
  }
}

export function loadModelId(): string {
  try {
    return localStorage.getItem(KEY_MODEL) ?? DEFAULT_MODEL_ID;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

export function saveModelId(value: string) {
  try {
    localStorage.setItem(KEY_MODEL, value);
  } catch {
    /* ignore */
  }
}
