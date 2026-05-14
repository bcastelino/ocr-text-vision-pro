import { useCallback, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function ImageDropzone({
  file,
  onFile,
  accept = 'image/png,image/jpeg,image/jpg',
  label = 'Drop image or click to upload',
  hint = 'PNG, JPG, JPEG • max ~10 MB',
  className,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const setFromFile = useCallback(
    (f: File | null) => {
      onFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(f ? URL.createObjectURL(f) : null);
    },
    [onFile, previewUrl],
  );

  return (
    <div className={cn('w-full', className)}>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFromFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={cn(
          'group relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card/85 hover:border-primary/60 hover:bg-card/95',
        )}
      >
        {previewUrl && file ? (
          <div className="relative w-full">
            <img
              src={previewUrl}
              alt={file.name}
              className="mx-auto max-h-[280px] rounded-lg object-contain shadow-lg"
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              className="absolute right-1 top-1 h-7 w-7 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setFromFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <p className="mt-2 text-xs text-muted-foreground truncate">{file.name}</p>
          </div>
        ) : (
          <>
            <ImagePlus className="h-9 w-9 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFromFile(f);
          }}
        />
      </motion.div>
    </div>
  );
}
