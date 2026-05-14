import { Eye, EyeOff, KeyRound, ExternalLink, Cpu } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AVAILABLE_MODELS } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  modelId: string;
  onModelChange: (id: string) => void;
  className?: string;
}

export function Sidebar({
  apiKey,
  onApiKeyChange,
  modelId,
  onModelChange,
  className,
}: SidebarProps) {
  const [show, setShow] = useState(false);
  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === modelId);
  const groupedModels = [
    { label: 'Free models', models: AVAILABLE_MODELS.filter((m) => m.tier === 'free') },
    { label: 'Paid models', models: AVAILABLE_MODELS.filter((m) => m.tier === 'paid') },
    { label: 'Universal', models: AVAILABLE_MODELS.filter((m) => m.tier === 'universal') },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass rounded-2xl border p-5 shadow-xl shadow-black/5',
        className,
      )}
    >
      <div className="mb-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-4 w-4 text-primary" />
          OpenRouter API key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Stored only in this browser (localStorage). Never sent anywhere except OpenRouter.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api-key">API key</Label>
        <div className="relative">
          <Input
            id="api-key"
            type={show ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-or-v1-..."
            autoComplete="off"
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide API key' : 'Show API key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button variant="outline" size="sm" asChild className="w-full">
          <a
            href="https://openrouter.ai/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="!justify-center"
          >
            Get a free API key
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        {!apiKey.trim() && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
            Enter your OpenRouter key to start. Required for the GitHub Pages build.
          </p>
        )}
      </div>

      <div className="my-5 h-px bg-border" />

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <Cpu className="h-4 w-4 text-primary" /> Vision model
        </h2>
        <Select value={modelId} onValueChange={onModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupedModels.map((group) => (
              <SelectGroup key={group.label}>
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {group.models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {selectedModel && (
          <div className="mt-3 space-y-2 rounded-lg border bg-background/40 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">{selectedModel.context}</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                {selectedModel.id.split('/').pop()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-md border bg-background/50 px-2 py-1.5">
                <span className="block text-muted-foreground">Input / 1M</span>
                <span className="font-semibold">{selectedModel.inputCostPerMillion}</span>
              </div>
              <div className="rounded-md border bg-background/50 px-2 py-1.5">
                <span className="block text-muted-foreground">Output / 1M</span>
                <span className="font-semibold">{selectedModel.outputCostPerMillion}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{selectedModel.strengths}</p>
          </div>
        )}
      </div>

      <div className="my-5 h-px bg-border" />
      <p className="text-[11px] text-muted-foreground">
        Made with care by{' '}
        <a
          href="https://brianc.framer.website/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground hover:text-primary"
        >
          Brian Castelino
        </a>
      </p>
    </motion.aside>
  );
}
