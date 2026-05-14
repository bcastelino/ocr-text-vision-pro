export interface OpenRouterMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export type OpenRouterMessage =
  | { role: 'user' | 'assistant' | 'system'; content: string }
  | { role: 'user' | 'assistant' | 'system'; content: OpenRouterMessageContentPart[] };

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface CallOptions {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  signal?: AbortSignal;
}

export interface CallResult {
  ok: boolean;
  content?: string;
  error?: string;
}

export async function callOpenRouter({
  apiKey,
  model,
  messages,
  signal,
}: CallOptions): Promise<CallResult> {
  if (!apiKey) {
    return { ok: false, error: 'OpenRouter API key is missing. Add it in the sidebar.' };
  }
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer':
          typeof window !== 'undefined' ? window.location.origin : 'https://bcastelino.github.io',
        'X-Title': 'OCR Text Vision Pro',
      },
      body: JSON.stringify({ model, messages }),
      signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.error?.message ?? data?.message ?? '';
      } catch {
        try {
          detail = await res.text();
        } catch {
          /* ignore */
        }
      }
      return {
        ok: false,
        error: `API error ${res.status}${detail ? ` — ${detail}` : ''}`,
      };
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: 'Empty response from the model.' };
    }
    return { ok: true, content };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { ok: false, error: 'Request cancelled.' };
    }
    return {
      ok: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
