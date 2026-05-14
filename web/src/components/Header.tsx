import { Github, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';

const LOGO_URL =
  'https://camo.githubusercontent.com/ab20f255551184dfe232fb29d5d27021c6e0e0e54151432dd64b2b8995496ae3/68747470733a2f2f63646e2d69636f6e732d706e672e666c617469636f6e2e636f6d2f3531322f353236322f353236323032322e706e67';

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 glass-strong border-b"
    >
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={LOGO_URL}
            alt="OCR Text Vision Pro logo"
            width={32}
            height={32}
            loading="eager"
            decoding="async"
            className="h-8 w-8 rounded-lg object-contain shadow-lg shadow-primary/20"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold">OCR Text Vision Pro</p>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Vision OCR · powered by free OpenRouter models
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSidebar && (
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={onOpenSidebar}
              aria-label="Open settings"
            >
              Settings
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <a
              href="https://ocr-text-vision-pro.streamlit.app/"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Streamlit
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="GitHub" className="rounded-full">
            <a
              href="https://github.com/bcastelino/ocr-text-vision-pro"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
