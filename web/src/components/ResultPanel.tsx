import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResultPanelProps {
  title?: string;
  result: string;
  /** Render mode for the result body. */
  mode?: 'markdown' | 'latex' | 'code';
  /** Optional language hint for code rendering */
  codeLang?: string;
  className?: string;
}

export function ResultPanel({
  title = 'Result',
  result,
  mode = 'markdown',
  codeLang = 'text',
  className,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // LaTeX cleanup matching Streamlit behaviour
  const cleanedLatex = result.replace(/\\\[/g, '').replace(/\\\]/g, '').trim();
  const latexMarkdown = cleanedLatex ? `$$\n${cleanedLatex}\n$$` : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass rounded-xl border bg-card/95 shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="p-4">
        {mode === 'code' ? (
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
            <code className={`language-${codeLang}`}>{result}</code>
          </pre>
        ) : mode === 'latex' ? (
          <div className="space-y-4">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">
              <code>{result}</code>
            </pre>
            <div className="rounded-lg border bg-background/50 p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Rendered</p>
              <div className="prose-result overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                  {latexMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="prose-result">
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
              {result}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
