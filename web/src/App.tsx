import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Image as ImageIcon, MessageSquare, FileText } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Hero } from '@/components/Hero';
import { FadeIn } from '@/components/motion/FadeIn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExtractTab } from '@/components/tabs/ExtractTab';
import { AskChatTab } from '@/components/tabs/AskChatTab';
import { PdfTab } from '@/components/tabs/PdfTab';
import { loadApiKey, loadModelId, saveApiKey, saveModelId } from '@/lib/storage';

// Lazy-load Three.js dotted surface to keep first paint fast
const DottedSurface = lazy(() => import('@/components/DottedSurface'));

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [tab, setTab] = useState<'extract' | 'ask' | 'pdf'>('extract');
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setApiKey(loadApiKey());
    setModelId(loadModelId());
  }, []);

  const handleApiKey = (key: string) => {
    setApiKey(key);
    saveApiKey(key);
  };
  const handleModel = (id: string) => {
    setModelId(id);
    saveModelId(id);
  };

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Suspense fallback={null}>
        <DottedSurface />
      </Suspense>

      {/* Subtle gradient overlay on top of the surface */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]"
      />

      <Header />
      <Toaster position="top-right" richColors theme="dark" />

      <main>
        <Hero onGetStarted={scrollToWorkspace} />

        <section ref={workspaceRef} className="container scroll-mt-20 py-16">
          <FadeIn>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Workspace</h2>
              <p className="mt-2 text-muted-foreground">
                Pick a workflow, drop your files, and let a free vision model do the rest.
              </p>
            </div>
          </FadeIn>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <FadeIn>
              <div className="lg:sticky lg:top-20">
                <Sidebar
                  apiKey={apiKey}
                  onApiKeyChange={handleApiKey}
                  modelId={modelId}
                  onModelChange={handleModel}
                />
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="flex w-full flex-wrap">
                  <TabsTrigger value="extract" className="gap-2 flex-1 min-w-[140px]">
                    <ImageIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Extract & Convert</span>
                    <span className="sm:hidden">Extract</span>
                  </TabsTrigger>
                  <TabsTrigger value="ask" className="gap-2 flex-1 min-w-[140px]">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Ask, Analyze & Chat</span>
                    <span className="sm:hidden">Ask & Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="gap-2 flex-1 min-w-[140px]">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF Scan & Extract</span>
                    <span className="sm:hidden">PDF</span>
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <TabsContent value="extract" forceMount={tab === 'extract' ? true : undefined}>
                      {tab === 'extract' && <ExtractTab apiKey={apiKey} modelId={modelId} />}
                    </TabsContent>
                    <TabsContent value="ask" forceMount={tab === 'ask' ? true : undefined}>
                      {tab === 'ask' && <AskChatTab apiKey={apiKey} modelId={modelId} />}
                    </TabsContent>
                    <TabsContent value="pdf" forceMount={tab === 'pdf' ? true : undefined}>
                      {tab === 'pdf' && <PdfTab apiKey={apiKey} modelId={modelId} />}
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </FadeIn>
          </div>
        </section>

        <footer className="container py-10 text-center text-xs text-muted-foreground">
          <p>
            Open-source · MIT · Built with React, Vite, Tailwind, framer-motion & Three.js. The{' '}
            <a
              className="font-medium text-foreground hover:text-primary"
              href="https://ocr-text-vision-pro.streamlit.app/"
              target="_blank"
              rel="noreferrer"
            >
              Streamlit version
            </a>{' '}
            is still live.
          </p>
        </footer>
      </main>
    </div>
  );
}
