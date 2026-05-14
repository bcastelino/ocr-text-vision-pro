import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, MessageSquare, ScanSearch } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ResultPanel } from '@/components/ResultPanel';
import { HoverScale } from '@/components/motion/HoverScale';
import {
  callOpenRouter,
  fileToDataUrl,
  type OpenRouterMessage,
} from '@/lib/openrouter';
import { askPrompt, type AnalysisScope } from '@/lib/prompts';
import { cn } from '@/lib/utils';

type Mode = 'one-shot' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskChatTabProps {
  apiKey: string;
  modelId: string;
}

export function AskChatTab({ apiKey, modelId }: AskChatTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('one-shot');
  const [scope, setScope] = useState<AnalysisScope>('Document Intelligence');
  const [question, setQuestion] = useState('');
  const [oneShotResult, setOneShotResult] = useState<string | null>(null);

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [imageSig, setImageSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset chat history when the image changes
  useEffect(() => {
    if (!file) return;
    const sig = `${file.name}:${file.size}:${file.type}`;
    if (sig !== imageSig) {
      setImageSig(sig);
      setHistory([]);
      setOneShotResult(null);
    }
  }, [file, imageSig]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const requireReady = () => {
    if (!apiKey.trim()) {
      toast.error('Add your OpenRouter API key first.');
      return false;
    }
    if (!file) {
      toast.error('Upload an image first.');
      return false;
    }
    return true;
  };

  const runOneShot = async () => {
    if (!requireReady()) return;
    if (!question.trim()) {
      toast.error('Enter a question or request.');
      return;
    }
    setLoading(true);
    setOneShotResult(null);
    try {
      const dataUrl = await fileToDataUrl(file!);
      const res = await callOpenRouter({
        apiKey,
        model: modelId,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: askPrompt(scope, question.trim()) },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      if (res.ok && res.content) setOneShotResult(res.content);
      else toast.error(res.error ?? 'Unknown error.');
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!requireReady()) return;
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    const nextHistory: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistory(nextHistory);
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file!);
      // Attach the image to the first user message only
      let firstUserAttached = false;
      const apiMessages: OpenRouterMessage[] = nextHistory.map((m) => {
        if (m.role === 'user' && !firstUserAttached) {
          firstUserAttached = true;
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });
      const res = await callOpenRouter({ apiKey, model: modelId, messages: apiMessages });
      const assistant = res.ok && res.content ? res.content : `Error: ${res.error ?? 'unknown'}`;
      setHistory((prev) => [...prev, { role: 'assistant', content: assistant }]);
      if (!res.ok) toast.error(res.error ?? 'Unknown error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-5">
        <ImageDropzone file={file} onFile={setFile} />

        <div className="space-y-3 rounded-xl border bg-card/90 p-4">
          <p className="text-sm font-semibold">Interaction mode</p>
          <div className="grid grid-cols-2 gap-2">
            <HoverScale>
              <button
                type="button"
                onClick={() => setMode('one-shot')}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  mode === 'one-shot'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent/40',
                )}
              >
                <ScanSearch className="mb-1 h-4 w-4 text-primary" />
                <p className="text-sm font-medium">One-shot</p>
                <p className="text-[11px] text-muted-foreground">Single question or extraction</p>
              </button>
            </HoverScale>
            <HoverScale>
              <button
                type="button"
                onClick={() => setMode('chat')}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  mode === 'chat'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent/40',
                )}
              >
                <MessageSquare className="mb-1 h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Chat session</p>
                <p className="text-[11px] text-muted-foreground">Multi-turn on the same image</p>
              </button>
            </HoverScale>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'one-shot' ? (
            <motion.div
              key="one-shot-controls"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3 rounded-xl border bg-card/90 p-4"
            >
              <p className="text-sm font-semibold">Analysis scope</p>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as AnalysisScope)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {(['Document Intelligence', 'Visual Question Answering'] as AnalysisScope[]).map(
                  (s) => (
                    <Label
                      key={s}
                      htmlFor={`scope-${s}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors',
                        scope === s
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <RadioGroupItem id={`scope-${s}`} value={s} />
                      {s}
                    </Label>
                  ),
                )}
              </RadioGroup>

              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  scope === 'Document Intelligence'
                    ? "e.g. 'Extract invoice number and total amount'"
                    : "e.g. 'Describe the scene' or 'What is the main subject?'"
                }
                rows={3}
              />
              <HoverScale>
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={runOneShot}
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Working…
                    </>
                  ) : scope === 'Document Intelligence' ? (
                    <>Extract / Answer</>
                  ) : (
                    <>Get answer</>
                  )}
                </Button>
              </HoverScale>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="lg:col-span-3">
        <AnimatePresence mode="wait">
          {mode === 'one-shot' ? (
            <motion.div
              key="one-shot-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border bg-card/90">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : oneShotResult ? (
                <ResultPanel result={oneShotResult} mode="markdown" />
              ) : (
                <EmptyState title="Ask anything about your image" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex h-[540px] flex-col rounded-xl border bg-card/90"
            >
              <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto p-4"
              >
                {history.length === 0 ? (
                  <EmptyState title="Start chatting about your image" compact />
                ) : (
                  history.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex gap-3',
                        m.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground',
                        )}
                      >
                        {m.role === 'assistant' ? (
                          <div className="prose-result text-sm">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath, remarkGfm]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
                  </div>
                )}
              </div>
              <div className="border-t border-border/60 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChat();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message…"
                    disabled={loading}
                  />
                  <HoverScale>
                    <Button
                      type="submit"
                      variant="gradient"
                      size="icon"
                      disabled={loading || !chatInput.trim()}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </HoverScale>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center rounded-xl border border-dashed bg-card/75 p-6 text-center',
        compact ? 'min-h-[200px]' : 'min-h-[300px]',
      )}
    >
      <MessageSquare className="mb-2 h-7 w-7 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Upload an image, then ask a single question or open a multi-turn chat.
      </p>
    </div>
  );
}
