import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, FileText, Download, ExternalLink } from 'lucide-react';
import { resolveFileUrl } from '@/lib/documents';
import { isImageFile, isPdfFile } from '@/components/ui/DocumentViewerModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DocumentFileItem {
  id?: string;
  file_url: string;
  mime_type?: string | null;
  label?: string | null;
}

interface DocumentCanvasViewerProps {
  files: DocumentFileItem[];
  title?: string;
  className?: string;
  canvasHeightClassName?: string;
  showActions?: boolean;
}

export default function DocumentCanvasViewer({
  files,
  title,
  className,
  canvasHeightClassName = 'h-[360px] md:h-[450px]',
  showActions = true,
}: DocumentCanvasViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const activeFile = files[activeIdx] || files[0];

  useEffect(() => {
    setActiveIdx(0);
    setZoomLevel(1);
    setRotation(0);
    setHasError(false);
  }, [files]);

  useEffect(() => {
    setHasError(false);
  }, [activeIdx, retryKey]);

  if (!activeFile || !activeFile.file_url) {
    return (
      <div className={cn('rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-8 text-slate-400 text-center', canvasHeightClassName, className)}>
        <div className="space-y-2">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400">No document file preview available</p>
        </div>
      </div>
    );
  }

  const resolvedUrl = resolveFileUrl(activeFile.file_url);
  const isImg = isImageFile(activeFile.file_url, activeFile.mime_type);
  const isPdf = isPdfFile(activeFile.file_url, activeFile.mime_type);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {/* File Attachment Selector Tabs */}
      {files.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {files.map((file, idx) => (
            <button
              key={file.id || idx}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                handleReset();
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
                activeIdx === idx
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{file.label || `Page / File ${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Canvas Area */}
      <div className={cn('relative rounded-2xl overflow-hidden bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 flex items-center justify-center group', canvasHeightClassName)}>
        
        {/* Canvas Toolbar Controls overlay */}
        {showActions && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              onClick={handleRotate}
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            {(zoomLevel !== 1 || rotation !== 0) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold text-brand hover:bg-brand/5 dark:hover:bg-brand/10 rounded-lg cursor-pointer transition-colors"
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              title="Open Raw File"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Render Image / PDF / Error */}
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center gap-3 text-slate-400 max-w-xs">
            <FileText className="w-10 h-10 text-slate-500" />
            <div>
              <p className="text-xs font-bold text-slate-300">File Preview Unavailable</p>
              <p className="text-[11px] text-slate-500 mt-1">Unable to load document directly in viewer.</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold border-slate-700 text-slate-300 cursor-pointer"
                onClick={() => setRetryKey((k) => k + 1)}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
              <a
                href={resolvedUrl}
                download
                className="h-7 px-3 rounded-lg bg-brand text-white text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-brand-hover"
              >
                <Download className="w-3 h-3" /> Download
              </a>
            </div>
          </div>
        ) : isImg ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
            <img
              key={`${resolvedUrl}-${retryKey}`}
              src={resolvedUrl}
              alt={title || 'Document Preview'}
              onError={() => setHasError(true)}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
              className="rounded-lg shadow-xl"
            />
          </div>
        ) : isPdf ? (
          <iframe
            key={`${resolvedUrl}-${retryKey}`}
            src={`${resolvedUrl}#toolbar=0`}
            title={title || 'PDF Preview'}
            onError={() => setHasError(true)}
            className="w-full h-full border-0 rounded-2xl"
          />
        ) : (
          <iframe
            key={`${resolvedUrl}-${retryKey}`}
            src={resolvedUrl}
            title={title || 'Document Preview'}
            onError={() => setHasError(true)}
            className="w-full h-full border-0 rounded-2xl"
          />
        )}
      </div>
    </div>
  );
}
