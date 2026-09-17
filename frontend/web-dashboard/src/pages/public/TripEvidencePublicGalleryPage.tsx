import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, MapPin, Clock, CheckCircle2, ShieldCheck, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function TripEvidencePublicGalleryPage() {
  const [searchParams] = useSearchParams();
  const tripRef = searchParams.get('ref') || 'TRP-2026-8841';
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  // Mock demonstration data for public recipient
  const mockEvidence = [
    {
      id: '1',
      title: 'Pickup Arrival Geotag',
      location: 'RIYADH WAREHOUSE 01',
      time: '15:42 AST',
      category: 'Pickup Proof',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      lat: 24.7136,
      lng: 46.6753,
    },
    {
      id: '2',
      title: 'Cargo Loading Inspection',
      location: 'RIYADH WAREHOUSE 01',
      time: '15:45 AST',
      category: 'Cargo Proof',
      url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
      lat: 24.7138,
      lng: 46.6755,
    },
    {
      id: '3',
      title: 'Delivery Unloading POD',
      location: 'DAMMAM PORT TERMINAL',
      time: '19:10 AST',
      category: 'POD Document',
      url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
      lat: 26.4207,
      lng: 50.0888,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FA634E] flex items-center justify-center font-black text-white text-xs">
            M
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white">MERCON Evidence Gallery</h1>
            <p className="text-[10px] text-slate-400 font-mono">Trip #{tripRef}</p>
          </div>
        </div>

        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold gap-1 px-2.5 py-1">
          <ShieldCheck size={12} />
          <span>Verified POD</span>
        </Badge>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
        
        {/* Info Banner */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-white mb-0.5">Verified Geotagged Logistics Photo Evidence</h2>
            <p className="text-xs text-slate-400">Recorded live by driver & dispatched automatically via WhatsApp.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Camera size={14} className="text-[#FA634E]" />
            <span>{mockEvidence.length} Photos Recorded</span>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockEvidence.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setSelectedPhoto(idx)}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer group hover:border-[#FA634E] transition-all"
            >
              <div className="aspect-4/3 relative overflow-hidden bg-black">
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
                  {img.category}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <h3 className="font-bold text-xs text-white">{img.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">{img.location}</span>
                  <span className="font-mono text-[10px] text-amber-400">{img.time}</span>
                </div>
                <div className="pt-1 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  <span>GPS: {img.lat}, {img.lng}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-slate-500 text-xs border-t border-white/10">
        Powered by MERCON Logistics Platform • Secure Evidence Dispatch
      </footer>
    </div>
  );
}
