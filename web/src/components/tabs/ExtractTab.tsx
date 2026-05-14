import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ResultPanel } from '@/components/ResultPanel';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { HoverScale } from '@/components/motion/HoverScale';
import { callOpenRouter, fileToDataUrl } from '@/lib/openrouter';
import {
  EXTRACT_MODES,
  EXTRACT_MODE_DESCRIPTIONS,
  imagePromptForMode,
  type ExtractMode,
} from '@/lib/prompts';

interface ExtractTabProps {
  apiKey: string;
  modelId: string;
}

export function ExtractTab({ apiKey, modelId }: ExtractTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ExtractMode>('General Text Extraction');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRun = async () => {
    if (!apiKey.trim()) {
      toast.error('Add your OpenRouter API key first.');
      return;
    }
    if (!file) {
      toast.error('Upload an image first.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await callOpenRouter({
        apiKey,
        model: modelId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: imagePromptForMode(mode) },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      if (res.ok && res.content) {
        setResult(res.content);
      } else {
        setResult(null);
        toast.error(res.error ?? 'Unknown error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resultMode =
    mode === 'LaTeX Equation Conversion'
      ? 'latex'
      : mode === 'Code Snippet Extraction'
        ? 'code'
        : 'markdown';

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-5">
        <ImageDropzone file={file} onFile={setFile} />

        <div className="space-y-3 rounded-xl border bg-card/85 p-4">
          <p className="text-sm font-semibold">Content type</p>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ExtractMode)}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            <Stagger className="contents" stagger={0.04}>
              {EXTRACT_MODES.map((m) => (
                <StaggerItem key={m}>
                  <HoverScale>
                    <Label
                      htmlFor={`mode-${m}`}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${mode === m
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/40'
                        }`}
                    >
                      <RadioGroupItem id={`mode-${m}`} value={m} className="mt-0.5" />
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
            onClick={handleRun}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Process image
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
              className="flex h-full min-h-[300px] items-center justify-center rounded-xl border bg-card/85"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Asking the vision model…</p>
              </div>
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
                codeLang={mode === 'Code Snippet Extraction' ? 'python' : 'text'}
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
              <Sparkles className="mb-2 h-7 w-7 text-muted-foreground" />
              <p className="font-medium">Your result appears here</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Upload an image, pick a content type, and press <span className="font-medium">Process image</span>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
