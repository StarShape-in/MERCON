import React, { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, MapPin, Clock,
  MessageCircle, Download, Share2, ZoomIn, Play,
  Video, AlertTriangle, FileText, CheckCircle2, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openPhotoEvidenceWhatsapp } from '@/utils/whatsappFormatter';
import { toast } from 'sonner';

export interface LightboxPhotoItem {
  id: string;
  url: string;
  title: string;
  time?: string;
  location?: string;
  status?: string;
  category?: string;
  isVideo?: boolean;
  isDelayEvidence?: boolean;
  geotag?: {
    latitude?: number;
    longitude?: number;
    address?: string | null;
    city?: string | null;
    timestamp?: string | null;
  };
  /**
   * Populated only for external-app screenshot documents (the driver's
   * "Analyse Screenshot" workflow) — what the AI actually extracted and
   * decided, so an operator can see *why* a screenshot is Verified/Rejected
   * instead of just the bare document status.
   */
  aiVerification?: {
    eventType?: string | null;
    confidence?: number | null;
    isWrongTrip?: boolean;
    validationReason?: string | null;
    /** The Document's actual status (Verified/PendingReview/Rejected) — distinct from `status` above, which this component uses for a generic "Received" badge, not the real review state. */
    docStatus?: string | null;
  };
}

interface EvidenceLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: LightboxPhotoItem[];
  initialIndex?: number;
  tripRef?: string;
  customerName?: string;
  customerPhone?: string;
}

export const EvidenceLightboxModal: React.FC<EvidenceLightboxModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  tripRef = 'TRIP',
  customerName,
  customerPhone,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];
  const hasMultiple = photos.length > 1;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleShareWhatsapp = () => {
    const geotagCoords = currentPhoto.geotag?.latitude && currentPhoto.geotag?.longitude
      ? `${currentPhoto.geotag.latitude}, ${currentPhoto.geotag.longitude}`
      : undefined;

    openPhotoEvidenceWhatsapp({
      tripRef,
      customerName,
      customerPhone,
      stopName: currentPhoto.location || 'Trip Stop',
      photoCount: photos.length,
      evidenceCategory: currentPhoto.title,
      uploadTime: currentPhoto.time,
      geotagCoords,
      publicGalleryUrl: `${window.location.origin}/trips/evidence-gallery?ref=${encodeURIComponent(tripRef)}`,
    });
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentPhoto.url;
    a.download = `evidence-${tripRef}-${currentIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading photo evidence...');
  };

  const lat = currentPhoto.geotag?.latitude;
  const lng = currentPhoto.geotag?.longitude;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200">
      
      {/* ── HEADER BAR ── */}
      <div className="h-14 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between text-white bg-black/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FA634E] text-white font-black text-xs flex items-center justify-center shadow-sm">
            {currentIndex + 1}/{photos.length}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white truncate">
                {currentPhoto.title}
              </h3>
              {currentPhoto.isDelayEvidence && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold">
                  Delay Evidence
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {tripRef} • {currentPhoto.location || 'Operational Location'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleShareWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8 px-3 rounded-lg shadow-sm border border-emerald-500/30 cursor-pointer"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">Send to WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-medium text-xs gap-1 h-8 px-2.5 rounded-lg cursor-pointer"
          >
            <Download size={14} />
          </Button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── AI VERIFICATION BANNER (external-app screenshots only) ── */}
      {currentPhoto.aiVerification && (
        <div
          className={`px-4 sm:px-6 py-2.5 border-b flex items-start gap-2.5 text-xs shrink-0 ${
            currentPhoto.aiVerification.isWrongTrip || currentPhoto.aiVerification.docStatus === 'Rejected'
              ? 'bg-rose-950/50 border-rose-500/30 text-rose-200'
              : currentPhoto.aiVerification.docStatus === 'PendingReview'
              ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {currentPhoto.aiVerification.isWrongTrip || currentPhoto.aiVerification.docStatus === 'Rejected' ? (
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-bold">
              {currentPhoto.aiVerification.isWrongTrip || currentPhoto.aiVerification.docStatus === 'Rejected'
                ? 'AI Verification Rejected'
                : currentPhoto.aiVerification.docStatus === 'PendingReview'
                ? 'AI Extracted — Awaiting Driver Confirmation'
                : 'AI Verified'}
            </span>
            {currentPhoto.aiVerification.eventType && (
              <span className="ml-2 opacity-90">
                Milestone: {currentPhoto.aiVerification.eventType.replace(/_/g, ' ')}
              </span>
            )}
            {typeof currentPhoto.aiVerification.confidence === 'number' && currentPhoto.aiVerification.confidence > 0 && (
              <span className="ml-2 opacity-90">
                • Confidence: {Math.round(currentPhoto.aiVerification.confidence * 100)}%
              </span>
            )}
            {currentPhoto.aiVerification.validationReason && (
              <div className="mt-0.5 opacity-90">{currentPhoto.aiVerification.validationReason}</div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
        
        {/* Previous Button */}
        {hasMultiple && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-[#FA634E] text-white flex items-center justify-center transition-colors border border-white/10 shadow-xl cursor-pointer"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Media Preview Container */}
        <div className="relative max-w-5xl max-h-full flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
          {currentPhoto.isVideo ? (
            <video
              src={currentPhoto.url}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-xl object-contain bg-black"
            />
          ) : (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.title}
              className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          )}
        </div>

        {/* Next Button */}
        {hasMultiple && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-[#FA634E] text-white flex items-center justify-center transition-colors border border-white/10 shadow-xl cursor-pointer"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* ── FOOTER METADATA PANEL ── */}
      <div className="px-6 py-3 border-t border-white/10 bg-black/60 text-white flex flex-wrap items-center justify-between gap-4 shrink-0">
        
        {/* Geotag & Time Info */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {currentPhoto.time && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock size={14} className="text-[#FA634E]" />
              <span>Timestamp: <strong className="text-white">{currentPhoto.time}</strong></span>
            </div>
          )}

          {currentPhoto.location && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin size={14} className="text-blue-400" />
              <span>Location: <strong className="text-white">{currentPhoto.location}</strong></span>
            </div>
          )}

          {lat && lng ? (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20"
            >
              <CheckCircle2 size={12} />
              <span>GPS: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
            </a>
          ) : (
            <span className="text-slate-400 text-[11px]">GPS Verified</span>
          )}
        </div>

        {/* Thumbnail Filmstrip Navigation */}
        {hasMultiple && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  idx === currentIndex
                    ? 'border-[#FA634E] scale-105 shadow-md'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                {p.isVideo ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white">
                    <Play size={12} className="fill-white" />
                  </div>
                ) : (
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
