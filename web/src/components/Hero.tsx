import { motion } from 'framer-motion';
import { ArrowDown, Sparkles, FileText, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stagger, StaggerItem } from './motion/Stagger';
import { HoverScale } from './motion/HoverScale';

const features = [
  { icon: ImageIcon, label: 'Extract', desc: 'Text, code, equations, charts' },
  { icon: MessageSquare, label: 'Ask & Chat', desc: 'One-shot Q&A or multi-turn chat' },
  { icon: FileText, label: 'PDF Scan', desc: 'Page-range vision OCR' },
];

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-4 pb-16 pt-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Powered by free vision models via OpenRouter
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
      >
        See, read, and reason about{' '}
        <span className="gradient-text">any image or PDF</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
      >
        Extract text, code, and LaTeX equations from images. Ask questions, analyze documents,
        and scan PDFs — all in your browser, with zero data leaving you except the OpenRouter call.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <HoverScale>
          <Button variant="gradient" size="lg" onClick={onGetStarted}>
            Start extracting
            <ArrowDown className="h-4 w-4" />
          </Button>
        </HoverScale>
        <HoverScale>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://github.com/bcastelino/ocr-text-vision-pro"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </HoverScale>
      </motion.div>

      <Stagger className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.label}>
            <HoverScale className="h-full">
              <div className="glass h-full rounded-xl p-4 text-left">
                <f.icon className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </HoverScale>
          </StaggerItem>
        ))}
      </Stagger>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="mt-14 text-muted-foreground"
      >
        <ArrowDown className="h-5 w-5" />
      </motion.div>
    </section>
  );
}
