import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, FileText, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ResultPanel } from '@/components/ResultPanel';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { HoverScale } from '@/components/motion/HoverScale';
import { callOpenRouter } from '@/lib/openrouter';
import { getPdfPageCount, parsePageSelection, pdfPagesToDataUrls } from '@/lib/pdf';
import {
  EXTRACT_MODES,
  EXTRACT_MODE_DESCRIPTIONS,
  pdfPromptForMode,
  type ExtractMode,
} from '@/lib/prompts';
import { cn } from '@/lib/utils';

interface PdfTabProps {
  apiKey: string;
  modelId: string;
}

type PageMode = 'all' | 'select';

export function PdfTab({ apiKey, modelId }: PdfTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageMode, setPageMode] = useState<PageMode>('all');
  const [pageSelection, setPageSelection] = useState('');
  const [contentType, setContentType] = useState<ExtractMode>('General Text Extraction');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPageCount(null);
      return;
    }
    let cancelled = false;
    getPdfPageCount(file)
      .then((c) => {
        if (!cancelled) setPageCount(c);
      })
      .catch((err) => {
        toast.error(`Failed to read PDF: ${(err as Error).message}`);
        if (!cancelled) {
          setPageCount(null);
          setFile(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleScan = async () => {
    if (!apiKey.trim()) {
      toast.error('Add your OpenRouter API key first.');
      return;
    }
    if (!file || !pageCount) {
      toast.error('Upload a PDF first.');
      return;
    }
    let indices: number[];
    if (pageMode === 'all') {
      indices = Array.from({ length: pageCount }, (_, i) => i);
    } else {
      const parsed = parsePageSelection(pageSelection, pageCount);
      if (parsed.error) {
        toast.error(parsed.error);
        return;
      }
      indices = parsed.indices;
    }

    if (indices.length === 0) {
      toast.error('No pages selected.');
      return;
    }
    if (indices.length > 15) {
      toast.warning(
        `Processing ${indices.length} pages — quality may drop with free-tier models.`,
      );
    }

    setLoading(true);
    setResult(null);
    setProgress(`Rendering ${indices.length} page${indices.length > 1 ? 's' : ''}…`);
    try {
      const dataUrls = await pdfPagesToDataUrls(file, indices);
      setProgress('Asking the vision model…');
      const res = await callOpenRouter({
        apiKey,
        model: modelId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: pdfPromptForMode(contentType) },
              ...dataUrls.map((url) => ({
                type: 'image_url' as const,
                image_url: { url },
              })),
            ],
          },
        ],
      });
      if (res.ok && res.content) setResult(res.content);
      else toast.error(res.error ?? 'Unknown error.');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const resultMode =
    contentType === 'LaTeX Equation Conversion'
      ? 'latex'
      : contentType === 'Code Snippet Extraction'
        ? 'code'
        : 'markdown';

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-5">
        <PdfDropzone file={file} onFile={setFile} pageCount={pageCount} />

        {file && pageCount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-xl border bg-card/85 p-4"
          >
            <p className="text-sm font-semibold">Pages to scan</p>
            <RadioGroup
              value={pageMode}
              onValueChange={(v) => setPageMode(v as PageMode)}
              className="grid grid-cols-2 gap-2"
            >
              {(['all', 'select'] as PageMode[]).map((m) => (
                <Label
                  key={m}
                  htmlFor={`page-mode-${m}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors',
                    pageMode === m ? 'border-primary bg-primary/10' : 'hover:bg-accent/40',
                  )}
                >
                  <RadioGroupItem id={`page-mode-${m}`} value={m} />
                  {m === 'all' ? 'All pages' : 'Select pages'}
                </Label>
              ))}
            </RadioGroup>
            {pageMode === 'select' && (
              <Input
                placeholder="e.g. 1-5, 8, 12, 34"
                value={pageSelection}
                onChange={(e) => setPageSelection(e.target.value)}
              />
            )}
          </motion.div>
        )}

        <div className="space-y-3 rounded-xl border bg-card/85 p-4">
          <p className="text-sm font-semibold">Content type</p>
          <RadioGroup
            value={contentType}
            onValueChange={(v) => setContentType(v as ExtractMode)}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            <Stagger className="contents" stagger={0.04}>
              {EXTRACT_MODES.map((m) => (
                <StaggerItem key={m}>
                  <HoverScale>
                    <Label
                      htmlFor={`pdf-mode-${m}`}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors',
                        contentType === m
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-accent/40',
                      )}
                    >
                      <RadioGroupItem id={`pdf-mode-${m}`} value={m} className="mt-0.5" />
                      <div className="leading-tight">
                        <p className="text-sm font-medium">{m}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {EXTRACT_MODE_DESCRIPTIONS[m]}
                        </p>
                      </div>
                    </Label>
                  </HoverScale>
                </StaggerItem>
              ))}
            </Stagger>
          </RadioGroup>
        </div>

        <HoverScale>
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={handleScan}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {progress || 'Working…'}
              </>
            ) : (
              <>
                <ScanLine className="h-4 w-4" /> Scan PDF
              </>
            )}
          </Button>
        </HoverScale>
      </div>

      <div className="lg:col-span-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border bg-card/85 text-muted-foreground"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">{progress || 'Working…'}</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ResultPanel
                result={result}
                mode={resultMode}
                codeLang={contentType === 'Code Snippet Extraction' ? 'python' : 'text'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/75 p-6 text-center"
            >
              <FileText className="mb-2 h-7 w-7 text-muted-foreground" />
              <p className="font-medium">Drop a PDF to begin</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Pages render locally with PDF.js before being sent to OpenRouter as images.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PdfDropzone({
  file,
  onFile,
  pageCount,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  pageCount: number | null;
}) {
  return (
    <label
      className="group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card/85 p-6 text-center transition-colors hover:border-primary/60 hover:bg-card/95"
      htmlFor="pdf-input"
    >
      {file ? (
        <>
          <FileText className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
            {pageCount ? ` · ${pageCount} page${pageCount > 1 ? 's' : ''}` : ''}
          </p>
          <Button
            variant="outline"
            size="icon"
            type="button"
            className="absolute right-2 top-2 h-7 w-7 rounded-full"
            onClick={(e) => {
              e.preventDefault();
              onFile(null);
            }}
            aria-label="Remove PDF"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          <p className="font-medium">Drop a PDF or click to upload</p>
          <p className="text-xs text-muted-foreground">Rendered locally in your browser</p>
        </>
      )}
      <input
        id="pdf-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFile(f);
        }}
      />
    </label>
  );
}
