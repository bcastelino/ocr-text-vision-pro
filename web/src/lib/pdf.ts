import * as pdfjsLib from 'pdfjs-dist';
// Vite-style worker URL import. Bundled as a static asset and served from the GH Pages base path.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - ?url is handled by Vite
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PageSelectionResult {
  indices: number[]; // 0-based
  error?: string;
}

/**
 * Parse "1-5, 8, 12" into 0-based page indices, bounded by totalPages.
 */
export function parsePageSelection(selection: string, totalPages: number): PageSelectionResult {
  const trimmed = selection?.trim();
  if (!trimmed) return { indices: [], error: 'Please enter at least one page number.' };

  const pages = new Set<number>();
  const parts = trimmed.split(',');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (start < 1 || end < 1) return { indices: [], error: `Page numbers must be positive (got '${part}').` };
      if (start > end) return { indices: [], error: `Invalid range '${part}' — start must be ≤ end.` };
      if (end > totalPages) return { indices: [], error: `Page ${end} exceeds the PDF's ${totalPages} page(s).` };
      for (let p = start; p <= end; p++) pages.add(p);
    } else if (/^\d+$/.test(part)) {
      const p = parseInt(part, 10);
      if (p < 1) return { indices: [], error: 'Page numbers must be positive.' };
      if (p > totalPages) return { indices: [], error: `Page ${p} exceeds the PDF's ${totalPages} page(s).` };
      pages.add(p);
    } else {
      return { indices: [], error: `Invalid entry '${part}'. Use numbers or ranges like '1-5'.` };
    }
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  return { indices: sorted.map((p) => p - 1) };
}

export async function getPdfPageCount(file: File): Promise<number> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

/**
 * Render specific pages of a PDF (by 0-based indices) as PNG data URLs.
 * Uses a 1.8x scale roughly matching the Streamlit app's 150 dpi.
 */
export async function pdfPagesToDataUrls(
  file: File,
  pageIndices: number[],
  scale = 1.8,
): Promise<string[]> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const urls: string[] = [];
  try {
    for (const idx of pageIndices) {
      const page = await doc.getPage(idx + 1); // pdfjs is 1-based
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context for PDF rendering.');
      await page.render({ canvasContext: ctx, viewport }).promise;
      urls.push(canvas.toDataURL('image/png'));
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return urls;
}
